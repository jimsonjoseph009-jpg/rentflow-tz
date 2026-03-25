const nodemailer = require('nodemailer');

let transporter;

const assertConfigured = () => {
  const missing = [];
  if (!process.env.SMTP_HOST) missing.push('SMTP_HOST');
  if (!process.env.SMTP_USER) missing.push('SMTP_USER');
  if (!process.env.SMTP_PASSWORD) missing.push('SMTP_PASSWORD');
  if (missing.length) {
    throw new Error(`SMTP not configured. Missing: ${missing.join(', ')}.`);
  }
};

const getTransporter = () => {
  if (transporter) return transporter;

  assertConfigured();
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  return transporter;
};

const sendMail = async ({ to, subject, html }) => {
  if (!to) return { sent: false, skipped: true, reason: 'missing_to' };
  if (process.env.DISABLE_EMAIL === 'true') return { sent: false, skipped: true, reason: 'disabled' };

  const client = getTransporter();

  await client.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });

  return { sent: true };
};

module.exports = {
  sendMail,
};
