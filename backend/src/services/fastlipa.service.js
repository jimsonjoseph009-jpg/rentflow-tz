const FASTLIPA_BASE_URL = process.env.FASTLIPA_BASE_URL || 'https://api.fastlipa.com';
const FASTLIPA_PAY_ENDPOINT = process.env.FASTLIPA_PAY_ENDPOINT || '/api/create-transaction';
const FASTLIPA_STATUS_ENDPOINT = process.env.FASTLIPA_STATUS_ENDPOINT || '/api/status-transaction';
const FASTLIPA_API_KEY = process.env.FASTLIPA_API_KEY;
const FASTLIPA_DEBUG = process.env.FASTLIPA_DEBUG === 'true';
const FASTLIPA_INCLUDE_METADATA = process.env.FASTLIPA_INCLUDE_METADATA === 'true';
const fs = require('fs');

const normalizeAmount = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid payment amount');
  }
  return Math.round(amount);
};

const normalizeFastlipaMsisdn = (value) => {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('Phone number is required');

  // FastLipa docs examples use local TZ format (e.g. 0695123456).
  // Accept a few common inputs and normalize.
  const digits = raw.replace(/[^\d+]/g, '');
  const strippedPlus = digits.startsWith('+') ? digits.slice(1) : digits;

  if (strippedPlus.startsWith('255') && strippedPlus.length === 12) {
    return `0${strippedPlus.slice(3)}`;
  }
  if (strippedPlus.startsWith('0') && strippedPlus.length === 10) {
    return strippedPlus;
  }
  // Fallback: keep digits as-is (some accounts may accept 2557XXXXXXXX)
  return strippedPlus;
};

const gatewayMethodAliases = (paymentMethod) => {
  const method = normalizeMethod(paymentMethod);

  if (method === 'yas' || method === 'tigo_pesa') {
    return {
      payment_method: 'tigo_pesa',
      method: 'tigo_pesa',
      channel: 'tigo_pesa',
      network: 'TIGO',
      provider: 'YAS',
    };
  }

  if (method === 'mpesa') {
    return {
      payment_method: 'mpesa',
      method: 'mpesa',
      channel: 'mpesa',
      network: 'MPESA',
      provider: 'MPESA',
    };
  }

  if (method === 'airtel_money') {
    return {
      payment_method: 'airtel_money',
      method: 'airtel_money',
      channel: 'airtel_money',
      network: 'AIRTEL',
      provider: 'AIRTEL',
    };
  }

  if (method === 'halotel') {
    return {
      payment_method: 'halotel',
      method: 'halotel',
      channel: 'halotel',
      network: 'HALOTEL',
      provider: 'HALOTEL',
    };
  }

  if (method === 'nmb_bank' || method === 'crdb_bank') {
    return {
      payment_method: method,
      method,
      channel: method,
      network: method.toUpperCase(),
      provider: method.toUpperCase(),
    };
  }

  return {};
};

const appendGatewayLog = (label, content) => {
  try {
    fs.appendFileSync('/tmp/fastlipa_response.log', `[${new Date().toISOString()}] ${label}\n${content}\n\n`);
  } catch (error) {
    console.error('Failed to log to file', error.message);
  }
};

const normalizeMethod = (method) => {
  const value = String(method || '').toLowerCase();
  const allowed = ['mpesa', 'tigo_pesa', 'yas', 'airtel_money', 'halotel', 'nmb_bank', 'crdb_bank'];
  if (!allowed.includes(value)) {
    throw new Error('Unsupported payment method');
  }
  return value;
};

