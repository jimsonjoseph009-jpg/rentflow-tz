const crypto = require('crypto');
const pool = require('../config/db');
const { createPaymentRequest, normalizeMethod, verifyCallbackSignature } = require('../services/fastlipa.service');
const { generateReceipt } = require('../services/receipt.service');
const { createNotification } = require('../services/notification.service');
const { processWorkflowEvent } = require('../services/workflow.service');
const { logActivity } = require('../services/activity.service');
const { runCollectionsAutomation } = require('../services/collectionsAutomation.service');

const createReceiptNumber = (paymentId) => `RFTZ-${new Date().getFullYear()}-${String(paymentId).padStart(6, '0')}`;

const statusFromGateway = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (['success', 'successful', 'completed', 'paid'].includes(normalized)) return 'success';
  if (['failed', 'cancelled', 'canceled', 'declined', 'error'].includes(normalized)) return 'failed';
  return 'pending';
};

exports.createPayment = async (req, res) => {
  const landlordId = req.user.id;
  const { tenant_id, amount, payment_date, status = 'pending', payment_method = 'manual', property_id = null } = req.body;

  try {
    const tenantCheck = await pool.query(
      `SELECT t.*, u.property_id, p.landlord_id
       FROM tenants t
       JOIN units u ON t.unit_id = u.id
       JOIN properties p ON u.property_id = p.id
       WHERE t.id=$1 AND p.landlord_id=$2`,
      [tenant_id, landlordId]
    );

    if (tenantCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Tenant not found or unauthorized' });
    }

    const safeStatus = ['pending', 'success', 'failed'].includes(status) ? status : 'pending';
    const result = await pool.query(
      `INSERT INTO payments (tenant_id, property_id, amount, payment_method, status, payment_date, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`,
      [tenant_id, property_id || tenantCheck.rows[0].property_id, amount, payment_method, safeStatus, payment_date || new Date()]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getPayments = async (req, res) => {
  const landlordId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT pay.*, t.full_name AS tenant_name, u.unit_number, p.name AS property_name
       FROM payments pay
       JOIN tenants t ON pay.tenant_id = t.id
       JOIN units u ON t.unit_id = u.id
       JOIN properties p ON u.property_id = p.id
       WHERE p.landlord_id=$1
       ORDER BY pay.created_at DESC NULLS LAST, pay.id DESC`,
      [landlordId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.updatePayment = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;
  const { tenant_id, amount, payment_date, status = 'pending', payment_method = 'manual' } = req.body;

  try {
    const safeStatus = ['pending', 'success', 'failed'].includes(status) ? status : 'pending';
    const result = await pool.query(
      `UPDATE payments pay
       SET tenant_id=$1, amount=$2, payment_date=$3, status=$4, payment_method=$5
       FROM tenants t
       JOIN units u ON t.unit_id = u.id
       JOIN properties p ON u.property_id = p.id
       WHERE pay.id=$6 AND pay.tenant_id=t.id AND p.landlord_id=$7
       RETURNING pay.*`,
      [tenant_id, amount, payment_date, safeStatus, payment_method, id, landlordId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.deletePayment = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    await pool.query(
      `DELETE FROM payments pay
       USING tenants t
       JOIN units u ON t.unit_id = u.id
       JOIN properties p ON u.property_id = p.id
       WHERE pay.id=$1 AND pay.tenant_id=t.id AND p.landlord_id=$2`,
      [id, landlordId]
    );

    return res.json({ message: 'Payment deleted' });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.payRent = async (req, res) => {
  const { tenant_id, property_id, amount, payment_method, phone } = req.body;

  if (!tenant_id || !amount || !payment_method) {
    return res.status(400).json({ message: 'tenant_id, amount and payment_method are required' });
  }

  try {
    let tenantRes;
    if (req.user?.role === 'landlord') {
      tenantRes = await pool.query(
        `SELECT t.id, t.full_name, t.phone, u.property_id, p.name AS property_name
         FROM tenants t
         JOIN units u ON t.unit_id = u.id
         JOIN properties p ON u.property_id = p.id
         WHERE t.id=$1 AND p.landlord_id=$2`,
        [tenant_id, req.user.id]
      );
    } else {
      tenantRes = await pool.query(
        `SELECT t.id, t.full_name, t.phone, u.property_id, p.name AS property_name
         FROM tenants t
         JOIN units u ON t.unit_id = u.id
         JOIN properties p ON u.property_id = p.id
         WHERE t.id=$1`,
        [tenant_id]
      );
    }

    if (!tenantRes.rows.length) {
      return res.status(404).json({ message: 'Tenant not found or unauthorized' });
    }

    const tenant = tenantRes.rows[0];
    if (property_id && Number(property_id) !== Number(tenant.property_id)) {
      return res.status(400).json({
        message: 'Selected property does not match tenant unit property',
      });
    }

    const method = normalizeMethod(payment_method);
    const resolvedPropertyId = tenant.property_id;
    const feePercent = Number(process.env.PLATFORM_TRANSACTION_FEE_PERCENT || 2);
    const feeAmount = Number(((Number(amount) * feePercent) / 100).toFixed(2));
    const totalChargeAmount = Number(amount) + feeAmount;

    const insertResult = await pool.query(
      `INSERT INTO payments (tenant_id, property_id, amount, payment_method, status, payment_date, created_at)
       VALUES ($1,$2,$3,$4,'pending',NOW(),NOW()) RETURNING *`,
      [tenant_id, resolvedPropertyId, amount, method]
    );

    const payment = insertResult.rows[0];
    const externalId = `RF-${payment.id}-${crypto.randomBytes(4).toString('hex')}`;
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

    const updated = await pool.query(
      `UPDATE payments
       SET transaction_id=$1,
           gateway_reference=$2,
           payment_url=$3,
           gateway_response=$4
       WHERE id=$5
       RETURNING id, tenant_id, property_id, amount, payment_method, transaction_id, status, payment_url, created_at`,
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
        [payment.id, req.user.id, feePercent, feeAmount, amount, totalChargeAmount]
      );
    } catch (feeLogError) {
      console.warn('[payments] transaction fee log skipped:', feeLogError.message);
    }

    return res.status(201).json({
      message: 'Payment initiated',
      payment: updated.rows[0],
      payment_url: gatewayPayload.payment_url,
      breakdown: {
        rent_amount: Number(amount),
        transaction_fee_percent: feePercent,
        transaction_fee_amount: feeAmount,
        total_charged: totalChargeAmount,
      },
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: error.message || 'Unable to initiate payment' });
  }
};

exports.paymentCallback = async (req, res) => {
  try {
    const signature = req.headers['x-fastlipa-signature'];
    const payloadString = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body || {});

    const isValid = verifyCallbackSignature({ signature, payload: payloadString });
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid webhook signature' });
    }

    const body = req.body || {};
    const paymentId = Number(body.payment_id || body.metadata?.payment_id || body.external_id?.split('-')?.[1]);
    const transactionId = body.transaction_id || body.txn_id || null;
    const gatewayReference = body.reference || body.gateway_reference || null;
    const mappedStatus = statusFromGateway(body.status);

    if (!paymentId) {
      return res.status(400).json({ message: 'payment_id missing in callback payload' });
    }

    const existingRes = await pool.query(
      `SELECT id, status, transaction_id, gateway_reference, receipt_path
       FROM payments
       WHERE id=$1`,
      [paymentId]
    );

    if (!existingRes.rows.length) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const existing = existingRes.rows[0];

    // Extra safety for API-key-only webhook mode: require transaction_id to match what we issued.
    if (existing.transaction_id) {
      if (!transactionId) {
        return res.status(400).json({ message: 'transaction_id missing in callback payload' });
      }
      if (String(existing.transaction_id) !== String(transactionId)) {
        return res.status(401).json({ message: 'Callback transaction_id mismatch' });
      }
    }
    if (existing.gateway_reference && gatewayReference && String(existing.gateway_reference) !== String(gatewayReference)) {
      return res.status(401).json({ message: 'Callback reference mismatch' });
    }

    const duplicateSuccess =
      existing.status === 'success' &&
      ((transactionId && existing.transaction_id === transactionId) ||
        (gatewayReference && existing.gateway_reference === gatewayReference));

    if (duplicateSuccess) {
      return res.json({ message: 'Callback already processed', status: existing.status });
    }

    const updateRes = await pool.query(
      `UPDATE payments
       SET status=$1,
           transaction_id=COALESCE($2, transaction_id),
           gateway_reference=COALESCE($3, gateway_reference),
           gateway_status=$4,
           callback_received_at=NOW(),
           gateway_response=$5,
           payment_date=CASE WHEN $1='success' THEN NOW() ELSE payment_date END
       WHERE id=$6
       RETURNING *`,
      [mappedStatus, transactionId, gatewayReference, body.status || null, JSON.stringify(body), paymentId]
    );

    if (!updateRes.rows.length) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const payment = updateRes.rows[0];

    try {
      await pool.query(
        `UPDATE transaction_fees
         SET status=$1
         WHERE payment_id=$2`,
        [mappedStatus, payment.id]
      );
    } catch (feeUpdateError) {
      console.warn('[payment-callback] transaction fee status update skipped:', feeUpdateError.message);
    }

    try {
      await pool.query(
        `INSERT INTO payment_webhook_logs (payment_id, payload, signature, status)
         VALUES ($1,$2,$3,$4)`,
        [payment.id, JSON.stringify(body), signature || null, mappedStatus]
      );
    } catch (logError) {
      // Do not fail the callback flow when logging table is unavailable in restricted DB roles.
      console.warn('[payment-callback] webhook log skipped:', logError.message);
    }

    if (mappedStatus === 'success' && !payment.receipt_path) {
      const contextRes = await pool.query(
        `SELECT p.id, p.amount, p.payment_method, p.transaction_id, t.full_name AS tenant_name, pr.name AS property_name
         FROM payments p
         JOIN tenants t ON p.tenant_id = t.id
         LEFT JOIN properties pr ON p.property_id = pr.id
         WHERE p.id=$1`,
        [payment.id]
      );

      const context = contextRes.rows[0] || {};
      const receiptNumber = createReceiptNumber(payment.id);
      const receipt = await generateReceipt({
        paymentId: payment.id,
        receiptNumber,
        tenantName: context.tenant_name,
        propertyName: context.property_name,
        amount: context.amount,
        paymentMethod: context.payment_method,
        transactionId: context.transaction_id,
        paidAt: new Date(),
      });

      await pool.query(
        `UPDATE payments
         SET receipt_number=$1, receipt_path=$2
         WHERE id=$3`,
        [receiptNumber, receipt.publicPath, payment.id]
      );
    }

    const ownerRes = await pool.query(
      `SELECT pr.landlord_id, t.id AS tenant_id, pr.id AS property_id, t.full_name AS tenant_name, t.phone AS tenant_phone, t.email AS tenant_email, p.amount
       FROM payments p
       JOIN tenants t ON p.tenant_id=t.id
       JOIN units u ON t.unit_id=u.id
       JOIN properties pr ON u.property_id=pr.id
       WHERE p.id=$1`,
      [payment.id]
    );

    const owner = ownerRes.rows[0];
    if (owner?.landlord_id) {
      const title = mappedStatus === 'success' ? 'Payment Received' : mappedStatus === 'failed' ? 'Payment Failed' : 'Payment Update';
      const message = `${owner.tenant_name || 'Tenant'} payment status is ${mappedStatus} (TZS ${Number(owner.amount || 0).toLocaleString()}).`;

      await createNotification({
        userId: owner.landlord_id,
        type: mappedStatus === 'success' ? 'success' : mappedStatus === 'failed' ? 'error' : 'info',
        title,
        message,
        metadata: { payment_id: payment.id, status: mappedStatus },
      });

      await processWorkflowEvent({
        userId: owner.landlord_id,
        eventType: `payment_${mappedStatus}`,
        payload: {
          payment_id: payment.id,
          status: mappedStatus,
          amount: Number(owner.amount || 0),
          tenant_name: owner.tenant_name,
          tenant_phone: owner.tenant_phone,
          tenant_email: owner.tenant_email,
          transaction_id: payment.transaction_id || transactionId || null,
        },
      });

      await logActivity({
        userId: owner.landlord_id,
        tenantId: owner.tenant_id || null,
        propertyId: owner.property_id || null,
        eventType: `payment_${mappedStatus}`,
        title: title,
        description: message,
        source: 'payment',
        metadata: {
          payment_id: payment.id,
          status: mappedStatus,
          amount: Number(owner.amount || 0),
        },
      });
    }

    try {
      const tenantUserRes = await pool.query(
        `SELECT t.user_id
         FROM payments p
         JOIN tenants t ON p.tenant_id=t.id
         WHERE p.id=$1
         LIMIT 1`,
        [payment.id]
      );
      const tenantUserId = tenantUserRes.rows[0]?.user_id || null;
      if (tenantUserId) {
        const title = mappedStatus === 'success' ? 'Payment Successful' : mappedStatus === 'failed' ? 'Payment Failed' : 'Payment Update';
        const message = `Your payment status is ${mappedStatus} (TZS ${Number(payment.amount || 0).toLocaleString()}).`;
        await createNotification({
          userId: tenantUserId,
          type: mappedStatus === 'success' ? 'success' : mappedStatus === 'failed' ? 'error' : 'info',
          title,
          message,
          metadata: { payment_id: payment.id, status: mappedStatus },
        });
      }
    } catch (tenantNotifyError) {
      console.warn('[payment-callback] tenant notification skipped:', tenantNotifyError.message);
    }

    return res.json({ message: 'Callback processed', status: mappedStatus });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to process callback' });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const baseQuery = `
      SELECT
        pay.id,
        pay.tenant_id,
        pay.property_id,
        pay.amount,
        pay.payment_method,
        pay.transaction_id,
        pay.status,
        pay.receipt_number,
        pay.receipt_path,
        pay.created_at,
        t.full_name AS tenant_name,
        pr.name AS property_name
      FROM payments pay
      JOIN tenants t ON pay.tenant_id = t.id
      JOIN units u ON t.unit_id = u.id
      JOIN properties pr ON u.property_id = pr.id
    `;

    let query;
    let params;

    if (role === 'tenant') {
      query = `${baseQuery} WHERE t.user_id=$1 ORDER BY pay.created_at DESC`;
      params = [userId];
    } else {
      query = `${baseQuery} WHERE pr.landlord_id=$1 ORDER BY pay.created_at DESC`;
      params = [userId];
    }

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to fetch payment history' });
  }
};

exports.getEarningsDashboard = async (req, res) => {
  const landlordId = req.user.id;

  try {
    const [totalRes, monthlyRes, statusRes] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(pay.amount), 0) AS total_rent_collected
         FROM payments pay
         JOIN tenants t ON pay.tenant_id=t.id
         JOIN units u ON t.unit_id=u.id
         JOIN properties p ON u.property_id=p.id
         WHERE p.landlord_id=$1 AND pay.status='success'`,
        [landlordId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(pay.amount), 0) AS monthly_revenue
         FROM payments pay
         JOIN tenants t ON pay.tenant_id=t.id
         JOIN units u ON t.unit_id=u.id
         JOIN properties p ON u.property_id=p.id
         WHERE p.landlord_id=$1
           AND pay.status='success'
           AND EXTRACT(MONTH FROM COALESCE(pay.payment_date, pay.created_at)) = EXTRACT(MONTH FROM CURRENT_DATE)
           AND EXTRACT(YEAR FROM COALESCE(pay.payment_date, pay.created_at)) = EXTRACT(YEAR FROM CURRENT_DATE)`,
        [landlordId]
      ),
      pool.query(
        `SELECT t.id AS tenant_id, t.full_name AS tenant_name,
                COALESCE(MAX(pay.status), 'pending') AS last_payment_status,
                COALESCE(MAX(pay.created_at), NULL) AS last_payment_date
         FROM tenants t
         JOIN units u ON t.unit_id=u.id
         JOIN properties p ON u.property_id=p.id
         LEFT JOIN payments pay ON pay.tenant_id=t.id
         WHERE p.landlord_id=$1
         GROUP BY t.id, t.full_name
         ORDER BY t.full_name`,
        [landlordId]
      ),
    ]);

    return res.json({
      total_rent_collected: Number(totalRes.rows[0].total_rent_collected || 0),
      monthly_revenue: Number(monthlyRes.rows[0].monthly_revenue || 0),
      tenant_payment_status: statusRes.rows,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to fetch earnings dashboard' });
  }
};

exports.runCollectionsAutomationNow = async (req, res) => {
  const landlordId = req.user.id;
  const dryRun = String(req.query.dry_run || req.body?.dry_run || 'false').toLowerCase() === 'true';
  const mode = String(req.query.mode || req.body?.mode || 'all').toLowerCase();

  try {
    const result = await runCollectionsAutomation({ landlordId, dryRun, mode });
    return res.json({
      message: dryRun ? 'Collections automation dry-run complete' : 'Collections automation run complete',
      ...result,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to run collections automation' });
  }
};

exports.submitDirectRentPayment = async (req, res) => {
  const { property_id, amount, payment_method_id, transaction_id } = req.body;
  const user_id = req.user.id;

  if (!amount || !payment_method_id || !transaction_id) {
    return res.status(400).json({ message: 'Missing required fields: amount, payment_method_id, transaction_id' });
  }

  try {
    const tenantRes = await pool.query(
      `SELECT t.id, u.property_id
       FROM tenants t
       JOIN units u ON t.unit_id = u.id
       WHERE t.user_id=$1`,
      [user_id]
    );

    if (!tenantRes.rows.length) return res.status(403).json({ message: 'Not a recognized tenant' });
    const tenant = tenantRes.rows[0];

    const methodRes = await pool.query(`SELECT provider_name, landlord_id FROM landlord_payment_methods WHERE id=$1`, [payment_method_id]);
    if (!methodRes.rows.length) return res.status(404).json({ message: 'Invalid payment method' });

    const result = await pool.query(
      `INSERT INTO payments (tenant_id, property_id, amount, payment_method, transaction_id, status, payment_date, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW()) RETURNING *`,
      [tenant.id, property_id || tenant.property_id, amount, methodRes.rows[0].provider_name || 'direct', transaction_id]
    );

    res.status(201).json({ message: 'Payment submitted for approval', payment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.approveDirectPayment = async (req, res) => {
  const { id } = req.params;
  const landlord_id = req.user.id;
  
  try {
    const updated = await pool.query(
      `UPDATE payments pay
       SET status='success',
           payment_date=NOW()
       FROM tenants t
       JOIN units u ON t.unit_id = u.id
       JOIN properties p ON u.property_id = p.id
       WHERE pay.id=$1 AND pay.tenant_id=t.id AND p.landlord_id=$2
       RETURNING pay.*`,
      [id, landlord_id]
    );

    if (!updated.rows.length) return res.status(404).json({ message: 'Payment not found or unauthorized' });

    const payment = updated.rows[0];

    try {
      const contextRes = await pool.query(
        `SELECT p.id, p.amount, p.payment_method, p.transaction_id, t.full_name AS tenant_name, pr.name AS property_name
         FROM payments p
         JOIN tenants t ON p.tenant_id = t.id
         LEFT JOIN properties pr ON p.property_id = pr.id
         WHERE p.id=$1`,
        [payment.id]
      );
      const context = contextRes.rows[0] || {};
      const receiptNumber = createReceiptNumber(payment.id);
      const receipt = await generateReceipt({
        paymentId: payment.id,
        receiptNumber,
        tenantName: context.tenant_name,
        propertyName: context.property_name,
        amount: context.amount,
        paymentMethod: context.payment_method,
        transactionId: context.transaction_id,
        paidAt: new Date(),
      });
      await pool.query(`UPDATE payments SET receipt_number=$1, receipt_path=$2 WHERE id=$3`, [receiptNumber, receipt.publicPath, payment.id]);
    } catch (e) {
       console.error("Receipt generation failed for direct payment:", e.message);
    }

    res.json({ message: 'Payment approved', payment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

