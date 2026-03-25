const templates = [
  {
    id: 'payment_failed_sms_and_notification',
    name: 'Payment Failed Follow-up',
    event_type: 'payment_failed',
    conditions: { amount: { gte: 100000 } },
    actions: [
      {
        type: 'notification',
        level: 'error',
        title: 'Payment Failed',
        message: 'Payment failed for {{tenant_name}} amount TZS {{amount}}',
      },
      {
        type: 'sms',
        sms_type: 'payment_confirmation',
        to: '{{tenant_phone}}',
        message: 'Hello {{tenant_name}}, your payment of TZS {{amount}} failed. Please retry.',
      },
    ],
  },
  {
    id: 'maintenance_high_priority_alert',
    name: 'High Priority Maintenance Alert',
    event_type: 'maintenance_created',
    conditions: { priority: { eq: 'high' } },
    actions: [
      {
        type: 'notification',
        level: 'warning',
        title: 'High Priority Maintenance',
        message: 'High priority maintenance created for property {{property_id}}',
      },
    ],
  },
  {
    id: 'payment_success_receipt_nudge',
    name: 'Payment Success Acknowledgement',
    event_type: 'payment_success',
    conditions: {},
    actions: [
      {
        type: 'notification',
        level: 'success',
        title: 'Payment Success',
        message: 'Payment received from {{tenant_name}}: TZS {{amount}}',
      },
      {
        type: 'sms',
        sms_type: 'payment_confirmation',
        to: '{{tenant_phone}}',
        message: 'Asante {{tenant_name}}, payment yako ya TZS {{amount}} imepokelewa.',
      },
    ],
  },
];

exports.getWorkflowTemplates = (_req, res) => {
  res.json(templates);
};
