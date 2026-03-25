const pool = require('../config/db');
const { sendMail } = require('./email.service');
const { sendAndBillSms } = require('./smsBilling.service');
const { createNotification } = require('./notification.service');

const REMINDER_DAYS_BEFORE_DUE = Number(process.env.RENT_REMINDER_DAYS_BEFORE || 3);
const OVERDUE_REMINDER_DAYS = String(process.env.COLLECTIONS_OVERDUE_DAYS || '1,3,7,14')
  .split(',')
  .map((v) => Number(v.trim()))
  .filter((v) => Number.isFinite(v) && v > 0);
const RETRY_DAYS = String(process.env.COLLECTIONS_RETRY_DAYS || '1,3,7')
  .split(',')
  .map((v) => Number(v.trim()))
  .filter((v) => Number.isFinite(v) && v > 0);

const msPerDay = 1000 * 60 * 60 * 24;
const dateOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const computeMonthDueDate = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
};

const dayDiff = (target, base = new Date()) => {
  const diff = dateOnly(target).getTime() - dateOnly(base).getTime();
  return Math.round(diff / msPerDay);
};

const sendTenantReminder = async ({ tenant, dueDate, category, daysValue, dryRun = false }) => {
  const amount = Number(tenant.rent_amount || 0);
  const amountText = amount.toLocaleString();
  const dueText = dueDate.toISOString().slice(0, 10);

  let subject = 'Rent Reminder - RentFlow TZ';
  let message = `Hello ${tenant.full_name}, your rent of ${amountText} TZS for ${tenant.property_name} is due on ${dueText}.`;
  let smsType = 'rent_reminder';

  if (category === 'due_today') {
    subject = 'Rent Due Today - RentFlow TZ';
    message = `Hello ${tenant.full_name}, your rent of ${amountText} TZS for ${tenant.property_name} is due today.`;
  }

  if (category === 'overdue') {
    subject = 'Overdue Rent Notice - RentFlow TZ';
    message = `Hello ${tenant.full_name}, your rent of ${amountText} TZS for ${tenant.property_name} is overdue by ${daysValue} day(s). Please pay as soon as possible.`;
  }

  const result = { email_sent: false, sms_sent: false, notification_sent: false, sms_error: null, email_error: null };

  if (!dryRun && tenant.email) {
    try {
      await sendMail({
        to: tenant.email,
        subject,
        html: `<p>${message}</p><p>Due date: <strong>${dueText}</strong></p>`,
      });
      result.email_sent = true;
    } catch (error) {
      result.email_error = error.message;
    }
  }

  if (!dryRun && tenant.phone) {
    try {
      await sendAndBillSms({
        userId: tenant.landlord_id,
        phone: tenant.phone,
        message,
        smsType,
        tenantId: tenant.tenant_id,
      });
      result.sms_sent = true;
    } catch (error) {
      result.sms_error = error.message;
    }
  }

  try {
    if (!dryRun) {
      await createNotification({
        userId: tenant.landlord_id,
        type: category === 'overdue' ? 'error' : 'info',
        title: category === 'overdue' ? 'Overdue tenant reminder sent' : 'Rent reminder sent',
        message: `${tenant.full_name} reminder processed (${category}).`,
        metadata: {
          tenant_id: tenant.tenant_id,
          category,
          days: daysValue,
        },
      });
      result.notification_sent = true;
    }
  } catch {
    // Skip in restricted environments where notifications table may be unavailable.
  }

  return result;
};

const processRentReminders = async ({ landlordId = null, dryRun = false } = {}) => {
  const dueDate = computeMonthDueDate();
  const diff = dayDiff(dueDate, new Date());

  const where = landlordId ? 'WHERE p.landlord_id = $1' : '';
  const params = landlordId ? [landlordId] : [];

  const tenantRes = await pool.query(
    `SELECT
        t.id AS tenant_id,
        t.full_name,
        t.email,
        t.phone,
        u.rent_amount,
        p.id AS property_id,
        p.name AS property_name,
        p.landlord_id
     FROM tenants t
     JOIN units u ON u.id = t.unit_id
     JOIN properties p ON p.id = u.property_id
     ${where}`,
    params
  );

  const shouldSendPreDue = diff === REMINDER_DAYS_BEFORE_DUE;
  const shouldSendDueToday = diff === 0;
  const overdueDays = Math.abs(diff);
  const shouldSendOverdue = diff < 0 && OVERDUE_REMINDER_DAYS.includes(overdueDays);

  if (!shouldSendPreDue && !shouldSendDueToday && !shouldSendOverdue) {
    return {
      processed: 0,
      sent: 0,
      reason: 'No reminder window today',
      due_date: dueDate.toISOString(),
      day_diff: diff,
    };
  }

  let category = 'pre_due';
  let daysValue = diff;
  if (shouldSendDueToday) {
    category = 'due_today';
    daysValue = 0;
  }
  if (shouldSendOverdue) {
    category = 'overdue';
    daysValue = overdueDays;
  }

  let sent = 0;
  const items = [];

  for (const tenant of tenantRes.rows) {
    const outcome = await sendTenantReminder({ tenant, dueDate, category, daysValue, dryRun });
    if (outcome.email_sent || outcome.sms_sent || outcome.notification_sent || dryRun) sent += 1;
    items.push({ tenant_id: tenant.tenant_id, category, ...outcome });
  }

  return {
    processed: tenantRes.rows.length,
    sent,
    due_date: dueDate.toISOString(),
    day_diff: diff,
    category,
    items,
  };
};

