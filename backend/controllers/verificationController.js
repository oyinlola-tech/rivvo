import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import pool from '../config/db.js';
import env from '../config/env.js';
import { sendError } from '../utils/validation.js';

const getActivePricing = async () => {
  const [rows] = await pool.execute(
    `SELECT amount, currency, active
     FROM verification_settings
     ORDER BY updated_at DESC
     LIMIT 1`
  );
  if (!rows.length) return null;
  return rows[0];
};

const getUser = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT id, email, name, phone, username, is_verified_badge, verified_badge_expires_at, created_at
     FROM users
     WHERE id = :id
     LIMIT 1`,
    { id: userId }
  );
  return rows[0] || null;
};

const isBadgeActive = (user) => {
  if (!user?.is_verified_badge) return false;
  if (!user.verified_badge_expires_at) return false;
  return new Date(user.verified_badge_expires_at) > new Date();
};

const isWithinRenewalWindow = (user) => {
  if (!user?.verified_badge_expires_at) return false;
  const expiresAt = new Date(user.verified_badge_expires_at);
  const windowStart = new Date(expiresAt);
  windowStart.setDate(windowStart.getDate() - 7);
  const now = new Date();
  return now >= windowStart && now <= expiresAt;
};

const getEligibility = (user) => {
  if (!user?.created_at) {
    return { eligible: false, eligibleAt: null };
  }
  const createdAt = new Date(user.created_at);
  const eligibleAt = new Date(createdAt);
  eligibleAt.setMonth(eligibleAt.getMonth() + 3);
  return {
    eligible: eligibleAt <= new Date(),
    eligibleAt
  };
};

const hasPendingPayment = async (userId) => {
  const [lockRows] = await pool.execute(
    `SELECT user_id
     FROM verification_payment_locks
     WHERE user_id = :user_id
     LIMIT 1`,
    { user_id: userId }
  );
  let hasLock = lockRows.length > 0;
  const [rows] = await pool.execute(
    `SELECT id
     FROM verification_payments
     WHERE user_id = :user_id
       AND (
         status = 'pending'
         OR (status = 'successful' AND review_status = 'pending')
       )
     LIMIT 1`,
    { user_id: userId }
  );
  if (hasLock && rows.length === 0) {
    await releasePaymentLock(userId);
    hasLock = false;
  }
  return rows.length > 0 || hasLock;
};

const acquirePaymentLock = async (userId) => {
  try {
    await pool.execute(
      `INSERT INTO verification_payment_locks (user_id)
       VALUES (:user_id)`,
      { user_id: userId }
    );
    return true;
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return false;
    }
    throw error;
  }
};

const releasePaymentLock = async (userId) => {
  await pool.execute(`DELETE FROM verification_payment_locks WHERE user_id = :user_id`, {
    user_id: userId
  });
};

const sanitizeVerificationResponse = (payload) => {
  const data = payload?.data || {};
  return {
    status: payload?.status || null,
    message: payload?.message || null,
    data: {
      id: data.id || null,
      tx_ref: data.tx_ref || null,
      status: data.status || null,
      amount: data.amount || null,
      currency: data.currency || null,
      charged_amount: data.charged_amount || null,
      app_fee: data.app_fee || null,
      merchant_fee: data.merchant_fee || null,
      processor_response: data.processor_response || null
    }
  };
};

const flutterwaveRequest = async (path, options = {}) => {
  const baseUrl = env.flutterwave.baseUrl || 'https://api.flutterwave.com';
  const url = `${baseUrl}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.flutterwave.secretKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.message || 'Flutterwave request failed';
    const error = new Error(message);
    error.status = 502;
    throw error;
  }

  return data;
};

const verifyFlutterwaveTransaction = async (transactionId) => {
  if (!transactionId) {
    const error = new Error('transactionId is required');
    error.status = 400;
    throw error;
  }
  return flutterwaveRequest(`/v3/transactions/${transactionId}/verify`, {
    method: 'GET'
  });
};

const isValidWebhookSignature = (req) => {
  const signature = req.get('flutterwave-signature');
  const secret = env.flutterwave.webhookSecret;
  if (!signature || !secret || !req.rawBody) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(req.rawBody)
    .digest('base64');
  return signature === expected;
};

export const getVerificationPricing = async (req, res) => {
  const pricing = await getActivePricing();
  if (!pricing) {
    return res.json({ amount: null, currency: null, active: false });
  }
  return res.json({
    amount: Number(pricing.amount),
    currency: pricing.currency,
    active: Boolean(pricing.active)
  });
};

