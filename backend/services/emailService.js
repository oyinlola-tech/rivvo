import nodemailer from 'nodemailer';
import env from '../config/env.js';

let transporter = null;

const logoUrl = () => `${env.clientUrl.replace(/\/$/, '')}/rivvo.png`;

const getTransporter = () => {
  if (!env.smtp.host) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user
        ? {
            user: env.smtp.user,
            pass: env.smtp.pass
          }
        : undefined
    });
  }

  return transporter;
};

const buildOtpEmail = ({ code, expiresMinutes }) => {
  const subject = 'Your Rivvo verification code';
  const text = `Your Rivvo verification code is ${code}. It expires in ${expiresMinutes} minutes.`;
  const html = `
    <div style="margin:0;padding:0;background:#000e08;color:#20A090;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#000e08;color:#20A090;">
        <tr>
          <td align="center" style="padding:32px 16px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;border:1px solid #20A090;border-radius:12px;">
              <tr>
                <td style="padding:24px 24px 8px 24px;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <img src="${logoUrl()}" alt="Rivvo" width="36" height="36" style="border-radius:8px;display:block;" />
                  <div style="font-size:22px;font-weight:700;letter-spacing:0.3px;">Rivvo</div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 16px 24px;">
                  <div style="font-size:18px;font-weight:700;">Verify your email</div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 20px 24px;font-size:14px;line-height:20px;">
                  Use the verification code below to complete your signup. This code expires in ${expiresMinutes} minutes.
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:8px 24px 24px 24px;">
                  <div style="display:inline-block;border:1px solid #20A090;border-radius:10px;padding:14px 22px;font-size:28px;font-weight:700;letter-spacing:6px;">
                    ${code}
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 24px 24px;font-size:12px;line-height:18px;">
                  If you did not request this code, you can safely ignore this email.
                </td>
              </tr>
              <tr>
                <td style="padding:16px 24px 24px 24px;border-top:1px solid #20A090;font-size:11px;line-height:16px;">
                  Need help? Reply to this email or visit rivvo.telente.site
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  return { subject, text, html };
};

const buildPasswordResetOtpEmail = ({ code, expiresMinutes }) => {
  const subject = 'Reset your Rivvo password';
  const text = `Your Rivvo password reset code is ${code}. It expires in ${expiresMinutes} minutes.`;
  const html = `
    <div style="margin:0;padding:0;background:#000e08;color:#20A090;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#000e08;color:#20A090;">
        <tr>
          <td align="center" style="padding:32px 16px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;border:1px solid #20A090;border-radius:12px;">
              <tr>
                <td style="padding:24px 24px 8px 24px;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <img src="${logoUrl()}" alt="Rivvo" width="36" height="36" style="border-radius:8px;display:block;" />
                  <div style="font-size:22px;font-weight:700;letter-spacing:0.3px;">Rivvo</div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 16px 24px;">
                  <div style="font-size:18px;font-weight:700;">Reset your password</div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 20px 24px;font-size:14px;line-height:20px;">
                  Use the code below to confirm your password reset. This code expires in ${expiresMinutes} minutes.
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:8px 24px 24px 24px;">
                  <div style="display:inline-block;border:1px solid #20A090;border-radius:10px;padding:14px 22px;font-size:28px;font-weight:700;letter-spacing:6px;">
                    ${code}
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 24px 24px;font-size:12px;line-height:18px;">
                  If you did not request this, you can ignore this email or reset your password immediately.
                </td>
              </tr>
              <tr>
                <td style="padding:16px 24px 24px 24px;border-top:1px solid #20A090;font-size:11px;line-height:16px;">
                  Need help? Reply to this email or visit rivvo.telente.site
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  return { subject, text, html };
};

