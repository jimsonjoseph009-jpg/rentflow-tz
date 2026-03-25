const parseJsonSafe = async (response) => {
  const raw = await response.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return { raw };
  }
};

const sendViaBeem = async ({ phone, message }) => {
  const apiKey = process.env.BEEM_API_KEY;
  const secretKey = process.env.BEEM_SECRET_KEY;
  const sourceAddr = process.env.BEEM_SOURCE_ADDR || 'INFO';
  const endpoint = process.env.BEEM_SMS_URL || 'https://apisms.beem.africa/v1/send';

  if (!apiKey || !secretKey) {
    throw new Error('Missing Beem credentials: BEEM_API_KEY and BEEM_SECRET_KEY are required');
  }

  const token = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');

  const payload = {
    source_addr: sourceAddr,
    schedule_time: '',
    encoding: 0,
    message,
    recipients: [{ recipient_id: String(Date.now()), dest_addr: phone }],
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(data.message || data.error || `Beem SMS failed (HTTP ${response.status})`);
  }

  const providerId =
    data?.data?.messages?.[0]?.message_id ||
    data?.messages?.[0]?.message_id ||
    data?.message_id ||
    `beem-${Date.now()}`;

  return {
    provider_message_id: String(providerId),
    status: 'sent',
    provider_response: data,
  };
};

const sendViaGeneric = async ({ phone, message }) => {
  const gatewayUrl = process.env.SMS_GATEWAY_URL;
  const apiKey = process.env.SMS_GATEWAY_API_KEY || '';

  if (!gatewayUrl) {
    throw new Error('SMS_GATEWAY_URL is not configured');
  }

  const response = await fetch(gatewayUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ to: phone, message }),
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(data.message || `SMS gateway failed (HTTP ${response.status})`);
  }

  return {
    provider_message_id: data.message_id || data.id || `generic-${Date.now()}`,
    status: 'sent',
    provider_response: data,
  };
};

const sendSms = async ({ phone, message }) => {
  const provider = (process.env.SMS_PROVIDER || 'mock').toLowerCase();

  if (process.env.SMS_MOCK === 'true' || provider === 'mock') {
    return {
      provider_message_id: `mock-sms-${Date.now()}`,
      status: 'sent',
      provider_response: { provider: 'mock' },
    };
  }

  if (provider === 'beem') {
    return sendViaBeem({ phone, message });
  }

  return sendViaGeneric({ phone, message });
};

module.exports = {
  sendSms,
};
