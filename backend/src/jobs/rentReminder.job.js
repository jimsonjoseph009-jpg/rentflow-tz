const cron = require('node-cron');
const pool = require('../config/db');
const { sendMail } = require('../services/email.service');

const DAYS_BEFORE_DUE = Number(process.env.RENT_REMINDER_DAYS_BEFORE || 3);

const sendReminders = async () => {
  const emailColumnCheck = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_name = 'tenants'
       AND column_name = 'email'
     LIMIT 1`
  );

  if (!emailColumnCheck.rows.length) {
    console.warn('[rent-reminder-job] tenants.email column not found, skipping reminders');
    return;
  }

  const query = `
    SELECT
      t.id AS tenant_id,
      t.full_name,
      t.email,
      t.phone,
      u.rent_amount,
      p.name AS property_name,
      t.lease_end,
      (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::date AS due_date
    FROM tenants t
    JOIN units u ON t.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE t.email IS NOT NULL
  `;

  const { rows } = await pool.query(query);
  const now = new Date();

  for (const tenant of rows) {
    const due = new Date(tenant.due_date);
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

    if (diffDays !== DAYS_BEFORE_DUE) {
      continue;
    }

    await sendMail({
      to: tenant.email,
      subject: 'Rent Reminder - RentFlow TZ',
      html: `
        <p>Habari ${tenant.full_name},</p>
        <p>Kumbusho: Kodi ya <strong>TZS ${Number(tenant.rent_amount || 0).toLocaleString()}</strong> ya nyumba <strong>${tenant.property_name}</strong> inatakiwa kabla ya <strong>${new Date(tenant.due_date).toDateString()}</strong>.</p>
        <p>Tafadhali lipa kwa wakati kupitia RentFlow TZ.</p>
      `,
    });
  }
};

const startRentReminderJob = () => {
  const schedule = process.env.RENT_REMINDER_CRON || '0 8 * * *';

  cron.schedule(schedule, async () => {
    try {
      await sendReminders();
      console.log('[rent-reminder-job] reminders processed');
    } catch (error) {
      console.error('[rent-reminder-job] failed', error.message);
    }
  });
};

module.exports = {
  startRentReminderJob,
  sendReminders,
};
