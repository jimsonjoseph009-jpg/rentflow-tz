const crypto = require('crypto');
const pool = require('../config/db');
const { ensureOptionalTables } = require('../services/schemaBootstrap.service');
const { createPaymentRequest, normalizeMethod } = require('../services/fastlipa.service');

const isExpired = (expiresAt) => {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
};

const ensureLandlordCanTakePayments = async (landlordId) => {
  const subRes = await pool.query(
    `SELECT us.status, us.expires_at, us.plan_id
     FROM user_subscriptions us
     WHERE us.user_id=$1`,
    [landlordId]
  );

  if (!subRes.rows.length) {
    return { ok: false, status: 402, message: 'Landlord subscription required' };
  }

  const sub = subRes.rows[0];
  const expired = sub.expires_at && new Date(sub.expires_at).getTime() < Date.now();
  if (!['active', 'trial'].includes(sub.status) || expired) {
    return { ok: false, status: 402, message: 'Landlord subscription inactive or expired' };
  }

  const featureRes = await pool.query(
    `SELECT 1 FROM plan_features WHERE plan_id=$1 AND feature_key='payment_integration' LIMIT 1`,
    [sub.plan_id]
  );
  if (!featureRes.rows.length) {
    return { ok: false, status: 403, message: 'Payments are not enabled for this landlord plan' };
  }

  return { ok: true };
};

exports.getPayLinkByToken = async (req, res) => {
  const token = String(req.params.token || '').trim();
  if (!token) return res.status(400).json({ message: 'Token required' });

  try {
    await ensureOptionalTables();

    const { rows } = await pool.query(
      `SELECT
         pl.id,
         pl.token,
         pl.amount,
         pl.currency,
         pl.status,
         pl.expires_at,
         t.full_name AS tenant_name,
         t.phone AS tenant_phone,
         pr.name AS property_name,
         pr.id AS property_id
       FROM pay_links pl
       JOIN tenants t ON pl.tenant_id=t.id
       JOIN properties pr ON pl.property_id=pr.id
       WHERE pl.token=$1
       LIMIT 1`,
      [token]
    );

    if (!rows.length) return res.status(404).json({ message: 'Pay link not found' });
    const link = rows[0];

    if (link.status !== 'active') return res.status(410).json({ message: 'Pay link is no longer active' });
    if (isExpired(link.expires_at)) return res.status(410).json({ message: 'Pay link has expired' });

    return res.json(link);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to fetch pay link' });
  }
};

exports.initiatePayLinkPayment = async (req, res) => {
  const token = String(req.params.token || '').trim();
  if (!token) return res.status(400).json({ message: 'Token required' });

  const { payment_method, phone } = req.body || {};
  if (!payment_method) return res.status(400).json({ message: 'payment_method is required' });

  try {
    await ensureOptionalTables();

    const linkRes = await pool.query(
      `SELECT
         pl.id,
         pl.landlord_id,
         pl.tenant_id,
         pl.property_id,
         pl.amount,
         pl.currency,
         pl.status,
         pl.expires_at,
         pl.used_payment_id
       FROM pay_links pl
       WHERE pl.token=$1
       LIMIT 1`,
      [token]
    );

    if (!linkRes.rows.length) return res.status(404).json({ message: 'Pay link not found' });
    const link = linkRes.rows[0];

    if (link.status !== 'active') return res.status(410).json({ message: 'Pay link is no longer active' });
    if (isExpired(link.expires_at)) return res.status(410).json({ message: 'Pay link has expired' });
    if (link.used_payment_id) {
      return res.status(409).json({ message: 'Pay link has already been used', payment_id: link.used_payment_id });
    }

    const landlordGate = await ensureLandlordCanTakePayments(link.landlord_id);
    if (!landlordGate.ok) {
      return res.status(landlordGate.status).json({ message: landlordGate.message });
    }

    // Re-check tenant still belongs to landlord to avoid stale links being abused.
    const tenantRes = await pool.query(
      `SELECT t.id, t.full_name, t.phone, u.property_id, p.name AS property_name, p.landlord_id
       FROM tenants t
       JOIN units u ON t.unit_id = u.id
       JOIN properties p ON u.property_id = p.id
       WHERE t.id=$1 AND p.landlord_id=$2`,
      [link.tenant_id, link.landlord_id]
    );

    if (!tenantRes.rows.length) {
      return res.status(404).json({ message: 'Tenant not found for this pay link' });
    }

    const tenant = tenantRes.rows[0];
    const method = normalizeMethod(payment_method);

    const amount = Number(link.amount);
    const feePercent = Number(process.env.PLATFORM_TRANSACTION_FEE_PERCENT || 2);
    const feeAmount = Number(((amount * feePercent) / 100).toFixed(2));
    const totalChargeAmount = amount + feeAmount;

    const insertRes = await pool.query(
      `INSERT INTO payments (tenant_id, property_id, amount, payment_method, status, payment_date, created_at)
       VALUES ($1,$2,$3,$4,'pending',NOW(),NOW())
       RETURNING *`,
      [tenant.id, tenant.property_id, amount, method]
    );
    const payment = insertRes.rows[0];

    const externalId = `PLINK-${payment.id}-${crypto.randomBytes(4).toString('hex')}`;
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    const apiBase = process.env.API_PUBLIC_URL || 'http://localhost:5000';

    const gatewayPayload = await createPaymentRequest({
      amount: totalChargeAmount,
      phone: phone || tenant.phone,
      paymentMethod: method,
      externalId,
      customerName: tenant.full_name,
      successUrl: `${frontendBase}/payment-success?paymentId=${payment.id}`,
      failedUrl: `${frontendBase}/payment-failed?paymentId=${payment.id}`,
      callbackUrl: `${apiBase}/api/payments/callback`,
    });

    await pool.query(
      `UPDATE payments
       SET transaction_id=$1,
           gateway_reference=$2,
           payment_url=$3,
           gateway_response=$4
       WHERE id=$5`,
      [
        gatewayPayload.transaction_id,
        gatewayPayload.gateway_reference,
        gatewayPayload.payment_url,
        JSON.stringify(gatewayPayload.raw || {}),
        payment.id,
      ]
    );

    try {
      await pool.query(
        `INSERT INTO transaction_fees (payment_id, user_id, fee_percent, fee_amount, rent_amount, total_amount, status)
         VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
        [payment.id, link.landlord_id, feePercent, feeAmount, amount, totalChargeAmount]
      );
    } catch (feeLogError) {
      console.warn('[pay-link] transaction fee log skipped:', feeLogError.message);
    }

    await pool.query(
      `UPDATE pay_links
       SET used_payment_id=$1, used_at=NOW(), status='used'
       WHERE id=$2 AND used_payment_id IS NULL`,
      [payment.id, link.id]
    );

    return res.status(201).json({
      message: 'Payment initiated',
      payment_id: payment.id,
      payment_url: gatewayPayload.payment_url,
      amount,
      fee_amount: feeAmount,
      total_charged: totalChargeAmount,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: error.message || 'Failed to initiate payment' });
  }
};

