const pool = require('../config/db');
const { createNotification } = require('./notification.service');
const { sendAndBillSms } = require('./smsBilling.service');
const { sendMail } = require('./email.service');

const get = (obj, path) => path.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), obj);

const evaluateConditions = (conditions, payload) => {
  if (!conditions || typeof conditions !== 'object') return true;

  for (const [field, rule] of Object.entries(conditions)) {
    const value = get(payload, field);
    if (rule && typeof rule === 'object' && !Array.isArray(rule)) {
      if (rule.eq !== undefined && value !== rule.eq) return false;
      if (rule.gte !== undefined && Number(value) < Number(rule.gte)) return false;
      if (rule.lte !== undefined && Number(value) > Number(rule.lte)) return false;
      if (rule.contains !== undefined && !String(value || '').includes(String(rule.contains))) return false;
    } else if (value !== rule) {
      return false;
    }
  }
  return true;
};

const tpl = (template, payload) => String(template || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
  const v = get(payload, path);
  return v == null ? '' : String(v);
});

const runAction = async ({ userId, action, payload }) => {
  if (!action || typeof action !== 'object') return;

  if (action.type === 'notification') {
    await createNotification({
      userId,
      type: action.level || 'info',
      title: tpl(action.title || 'Workflow Alert', payload),
      message: tpl(action.message || '', payload),
      metadata: { workflow: true, payload },
    });
    return;
  }

  if (action.type === 'sms') {
    const phone = tpl(action.to || payload.phone || payload.tenant_phone || '', payload);
    if (!phone) return;
    await sendAndBillSms({
      userId,
      phone,
      message: tpl(action.message || 'RentFlow notification', payload),
      smsType: action.sms_type || 'other',
    });
    return;
  }

  if (action.type === 'email') {
    const to = tpl(action.to || payload.email || payload.tenant_email || '', payload);
    if (!to) return;
    await sendMail({
      to,
      subject: tpl(action.subject || 'RentFlow alert', payload),
      html: `<p>${tpl(action.message || '', payload)}</p>`,
    });
  }
};

const processWorkflowEvent = async ({ userId, eventType, payload = {} }) => {
  try {
    const { rows } = await pool.query(
      `SELECT *
       FROM workflow_rules
       WHERE user_id=$1 AND event_type=$2 AND is_active=true
       ORDER BY id DESC`,
      [userId, eventType]
    );

    for (const rule of rows) {
      const conditions = rule.conditions || {};
      const actions = Array.isArray(rule.actions) ? rule.actions : [];

      if (!evaluateConditions(conditions, payload)) {
        continue;
      }

      try {
        for (const action of actions) {
          await runAction({ userId, action, payload });
        }

        await pool.query(
          `INSERT INTO workflow_runs (rule_id, user_id, event_type, status, payload)
           VALUES ($1,$2,$3,'success',$4)`,
          [rule.id, userId, eventType, JSON.stringify(payload)]
        );
      } catch (actionError) {
        await pool.query(
          `INSERT INTO workflow_runs (rule_id, user_id, event_type, status, error_message, payload)
           VALUES ($1,$2,$3,'failed',$4,$5)`,
          [rule.id, userId, eventType, actionError.message, JSON.stringify(payload)]
        );
      }
    }
  } catch (error) {
    console.error('[workflow] process failed:', error.message);
  }
};

module.exports = {
  processWorkflowEvent,
};
