const pool = require('../config/db');
const { sendAndBillSms } = require('../services/smsBilling.service');

exports.sendSmsNotification = async (req, res) => {
  const userId = req.user.id;
  const { recipient_phone, message, sms_type = 'other', tenant_id = null } = req.body;

  if (!recipient_phone || !message) {
    return res.status(400).json({ message: 'recipient_phone and message are required' });
  }

  try {
    const result = await sendAndBillSms({
      userId,
      phone: recipient_phone,
      message,
      smsType: sms_type,
      tenantId: tenant_id || null,
    });
    res.status(201).json({ message: 'SMS sent', ...result });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: error.message || 'Failed to send SMS' });
  }
};