const processRetryRules = async ({ landlordId = null, dryRun = false } = {}) => {
  const where = landlordId ? 'AND p.landlord_id = $1' : '';
  const params = landlordId ? [landlordId] : [];

  const result = await pool.query(
    `SELECT
        pay.id AS payment_id,
        pay.tenant_id,
        pay.amount,
        pay.status,
        pay.payment_method,
        pay.payment_url,
        pay.created_at,
        t.full_name,
        t.phone,
        p.name AS property_name,
        p.landlord_id,
        DATE_PART('day', NOW() - COALESCE(pay.created_at, NOW()))::int AS age_days
     FROM payments pay
     JOIN tenants t ON t.id = pay.tenant_id
     JOIN units u ON u.id = t.unit_id
     JOIN properties p ON p.id = u.property_id
     WHERE pay.status IN ('failed', 'pending')
       AND pay.payment_url IS NOT NULL
       AND COALESCE(pay.created_at, NOW()) >= NOW() - INTERVAL '30 days'
       ${where}
     ORDER BY pay.created_at DESC`,
    params
  );

  const candidates = result.rows.filter((item) => RETRY_DAYS.includes(Number(item.age_days || 0)));

  let notified = 0;
  const items = [];

  for (const row of candidates) {
    const retryMessage = `Payment retry reminder: ${row.full_name} (${Number(row.amount || 0).toLocaleString()} TZS) has ${row.status} status after ${row.age_days} day(s).`;
    let notification_sent = false;
    let sms_sent = false;
    let sms_error = null;

    if (!dryRun) {
      try {
        await createNotification({
          userId: row.landlord_id,
          type: 'warning',
          title: 'Payment Retry Recommended',
          message: retryMessage,
          metadata: {
            payment_id: row.payment_id,
            age_days: row.age_days,
            retry_url: row.payment_url,
          },
        });
        notification_sent = true;
      } catch {
        // no-op
      }

      if (row.phone) {
        try {
          await sendAndBillSms({
            userId: row.landlord_id,
            phone: row.phone,
            message: `Hello ${row.full_name}, your previous payment attempt was not completed. Please retry here: ${row.payment_url}`,
            smsType: 'payment_confirmation',
            tenantId: row.tenant_id,
          });
          sms_sent = true;
        } catch (error) {
          sms_error = error.message;
        }
      }
    }

    if (notification_sent || sms_sent || dryRun) notified += 1;
    items.push({
      payment_id: row.payment_id,
      tenant_id: row.tenant_id,
      age_days: row.age_days,
      notification_sent,
      sms_sent,
      sms_error,
    });
  }

  return {
    checked: result.rows.length,
    matched_rules: candidates.length,
    notified,
    retry_days: RETRY_DAYS,
    items,
  };
};

const runCollectionsAutomation = async ({ landlordId = null, dryRun = false, mode = 'all' } = {}) => {
  const safeMode = ['all', 'reminders', 'retries'].includes(mode) ? mode : 'all';
  const reminders =
    safeMode === 'all' || safeMode === 'reminders'
      ? await processRentReminders({ landlordId, dryRun })
      : null;
  const retries =
    safeMode === 'all' || safeMode === 'retries'
      ? await processRetryRules({ landlordId, dryRun })
      : null;

  return {
    mode: safeMode,
    reminders,
    retries,
    run_at: new Date().toISOString(),
    dry_run: dryRun,
  };
};

module.exports = {
  runCollectionsAutomation,
  processRentReminders,
  processRetryRules,
};