const buildPasswordChangedEmail = () => {
  const subject = 'Your Rivvo password was changed';
  const text = 'Your Rivvo password was changed. If this was not you, reset your password immediately.';
  const html = `
    <div style="margin:0;padding:0;background:#000e08;color:#20A090;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#000e08;color:#20A090;">
        <tr>
          <td align="center" style="padding:32px 16px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;border:1px solid #20A090;border-radius:12px;">
              <tr>
                <td style="padding:24px 24px 8px 24px;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <img src="${logoUrl()}" alt="Rivvo" width="36" height="36" style="border-radius:8px;display:block;" />
                  <div style="font-size:22px;font-weight:700;letter-spacing:0.3px;">Rivvo</div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 16px 24px;">
                  <div style="font-size:18px;font-weight:700;">Password changed</div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 20px 24px;font-size:14px;line-height:20px;">
                  This is a security notice that your Rivvo password was just changed.
                  If this wasn’t you, reset your password immediately and contact support.
                </td>
              </tr>
              <tr>
                <td style="padding:16px 24px 24px 24px;border-top:1px solid #20A090;font-size:11px;line-height:16px;">
                  Secure tip: Use a unique, strong password and keep your device locked.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  return { subject, text, html };
};

const buildEmailChangedEmail = ({ oldEmail, newEmail }) => {
  const subject = 'Your Rivvo email was changed';
  const text =
    `Your Rivvo account email was changed from ${oldEmail} to ${newEmail}. ` +
    'If this was not you, reset your password immediately and contact support.';
  const html = `
    <div style="margin:0;padding:0;background:#000e08;color:#20A090;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#000e08;color:#20A090;">
        <tr>
          <td align="center" style="padding:32px 16px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;border:1px solid #20A090;border-radius:12px;">
              <tr>
                <td style="padding:24px 24px 8px 24px;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <img src="${logoUrl()}" alt="Rivvo" width="36" height="36" style="border-radius:8px;display:block;" />
                  <div style="font-size:22px;font-weight:700;letter-spacing:0.3px;">Rivvo</div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 16px 24px;">
                  <div style="font-size:18px;font-weight:700;">Email changed</div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 20px 24px;font-size:14px;line-height:20px;">
                  Your Rivvo account email was updated.
                  <br />
                  <strong>Old email:</strong> ${oldEmail}
                  <br />
                  <strong>New email:</strong> ${newEmail}
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 20px 24px;font-size:13px;line-height:18px;">
                  If you did not make this change, reset your password immediately and contact support.
                </td>
              </tr>
              <tr>
                <td style="padding:16px 24px 24px 24px;border-top:1px solid #20A090;font-size:11px;line-height:16px;">
                  Security tip: Keep your recovery email secure and enable multi-factor authentication when available.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  return { subject, text, html };
};

const buildWelcomeEmail = ({ name }) => {
  const subject = 'Welcome to Rivvo';
  const text =
    `Hi ${name},\n\n` +
    'Welcome to Rivvo. I’m OLUWAEMI OYINLOLA MICHAEL, CEO of Rivvo, and I’m glad you joined us.\n\n' +
    'Rivvo is built for secure, fast messaging. If you ever have questions or concerns, reply to this email.\n\n' +
    'Security tips:\n' +
    '- Never share your OTP or password.\n' +
    '- Use a unique, strong password.\n' +
    '- If something feels off, reset your password immediately.\n\n' +
    'Welcome aboard,\nOLUWAEMI OYINLOLA MICHAEL';
  const html = `
    <div style="margin:0;padding:0;background:#000e08;color:#20A090;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#000e08;color:#20A090;">
        <tr>
          <td align="center" style="padding:32px 16px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;border:1px solid #20A090;border-radius:12px;">
              <tr>
                <td style="padding:24px 24px 8px 24px;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <img src="${logoUrl()}" alt="Rivvo" width="36" height="36" style="border-radius:8px;display:block;" />
                    <div style="font-size:22px;font-weight:700;letter-spacing:0.3px;">Rivvo</div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 16px 24px;">
                  <div style="font-size:18px;font-weight:700;">Welcome to Rivvo</div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 20px 24px;font-size:14px;line-height:20px;">
                  Hi ${name || 'there'},<br /><br />
                  Welcome to Rivvo. I’m <strong>OLUWAEMI OYINLOLA MICHAEL</strong>, CEO of Rivvo, and I’m glad you joined us.
                  We’re building a secure, fast messaging experience for people who move with purpose.
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 20px 24px;font-size:14px;line-height:20px;">
                  <strong>Security tips:</strong>
                  <ul style="margin:8px 0 0 18px;padding:0;color:#20A090;">
                    <li>Never share your OTP or password.</li>
                    <li>Use a unique, strong password.</li>
                    <li>If something feels off, reset your password immediately.</li>
                  </ul>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 24px 24px;font-size:13px;line-height:18px;">
                  If you ever need help, just reply to this email.
                  <br /><br />
                  Welcome aboard,<br />
                  OLUWAEMI OYINLOLA MICHAEL
                </td>
              </tr>
              <tr>
                <td style="padding:16px 24px 24px 24px;border-top:1px solid #20A090;font-size:11px;line-height:16px;">
                  Rivvo security team
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  return { subject, text, html };
};

const buildSupportEmail = ({ fromName, fromEmail, subject, message }) => {
  const safeName = fromName || 'User';
  const safeEmail = fromEmail || 'unknown';
  const mailSubject = `Support request: ${subject}`;
  const text =
    `Support request from ${safeName} <${safeEmail}>\n\n` +
    `Subject: ${subject}\n\n` +
    `${message}`;
  const html = `
    <div style="margin:0;padding:0;background:#000e08;color:#20A090;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#000e08;color:#20A090;">
        <tr>
          <td align="center" style="padding:32px 16px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;border:1px solid #20A090;border-radius:12px;">
              <tr>
                <td style="padding:24px 24px 8px 24px;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <img src="${logoUrl()}" alt="Rivvo" width="36" height="36" style="border-radius:8px;display:block;" />
                    <div style="font-size:22px;font-weight:700;letter-spacing:0.3px;">Rivvo</div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 16px 24px;">
                  <div style="font-size:18px;font-weight:700;">Support request</div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 8px 24px;font-size:13px;line-height:18px;">
                  <strong>From:</strong> ${safeName} (${safeEmail})
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 8px 24px;font-size:13px;line-height:18px;">
                  <strong>Subject:</strong> ${subject}
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 24px 24px;font-size:14px;line-height:20px;">
                  ${String(message || '').replace(/\n/g, '<br />')}
                </td>
              </tr>
              <tr>
                <td style="padding:16px 24px 24px 24px;border-top:1px solid #20A090;font-size:11px;line-height:16px;">
                  This message was sent from the Rivvo app.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  return { subject: mailSubject, text, html };
};

