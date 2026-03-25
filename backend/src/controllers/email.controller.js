const { sendMail } = require('../services/email.service');
const pool = require('../config/db');
const { logActivity } = require('../services/activity.service');

const safeSend = async ({ userId, tenantId = null, to, subject, html, metadata = null }) => {
  try {
    const outcome = await sendMail({ to, subject, html });
    const status = outcome?.sent ? 'sent' : 'skipped';

    await pool.query(
      `INSERT INTO email_logs (user_id, tenant_id, recipient_email, subject, status, metadata)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId, tenantId, to, subject || null, status, metadata ? JSON.stringify(metadata) : null]
    );

    await logActivity({
      userId,
      tenantId,
      eventType: outcome?.sent ? 'email_sent' : 'email_skipped',
      title: outcome?.sent ? 'Email Sent' : 'Email Skipped',
      description: subject || 'Email notification',
      source: 'email',
      metadata: { to, status, ...(metadata || {}) },
    });

    if (outcome?.sent) return { success: true, message: 'Email sent' };
    return { success: false, message: `Email skipped (${outcome?.reason || 'unknown'})` };
  } catch (error) {
    console.error('[safeSend] error:', error.message);
    return { success: false, message: `Email failed: ${error.message}` };
  }
};

exports.sendRentReminder = async (req, res) => {
  const { email, name, amount, dueDate } = req.body;
  if (!email) return res.status(400).json({ message: 'email is required' });
  const payload = await safeSend({
    userId: req.user.id,
    tenantId: req.body.tenant_id || null,
    to: email,
    subject: 'Rent Reminder - RentFlow TZ',
    html: `<p>Hello ${name || 'Tenant'}, your rent of TZS ${Number(amount || 0).toLocaleString()} is due on ${dueDate || 'the due date'}.</p>`,
    metadata: { type: 'rent_reminder' },
  });
  res.json(payload);
};

exports.sendPaymentReceipt = async (req, res) => {
  const { email, name, amount, date, receiptId } = req.body;
  if (!email) return res.status(400).json({ message: 'email is required' });
  const payload = await safeSend({
    userId: req.user.id,
    tenantId: req.body.tenant_id || null,
    to: email,
    subject: 'Payment Receipt - RentFlow TZ',
    html: `<p>Hello ${name || 'Tenant'}, payment received: TZS ${Number(amount || 0).toLocaleString()} on ${date || ''}. Receipt: ${receiptId || '-'}.</p>`,
    metadata: { type: 'payment_receipt', receiptId: receiptId || null },
  });
  res.json(payload);
};

exports.sendLeaseExpiration = async (req, res) => {
  const { email, name, propertyName, expirationDate } = req.body;
  if (!email) return res.status(400).json({ message: 'email is required' });
  const payload = await safeSend({
    userId: req.user.id,
    tenantId: req.body.tenant_id || null,
    to: email,
    subject: 'Lease Expiration Notice',
    html: `<p>Hello ${name || 'Tenant'}, your lease for ${propertyName || 'the property'} expires on ${expirationDate || 'soon'}.</p>`,
    metadata: { type: 'lease_expiration' },
  });
  res.json(payload);
};

exports.sendMaintenanceNotification = async (req, res) => {
  const { email, name, propertyName, description } = req.body;
  if (!email) return res.status(400).json({ message: 'email is required' });
  const payload = await safeSend({
    userId: req.user.id,
    tenantId: req.body.tenant_id || null,
    to: email,
    subject: 'Maintenance Notification',
    html: `<p>Hello ${name || 'User'}, maintenance alert for ${propertyName || 'property'}: ${description || ''}</p>`,
    metadata: { type: 'maintenance_notification' },
  });
  res.json(payload);
};

exports.sendInvoice = async (req, res) => {
  const { email, name, amount, description } = req.body;
  if (!email) return res.status(400).json({ message: 'email is required' });
  const payload = await safeSend({
    userId: req.user.id,
    tenantId: req.body.tenant_id || null,
    to: email,
    subject: 'Invoice - RentFlow TZ',
    html: `<p>Hello ${name || 'Customer'}, invoice amount: TZS ${Number(amount || 0).toLocaleString()} (${description || ''}).</p>`,
    metadata: { type: 'invoice' },
  });
  res.json(payload);
};

exports.sendBulk = async (req, res) => {
  const { recipients = [], subject, message } = req.body;
  for (const recipient of recipients) {
    if (recipient) {
      await safeSend({
        userId: req.user.id,
        to: recipient,
        subject: subject || 'RentFlow TZ',
        html: `<p>${message || ''}</p>`,
        metadata: { type: 'bulk_email' },
      });
    }
  }
  res.json({ message: 'Bulk email processed', total: recipients.length });
};

exports.sendWelcome = async (req, res) => {
  const { email, name, propertyName } = req.body;
  if (!email) return res.status(400).json({ message: 'email is required' });
  const payload = await safeSend({
    userId: req.user.id,
    tenantId: req.body.tenant_id || null,
    to: email,
    subject: `Welcome${propertyName ? ` to ${propertyName}` : ''} - RentFlow TZ`,
    html: `<p>Hello ${name || 'Tenant'}, welcome${propertyName ? ` to ${propertyName}` : ''}! We are happy to have you.</p>`,
    metadata: { type: 'welcome' },
  });
  res.json(payload);
};

exports.scheduleEmail = async (req, res) => {
  const { email, subject, message } = req.body;
  if (!email) return res.status(400).json({ message: 'email is required' });
  await safeSend({
    userId: req.user.id,
    to: email,
    subject: subject || 'RentFlow TZ',
    html: `<p>${message || ''}</p>`,
    metadata: { type: 'scheduled_email' },
  });
  res.json({ message: 'Scheduled email accepted (sent immediately in current implementation)' });
};
