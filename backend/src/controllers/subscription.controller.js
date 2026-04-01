const crypto = require('crypto');
const pool = require('../config/db');
const { createPaymentRequest, normalizeMethod, verifyCallbackSignature, verifyPayment } = require('../services/fastlipa.service');
const { resolvePlanPrice } = require('../services/planPricing.service');

const intervalForCycle = (cycle) => (cycle === 'yearly' ? '1 year' : '1 month');
const fastlipaDebug = () => process.env.FASTLIPA_DEBUG === 'true';
const refreshThrottleMs = 7000;
const lastRefreshByUserId = new Map();

const maybeRefreshPendingSubscriptionPayment = async (userId) => {
  const last = lastRefreshByUserId.get(userId) || 0;
  if (Date.now() - last < refreshThrottleMs) return;
  lastRefreshByUserId.set(userId, Date.now());

  const { rows } = await pool.query(
    `SELECT id, subscription_id, status, transaction_id, gateway_reference, created_at
     FROM billing_history
     WHERE user_id=$1
       AND billing_type='subscription'
       AND status='pending'
       AND created_at > NOW() - INTERVAL '24 hours'
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );

  if (!rows.length) return;
  const bill = rows[0];
  const ref = bill.transaction_id || bill.gateway_reference;
  if (!ref) return;

  const result = await verifyPayment(ref);
  if (!['success', 'failed'].includes(result.status)) return;

  const billingRes = await pool.query(
    `UPDATE billing_history
     SET status=$1,
         transaction_id=COALESCE($2, transaction_id),
         gateway_reference=COALESCE($3, gateway_reference)
     WHERE id=$4
     RETURNING *`,
    [result.status, result.transaction_id || null, result.gateway_reference || null, bill.id]
  );

  const updatedBill = billingRes.rows[0] || null;
  if (!updatedBill) return;

  if (result.status === 'success' && updatedBill.subscription_id) {
    await pool.query(
      `UPDATE subscriptions
       SET status='active',
           starts_at=NOW(),
           ends_at=NOW() + (CASE WHEN billing_cycle='yearly' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END)
       WHERE id=$1`,
      [updatedBill.subscription_id]
    );

    await pool.query(
      `INSERT INTO user_subscriptions (user_id, plan_id, status, billing_cycle, started_at, expires_at, updated_at)
       SELECT s.user_id, s.plan_id, 'active', s.billing_cycle, NOW(), s.ends_at, NOW()
       FROM subscriptions s WHERE s.id=$1
       ON CONFLICT (user_id)
       DO UPDATE SET plan_id=EXCLUDED.plan_id, status='active', billing_cycle=EXCLUDED.billing_cycle, started_at=EXCLUDED.started_at, expires_at=EXCLUDED.expires_at, updated_at=NOW()`,
      [updatedBill.subscription_id]
    );
  }

  if (result.status === 'failed' && updatedBill.subscription_id) {
    await pool.query(`UPDATE subscriptions SET status='cancelled' WHERE id=$1`, [updatedBill.subscription_id]);
  }
};

exports.subscribe = async (req, res) => {
  const userId = req.user.id;
  const { plan_code, billing_cycle = 'monthly', payment_method, phone } = req.body;

  if (!plan_code || !payment_method) {
    return res.status(400).json({ message: 'plan_code and payment_method are required' });
  }

  if (!['monthly', 'yearly'].includes(billing_cycle)) {
    return res.status(400).json({ message: 'billing_cycle must be monthly or yearly' });
  }

  try {
    const method = normalizeMethod(payment_method);

    const planRes = await pool.query('SELECT * FROM plans WHERE code=$1 AND is_active=true', [plan_code]);
    if (!planRes.rows.length) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const plan = planRes.rows[0];
    const amount = resolvePlanPrice(plan, billing_cycle);

    if (plan.code === 'enterprise' && amount <= 0) {
      return res.status(400).json({ message: 'Enterprise plan requires custom negotiation. Contact support.' });
    }

    const subRes = await pool.query(
      `INSERT INTO subscriptions (user_id, plan_id, billing_cycle, amount, status, starts_at, ends_at)
       VALUES ($1,$2,$3,$4,'pending',NOW(),NOW() + ($5)::interval)
       RETURNING *`,
      [userId, plan.id, billing_cycle, amount, intervalForCycle(billing_cycle)]
    );
    const subscription = subRes.rows[0];

    const billingRes = await pool.query(
      `INSERT INTO billing_history (user_id, subscription_id, billing_type, amount, currency, payment_method, status, metadata)
       VALUES ($1,$2,'subscription',$3,'TZS',$4,'pending',$5)
       RETURNING *`,
      [userId, subscription.id, amount, method, JSON.stringify({ plan_code, billing_cycle })]
    );

    const invoice = billingRes.rows[0];
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    const apiBase = process.env.API_PUBLIC_URL || 'http://localhost:5000';

    const payment = await createPaymentRequest({
      amount,
      phone,
      paymentMethod: method,
      externalId: `BILL-${invoice.id}-${crypto.randomBytes(4).toString('hex')}`,
      customerName: req.user.name || 'RentFlow User',
      successUrl: `${frontendBase}/billing?sub=success`,
      failedUrl: `${frontendBase}/billing?sub=failed`,
      callbackUrl: `${apiBase}/api/payments/webhook`,
    });
    if (fastlipaDebug()) {
      console.log('[subscribe] payment initiated', {
        userId,
        subscriptionId: subscription.id,
        billingId: invoice.id,
        amount,
        billing_cycle,
        plan_code,
        payment_method: method,
      });
    }

    await pool.query(
      `UPDATE billing_history
       SET payment_url=$1, transaction_id=$2, gateway_reference=$3, metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb
       WHERE id=$5`,
      [
        payment.payment_url,
        payment.transaction_id,
        payment.gateway_reference,
        JSON.stringify({ external_type: 'subscription', subscription_id: subscription.id }),
        invoice.id,
      ]
    );

    return res.status(201).json({
      message: 'Subscription payment initiated',
      subscription_id: subscription.id,
      payment_url: payment.payment_url,
      transaction_id: payment.transaction_id,
      gateway_reference: payment.gateway_reference,
      amount,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: error.message || 'Failed to subscribe' });
  }
};

exports.subscriptionStatus = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.json({
        status: 'active',
        plan_code: 'enterprise',
        plan_name: 'Admin Access',
        is_admin: true
      });
    }

    if (String(req.query?.refresh || '') === '1') {
      await maybeRefreshPendingSubscriptionPayment(req.user.id);
    }

    const { rows } = await pool.query(
      `SELECT us.*, p.code AS plan_code, p.name AS plan_name, p.price_monthly, p.price_yearly
       FROM user_subscriptions us
       LEFT JOIN plans p ON us.plan_id=p.id
       WHERE us.user_id=$1`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.json({ status: 'trial', plan_code: 'starter', plan_name: 'Starter Plan' });
    }

    const sub = rows[0];
    
    // Evaluate grace period for recently expired active plans
    if (sub.status === 'active' && sub.expires_at) {
      const msLeft = new Date(sub.expires_at).getTime() - Date.now();
      if (msLeft < 0) {
        const gracePeriodMs = 48 * 60 * 60 * 1000; // 48 hours
        if (Math.abs(msLeft) <= gracePeriodMs) {
          sub.status = 'grace_period';
        } else {
          sub.status = 'expired';
          // Mark as expired in DB
          await pool.query('UPDATE user_subscriptions SET status=$1, updated_at=NOW() WHERE user_id=$2', ['expired', req.user.id]);
        }
      }
    }

    return res.json(sub);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to fetch subscription status' });
  }
};

exports.subscriptionCallback = async (req, res) => {
  try {
    const signature = req.headers['x-fastlipa-signature'];
    const payloadString = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body || {});
    const isValid = verifyCallbackSignature({ signature, payload: payloadString });

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid callback signature' });
    }

    const body = req.body || {};
    const statusRaw = String(body.status || body.payment_status || body.paymentStatus || body.result || '').toLowerCase();
    const mapped = ['success', 'paid', 'completed', 'successful'].includes(statusRaw)
      ? 'success'
      : ['failed', 'cancelled', 'canceled', 'error'].includes(statusRaw)
        ? 'failed'
        : 'pending';

    const externalId =
      body.external_id ||
      body.externalId ||
      body.order_id ||
      body.orderId ||
      body.merchant_reference ||
      body.merchantReference ||
      null;

    const billingId = Number(
      body.billing_id ||
        body.billingId ||
        body.metadata?.billing_id ||
        body.metadata?.billingId ||
        (externalId ? String(externalId).split('-')?.[1] : null)
    );
    if (!billingId) {
      if (fastlipaDebug()) {
        console.warn('[subscribe] callback missing billing reference', {
          statusRaw,
          mapped,
          externalId,
          hasMetadata: Boolean(body.metadata),
          keys: Object.keys(body || {}),
        });
      }
      return res.status(400).json({ message: 'Billing reference missing' });
    }

    // Extra safety for API-key-only webhook mode: ensure transaction_id matches what we issued.
    const currentRes = await pool.query(
      `SELECT id, status, amount, transaction_id, gateway_reference, subscription_id
       FROM billing_history
       WHERE id=$1
       LIMIT 1`,
      [billingId]
    );
    if (!currentRes.rows.length) {
      return res.status(404).json({ message: 'Billing record not found' });
    }

    const current = currentRes.rows[0];
    const cbTxn = body.transaction_id || body.txn_id || null;
    const cbRef = body.reference || body.gateway_reference || null;
    if (fastlipaDebug()) {
      console.log('[subscribe] callback received', {
        billingId,
        statusRaw,
        mapped,
        cbTxn,
        cbRef,
        externalId,
      });
    }

    if (current.transaction_id) {
      if (!cbTxn) return res.status(400).json({ message: 'transaction_id missing in callback payload' });
      if (String(current.transaction_id) !== String(cbTxn)) {
        return res.status(401).json({ message: 'Callback transaction_id mismatch' });
      }
    }
    if (current.gateway_reference && cbRef && String(current.gateway_reference) !== String(cbRef)) {
      return res.status(401).json({ message: 'Callback reference mismatch' });
    }

    const billingRes = await pool.query(
      `UPDATE billing_history
       SET status=$1, transaction_id=COALESCE($2, transaction_id), gateway_reference=COALESCE($3, gateway_reference)
       WHERE id=$4
       RETURNING *`,
      [mapped, cbTxn, cbRef, billingId]
    );

    if (!billingRes.rows.length) {
      return res.status(404).json({ message: 'Billing record not found' });
    }

    const bill = billingRes.rows[0];
    if (mapped === 'success' && bill.subscription_id) {
      await pool.query(
        `UPDATE subscriptions
         SET status='active', starts_at=NOW(), ends_at=NOW() + (CASE WHEN billing_cycle='yearly' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END)
         WHERE id=$1`,
        [bill.subscription_id]
      );

      await pool.query(
        `INSERT INTO user_subscriptions (user_id, plan_id, status, billing_cycle, started_at, expires_at, updated_at)
         SELECT s.user_id, s.plan_id, 'active', s.billing_cycle, NOW(), s.ends_at, NOW()
         FROM subscriptions s WHERE s.id=$1
         ON CONFLICT (user_id)
         DO UPDATE SET plan_id=EXCLUDED.plan_id, status='active', billing_cycle=EXCLUDED.billing_cycle, started_at=EXCLUDED.started_at, expires_at=EXCLUDED.expires_at, updated_at=NOW()`,
        [bill.subscription_id]
      );

      // Send SMS receipt
      try {
        const userRes = await pool.query(
          `SELECT u.phone, p.name AS plan_name
           FROM users u
           JOIN subscriptions s ON s.user_id = u.id
           JOIN plans p ON p.id = s.plan_id
           WHERE s.id=$1`,
          [bill.subscription_id]
        );
        if (userRes.rows.length && userRes.rows[0].phone) {
          const uInfo = userRes.rows[0];
          const formatTZS = (n) => Number(n || 0).toLocaleString('en-TZ');
          const message = `Hongera! Malipo yako ya TZS ${formatTZS(current.amount)} yamepokelewa. Mpango wako wa ${uInfo.plan_name} sasa uko ACTIVE. Ahsante.`;
          sendSms({ phone: uInfo.phone, message }).catch(err => console.error('[SMS] Failed receipt:', err.message));
        }
      } catch (err) {
        console.error('[SMS] Error fetching user for receipt:', err.message);
      }
    }

    return res.json({ message: 'Subscription callback processed', status: mapped });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to process subscription callback' });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE user_subscriptions
       SET status='cancelled', cancelled_at=NOW(), updated_at=NOW()
       WHERE user_id=$1 AND status IN ('active','trial')
       RETURNING *`,
      [userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'No active subscription found to cancel' });
    }

    // Also mark the latest active subscription record as cancelled
    await pool.query(
      `UPDATE subscriptions
       SET status='cancelled'
       WHERE user_id=$1 AND status IN ('active','pending')`,
      [userId]
    );

    return res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to cancel subscription' });
  }
};

exports.getSubscriptionHistory = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         s.id,
         s.billing_cycle,
         s.amount,
         s.status,
         s.starts_at,
         s.ends_at,
         s.created_at,
         p.code AS plan_code,
         p.name AS plan_name,
         bh.payment_method,
         bh.transaction_id,
         bh.gateway_reference,
         bh.status AS payment_status,
         bh.payment_url
       FROM subscriptions s
       LEFT JOIN plans p ON s.plan_id = p.id
       LEFT JOIN billing_history bh ON bh.subscription_id = s.id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );

    return res.json(rows);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to fetch subscription history' });
  }
};
