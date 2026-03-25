const pool = require('../config/db');
const { sendSms } = require('./smsGateway.service');
const { logActivity } = require('./activity.service');

const SMS_COST = Number(process.env.SMS_COST_TZS || 50);
const SMS_MAX_RETRIES = Number(process.env.SMS_MAX_RETRIES || 3);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendWithRetry = async ({ phone, message }) => {
  let lastError;
  for (let attempt = 1; attempt <= SMS_MAX_RETRIES; attempt += 1) {
    try {
      const result = await sendSms({ phone, message });
      return { ...result, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt < SMS_MAX_RETRIES) await delay(250 * attempt);
    }
  }
  throw lastError;
};

const sendAndBillSms = async ({ userId, phone, message, smsType = 'other', tenantId = null }) => {
  const providerResult = await sendWithRetry({ phone, message });

  const smsLog = await pool.query(
    `INSERT INTO sms_logs (user_id, tenant_id, recipient_phone, message, sms_type, provider_message_id, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [userId, tenantId, phone, message, smsType, providerResult.provider_message_id, providerResult.status]
  );

  const period = new Date().toISOString().slice(0, 7);
  const usageRes = await pool.query(
    `INSERT INTO sms_usage (user_id, period_month, sms_count, total_cost, updated_at)
     VALUES ($1,$2,1,$3,NOW())
     ON CONFLICT (user_id, period_month)
     DO UPDATE SET sms_count=sms_usage.sms_count + 1, total_cost=sms_usage.total_cost + EXCLUDED.total_cost, updated_at=NOW()
     RETURNING *`,
    [userId, period, SMS_COST]
  );

  await pool.query(
    `INSERT INTO sms_billing (user_id, sms_usage_id, amount, status, payment_method)
     VALUES ($1,$2,$3,'pending','wallet')`,
    [userId, usageRes.rows[0].id, SMS_COST]
  );

  await logActivity({
    userId,
    tenantId,
    eventType: 'sms_sent',
    title: 'SMS Sent',
    description: `SMS sent to ${phone}`,
    source: 'sms',
    metadata: { sms_type: smsType, cost: SMS_COST },
  });

  return { sms: smsLog.rows[0], sms_cost: SMS_COST, attempts: providerResult.attempts };
};

module.exports = {
  sendAndBillSms,
};