export const getVerificationEligibility = async (req, res) => {
  const userId = req.user?.id;
  const user = await getUser(userId);
  if (!user) {
    return sendError(res, 404, 'User not found');
  }

  const { eligible, eligibleAt } = getEligibility(user);
  return res.json({
    eligible,
    eligibleAt: eligibleAt ? eligibleAt.toISOString() : null
  });
};

export const getVerificationStatus = async (req, res) => {
  const userId = req.user?.id;
  const [pendingRows] = await pool.execute(
    `SELECT status, review_status, rejection_reason, created_at
     FROM verification_payments
     WHERE user_id = :user_id AND review_status = 'pending'
     ORDER BY created_at DESC
     LIMIT 1`,
    { user_id: userId }
  );
  const [decisionRows] = await pool.execute(
    `SELECT status, review_status, rejection_reason, created_at
     FROM verification_payments
     WHERE user_id = :user_id AND review_status IN ('approved', 'rejected')
     ORDER BY created_at DESC
     LIMIT 1`,
    { user_id: userId }
  );

  const pending = pendingRows[0] || null;
  const decision = decisionRows[0] || null;
  const currentStatus = pending ? 'pending' : decision?.review_status || 'none';

  return res.json({
    latestPending: pending
      ? {
          status: pending.status,
          reviewStatus: pending.review_status,
          rejectionReason: pending.rejection_reason || null,
          createdAt: pending.created_at ? new Date(pending.created_at).toISOString() : null
        }
      : null,
    latestDecision: decision
      ? {
          status: decision.status,
          reviewStatus: decision.review_status,
          rejectionReason: decision.rejection_reason || null,
          createdAt: decision.created_at ? new Date(decision.created_at).toISOString() : null
        }
      : null,
    currentStatus
  });
};

