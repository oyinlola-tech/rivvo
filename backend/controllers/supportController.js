import env from '../config/env.js';
import { sendError, requireFields, isNonEmptyString, isEmail } from '../utils/validation.js';
import { sendSupportEmail } from '../services/emailService.js';

export const sendSupportRequest = async (req, res) => {
  const { subject, message } = req.body || {};
  const missing = requireFields(req.body, ['subject', 'message']);
  if (missing.length) {
    return sendError(res, 400, 'Subject and message are required');
  }
  if (!isNonEmptyString(subject) || !isNonEmptyString(message)) {
    return sendError(res, 400, 'Subject and message are required');
  }

  const userEmail = req.user?.email || '';
  const userName = req.user?.name || 'User';
  const to = env.admin?.email || env.smtp.from;
  if (!to) {
    return sendError(res, 500, 'Support email is not configured');
  }

  await sendSupportEmail({
    to,
    fromEmail: isEmail(userEmail) ? userEmail : '',
    fromName: userName,
    subject,
    message
  });

  return res.json({ message: 'Support request sent' });
};