const createPaymentRequest = async ({ amount, phone, paymentMethod, externalId, successUrl, failedUrl, callbackUrl, customerName }) => {
  if (process.env.FASTLIPA_MOCK === 'true') {
    return {
      payment_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success?reference=${externalId}`,
      transaction_id: `mock-${externalId}`,
      gateway_reference: `MOCK-${Date.now()}`,
      raw: { mock: true },
    };
  }

  if (!FASTLIPA_API_KEY) {
    throw new Error('Fastlipa API key missing. Set FASTLIPA_API_KEY, or use FASTLIPA_MOCK=true for local testing.');
  }

  const normalizedAmount = normalizeAmount(amount);
  const payload = {
    number: normalizeFastlipaMsisdn(phone),
    amount: normalizedAmount,
    name: customerName || 'RentFlow User',
  };

  if (FASTLIPA_INCLUDE_METADATA) {
    const methodPayload = gatewayMethodAliases(paymentMethod);
    payload.currency = process.env.FASTLIPA_CURRENCY || 'TZS';
    payload.external_id = externalId;
    payload.callback_url = callbackUrl;
    Object.assign(payload, methodPayload);
  }

  const requestUrl = new URL(FASTLIPA_PAY_ENDPOINT, FASTLIPA_BASE_URL).toString();
  if (FASTLIPA_DEBUG) {
    console.log('[fastlipa] request', { 
      url: requestUrl, 
      externalId, 
      amount: payload.amount, 
      number: payload.number,
      payment_method: payload.payment_method,
      network: payload.network,
      callback_url: payload.callback_url 
    });
  }

  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FASTLIPA_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  appendGatewayLog(`REQUEST ${requestUrl}`, `Body: ${JSON.stringify(payload)}`);

  const rawText = await response.text();
  appendGatewayLog(`${requestUrl} status: ${response.status}`, `Body: ${rawText}`);
  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch (parseError) {
    console.error('[fastlipa] JSON parse error', { rawText, error: parseError.message });
    if (!response.ok) {
      throw new Error(
        `Fastlipa returned non-JSON response (HTTP ${response.status}) from ${requestUrl}. Check FASTLIPA_BASE_URL/FASTLIPA_PAY_ENDPOINT.`
      );
    }
    throw new Error('Fastlipa returned non-JSON success response; unable to read payment_url.');
  }

  if (FASTLIPA_DEBUG) {
    console.log('[fastlipa] parsed data', data);
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || `Fastlipa payment request failed (HTTP ${response.status})`);
  }

  const txnId = data.data?.tranID || data.data?.transaction_id || data.tranid || data.transaction_id || data.txn_id || data.id || null;
  const ref = data.data?.gateway_reference || data.data?.reference || data.gateway_reference || data.reference || data.ref || null;
  const url = data.data?.payment_url || data.data?.checkout_url || data.payment_url || data.checkout_url || data.url || null;

  if (FASTLIPA_DEBUG && !txnId) {
    console.warn('[fastlipa] Warning: No transaction ID found in response', data);
  }

  return {
    payment_url: url,
    transaction_id: txnId,
    gateway_reference: ref,
    raw: data,
  };
};

const verifyCallbackSignature = () => {
  // API-key-only authentication relies on the transaction API to confirm status
  // Webhooks are trusted by matching transaction IDs with existing database records
  return true;
};

const verifyPayment = async (tranId) => {
  if (process.env.FASTLIPA_MOCK === 'true') {
    // In mock mode, pretend 80% succeeded and 20% are still 'pending' to see cron working
    return {
      status: Math.random() > 0.2 ? 'success' : 'pending',
      transaction_id: `mock-verf-${tranId}-${Date.now()}`,
      gateway_reference: `verify-${Date.now()}`,
    };
  }

  if (!FASTLIPA_API_KEY) {
    throw new Error('Fastlipa API key missing');
  }

  try {
    const url = new URL(`${FASTLIPA_STATUS_ENDPOINT}?tranid=${encodeURIComponent(String(tranId))}`, FASTLIPA_BASE_URL).toString();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${FASTLIPA_API_KEY}`,
      },
    });

    const rawText = await response.text();
    appendGatewayLog(`VERIFY ${url} status: ${response.status}`, `Body: ${rawText}`);
    if (FASTLIPA_DEBUG) console.log(`[fastlipa verify response] ${url}`, rawText);

    let data = {};
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error('[fastlipa verify] JSON parse error', e.message);
      return { status: 'pending' };
    }

    const payload = data.data || data; // Handle nested or flat response
    let mappedStatus = 'pending';
    const statusStr = String(payload.payment_status || payload.status || payload.transaction_status || '').toUpperCase();
    
    if (['SUCCESS', 'COMPLETED', 'SUCCESSFUL'].includes(statusStr)) mappedStatus = 'success';
    if (['FAILED', 'CANCELLED', 'CANCELED', 'DECLINED', 'ERROR'].includes(statusStr)) mappedStatus = 'failed';

    return {
      status: mappedStatus,
      transaction_id: payload.tranID || payload.tranid || payload.transaction_id || payload.txn_id || null,
      gateway_reference: payload.gateway_reference || payload.reference || null,
      raw: data
    };
  } catch (error) {
    if (FASTLIPA_DEBUG) console.error('[fastlipa verify failed]', error);
    return { status: 'pending' }; // Return pending on network errors so cron retries
  }
};

module.exports = {
  createPaymentRequest,
  normalizeMethod,
  verifyCallbackSignature,
  verifyPayment,
};