export const createVerificationCheckout = async (req, res) => {
  const userId = req.user?.id;
  const user = await getUser(userId);
  if (!user) {
    return sendError(res, 404, 'User not found');
  }
  if (isBadgeActive(user) && !isWithinRenewalWindow(user)) {
    return sendError(res, 409, 'Verification badge is active. Renew within 7 days of expiry.');
  }

  const { eligible, eligibleAt } = getEligibility(user);
  if (!eligible) {
    return sendError(
      res,
      403,
      `Verification is available after 3 months on the platform${eligibleAt ? ` (eligible on ${eligibleAt.toISOString()})` : ''}`
    );
  }

  if (!user.phone || !user.username) {
    return sendError(res, 400, 'Add both phone number and username to buy verification');
  }

  if (await hasPendingPayment(userId)) {
    return sendError(res, 409, 'You already have a payment pending review');
  }

  const lockAcquired = await acquirePaymentLock(userId);
  if (!lockAcquired) {
    return sendError(res, 409, 'You already have a payment pending review');
  }

  const pricing = await getActivePricing();
  if (!pricing || !pricing.active) {
    return sendError(res, 400, 'Verification pricing is not available');
  }

  if (!env.flutterwave.secretKey) {
    return sendError(res, 500, 'Payment provider is not configured');
  }

  const txRef = `verify_${uuid()}`;
  const redirectUrl = env.flutterwave.redirectUrl || env.clientUrl;

  const payload = {
    tx_ref: txRef,
    amount: Number(pricing.amount),
    currency: pricing.currency,
    redirect_url: redirectUrl,
    customer: {
      email: user.email,
      name: user.name,
      ...(user.phone ? { phonenumber: user.phone } : {})
    },
    customizations: {
      title: 'Rivvo Verification Badge',
      description: 'Checkmark verification payment'
    },
    meta: {
      user_id: user.id
    }
  };

  let response;
  try {
    response = await flutterwaveRequest('/v3/payments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch (error) {
    await releasePaymentLock(userId);
    throw error;
  }

  const link = response?.data?.link;
  if (!link) {
    return sendError(res, 502, 'Failed to create payment link');
  }

  try {
    await pool.execute(
      `INSERT INTO verification_payments
        (id, user_id, amount, currency, status, tx_ref, payment_link)
       VALUES (:id, :user_id, :amount, :currency, 'pending', :tx_ref, :payment_link)`,
      {
        id: uuid(),
        user_id: userId,
        amount: Number(pricing.amount),
        currency: pricing.currency,
        tx_ref: txRef,
        payment_link: link
      }
    );
  } catch (error) {
    await releasePaymentLock(userId);
    throw error;
  }

  return res.json({
    txRef,
    link,
    amount: Number(pricing.amount),
    currency: pricing.currency
  });
};

export const confirmVerificationPayment = async (req, res) => {
  const { transactionId, txRef } = req.body || {};
  if (!transactionId) {
    return sendError(res, 400, 'transactionId is required');
  }

  if (!env.flutterwave.secretKey) {
    return sendError(res, 500, 'Payment provider is not configured');
  }

  let paymentRow = null;
  if (txRef) {
    const [rows] = await pool.execute(
      `SELECT * FROM verification_payments WHERE tx_ref = :tx_ref LIMIT 1`,
      { tx_ref: txRef }
    );
    paymentRow = rows[0] || null;
  }

  const verified = await verifyFlutterwaveTransaction(transactionId);
  const data = verified?.data;
  if (!data) {
    return sendError(res, 502, 'Payment verification failed');
  }

  const resolvedTxRef = data.tx_ref || txRef;
  if (!paymentRow && resolvedTxRef) {
    const [rows] = await pool.execute(
      `SELECT * FROM verification_payments WHERE tx_ref = :tx_ref LIMIT 1`,
      { tx_ref: resolvedTxRef }
    );
    paymentRow = rows[0] || null;
  }

  if (!paymentRow) {
    return sendError(res, 404, 'Payment record not found');
  }

  if (paymentRow.user_id !== req.user?.id) {
    return sendError(res, 403, 'Payment does not belong to this user');
  }

  const amountMatches = Number(data.amount) >= Number(paymentRow.amount);
  const currencyMatches =
    typeof data.currency === 'string' &&
    data.currency.toUpperCase() === String(paymentRow.currency).toUpperCase();
  const status = data.status;

  let nextStatus = 'failed';
  if (status === 'successful' && amountMatches && currencyMatches) {
    nextStatus = 'successful';
  } else if (status === 'cancelled') {
    nextStatus = 'cancelled';
  }

  await pool.execute(
    `UPDATE verification_payments
     SET status = :status,
         review_status = CASE
           WHEN review_status IS NULL OR review_status = 'pending'
             THEN CASE WHEN :status = 'successful' THEN 'pending' ELSE review_status END
           ELSE review_status
         END,
         flw_transaction_id = :flw_transaction_id,
         flw_status = :flw_status,
         raw_response = :raw_response
     WHERE id = :id`,
    {
      id: paymentRow.id,
      status: nextStatus,
      flw_transaction_id: data.id ? String(data.id) : null,
      flw_status: status || null,
      raw_response: JSON.stringify(sanitizeVerificationResponse(verified))
    }
  );

  if (nextStatus !== 'successful') {
    await releasePaymentLock(paymentRow.user_id);
  }

  return res.json({
    status: nextStatus,
    amount: Number(paymentRow.amount),
    currency: paymentRow.currency
  });
};

export const handleVerificationWebhook = async (req, res) => {
  if (!isValidWebhookSignature(req)) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid signature' });
  }

  const data = req.body?.data;
  const transactionId = data?.id;
  if (!transactionId) {
    return res.status(200).json({ received: true });
  }

  if (!env.flutterwave.secretKey) {
    return res.status(500).json({ error: 'Server Error', message: 'Payment provider is not configured' });
  }

  const verified = await verifyFlutterwaveTransaction(transactionId);
  const verifiedData = verified?.data;
  if (!verifiedData?.tx_ref) {
    return res.status(200).json({ received: true });
  }

  const [rows] = await pool.execute(
    `SELECT * FROM verification_payments WHERE tx_ref = :tx_ref LIMIT 1`,
    { tx_ref: verifiedData.tx_ref }
  );
  const paymentRow = rows[0];
  if (!paymentRow) {
    return res.status(200).json({ received: true });
  }

  const amountMatches = Number(verifiedData.amount) >= Number(paymentRow.amount);
  const currencyMatches =
    typeof verifiedData.currency === 'string' &&
    verifiedData.currency.toUpperCase() === String(paymentRow.currency).toUpperCase();
  const status = verifiedData.status;

  let nextStatus = 'failed';
  if (status === 'successful' && amountMatches && currencyMatches) {
    nextStatus = 'successful';
  } else if (status === 'cancelled') {
    nextStatus = 'cancelled';
  }

  await pool.execute(
    `UPDATE verification_payments
     SET status = :status,
         review_status = CASE
           WHEN review_status IS NULL OR review_status = 'pending'
             THEN CASE WHEN :status = 'successful' THEN 'pending' ELSE review_status END
           ELSE review_status
         END,
         flw_transaction_id = :flw_transaction_id,
         flw_status = :flw_status,
         raw_response = :raw_response
     WHERE id = :id`,
    {
      id: paymentRow.id,
      status: nextStatus,
      flw_transaction_id: verifiedData.id ? String(verifiedData.id) : null,
      flw_status: status || null,
      raw_response: JSON.stringify(sanitizeVerificationResponse(verified))
    }
  );

  if (nextStatus !== 'successful') {
    await releasePaymentLock(paymentRow.user_id);
  }

  return res.status(200).json({ received: true });
};