export const sendOtpEmail = async ({ to, code }) => {
  const mailer = getTransporter();

  if (!mailer) {
    console.log(`OTP for ${to}: ${code}`);
    return;
  }

  const { subject, text, html } = buildOtpEmail({
    code,
    expiresMinutes: env.otpExpiresMinutes
  });

  await mailer.sendMail({
    from: env.smtp.from,
    to,
    subject,
    text,
    html
  });
};

export const sendPasswordResetOtpEmail = async ({ to, code }) => {
  const mailer = getTransporter();

  if (!mailer) {
    if (env.nodeEnv !== 'production') {
      console.log(`Password reset OTP for ${to}: ${code}`);
    }
    return;
  }

  const { subject, text, html } = buildPasswordResetOtpEmail({
    code,
    expiresMinutes: env.otpExpiresMinutes
  });

  await mailer.sendMail({
    from: env.smtp.from,
    to,
    subject,
    text,
    html
  });
};

export const sendPasswordChangedEmail = async ({ to }) => {
  const mailer = getTransporter();

  if (!mailer) {
    console.log(`Password change notice sent to ${to}`);
    return;
  }

  const { subject, text, html } = buildPasswordChangedEmail();

  await mailer.sendMail({
    from: env.smtp.from,
    to,
    subject,
    text,
    html
  });
};

export const sendEmailChangedEmail = async ({ to, oldEmail, newEmail }) => {
  const mailer = getTransporter();

  if (!mailer) {
    console.log(`Email change notice sent to ${to}: ${oldEmail} -> ${newEmail}`);
    return;
  }

  const { subject, text, html } = buildEmailChangedEmail({ oldEmail, newEmail });

  await mailer.sendMail({
    from: env.smtp.from,
    to,
    subject,
    text,
    html
  });
};

export const sendWelcomeEmail = async ({ to, name }) => {
  const mailer = getTransporter();

  if (!mailer) {
    console.log(`Welcome email sent to ${to}`);
    return;
  }

  const { subject, text, html } = buildWelcomeEmail({ name });

  await mailer.sendMail({
    from: env.smtp.from,
    to,
    subject,
    text,
    html
  });
};

export const sendSupportEmail = async ({ to, fromName, fromEmail, subject, message }) => {
  const mailer = getTransporter();

  if (!mailer) {
    console.log(`Support email: ${subject} (${fromEmail})`);
    return;
  }

  const { subject: mailSubject, text, html } = buildSupportEmail({
    fromName,
    fromEmail,
    subject,
    message
  });

  await mailer.sendMail({
    from: env.smtp.from,
    to,
    subject: mailSubject,
    text,
    html,
    replyTo: fromEmail || undefined
  });
};
