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

export const sendOtpEmail = async ({ to, code }) => {
  const mailer = getTransporter();

  if (!mailer) {
    console.log(`OTP for ${to}: ${code}`);
    return;
  }

  await mailer.sendMail({
    from: env.smtp.from,
    to,
    subject: 'Your Rivvo verification code',
    text: `Your verification code is ${code}. It expires in ${env.otpExpiresMinutes} minutes.`
  });
};
