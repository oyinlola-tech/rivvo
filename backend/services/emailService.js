import nodemailer from 'nodemailer';
import env from '../config/env.js';

let transporter = null;

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
                  <div style="font-size:22px;font-weight:700;letter-spacing:0.3px;">Rivvo</div>
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
