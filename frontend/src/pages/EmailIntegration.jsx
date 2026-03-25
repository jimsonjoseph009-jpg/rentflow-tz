import { useState } from 'react';
import Navbar from '../components/Navbar';
import { useTheme } from '../context/ThemeContext';
import axios from '../utils/axiosConfig';
import { useNotification } from '../context/NotificationContext';

export default function EmailIntegration() {
  const { isDark } = useTheme();
  const notify = useNotification();
  const [selectedTemplate, setSelectedTemplate] = useState('rent-reminder');
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    amount: '',
    dueDate: '',
    propertyName: '',
    expirationDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const bgColor = isDark ? '#1a1a1a' : '#f5f5f5';
  const cardColor = isDark ? '#2a2a2a' : 'white';
  const textColor = isDark ? '#e0e0e0' : '#333';
  const borderColor = isDark ? '#444' : '#ddd';
  const inputBg = isDark ? '#333' : '#f9f9f9';

  const templates = [
    {
      id: 'rent-reminder',
      name: 'Rent Payment Reminder',
      description: 'Send a reminder to tenant about upcoming rent payment',
      icon: '💰',
      fields: ['email', 'name', 'amount', 'dueDate']
    },
    {
      id: 'payment-receipt',
      name: 'Payment Receipt',
      description: 'Confirm payment received and provide receipt',
      icon: '📄',
      fields: ['email', 'name', 'amount']
    },
    {
      id: 'lease-expiration',
      name: 'Lease Expiration Notice',
      description: 'Notify tenant about lease expiration',
      icon: '⚠️',
      fields: ['email', 'name', 'propertyName', 'expirationDate']
    },
    {
      id: 'maintenance',
      name: 'Maintenance Request',
      description: 'Confirm maintenance request received',
      icon: '🔧',
      fields: ['email', 'name', 'propertyName']
    },
    {
      id: 'welcome',
      name: 'Welcome Email',
      description: 'Send welcome email to new tenant',
      icon: '👋',
      fields: ['email', 'name', 'propertyName']
    }
  ];

  const currentTemplate = templates.find(t => t.id === selectedTemplate);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setMessage('');
    setError('');
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setMessage('');

      if (!formData.email) {
        setError('Email address is required');
        return;
      }

      const now = new Date();
      const endpointByTemplate = {
        'rent-reminder': '/email/send-rent-reminder',
        'payment-receipt': '/email/send-payment-receipt',
        'lease-expiration': '/email/send-lease-expiration',
        maintenance: '/email/send-maintenance-notification',
        welcome: '/email/send-welcome',
      };

      const endpoint = endpointByTemplate[selectedTemplate];
      if (!endpoint) {
        setError('Unknown template');
        return;
      }

      const payloadByTemplate = {
        'rent-reminder': {
          email: formData.email,
          name: formData.name,
          amount: formData.amount,
          dueDate: formData.dueDate,
        },
        'payment-receipt': {
          email: formData.email,
          name: formData.name,
          amount: formData.amount,
          date: now.toISOString().slice(0, 10),
          receiptId: '',
        },
        'lease-expiration': {
          email: formData.email,
          name: formData.name,
          propertyName: formData.propertyName,
          expirationDate: formData.expirationDate,
        },
        maintenance: {
          email: formData.email,
          name: formData.name,
          propertyName: formData.propertyName,
          description: 'Maintenance request received',
        },
        welcome: {
          email: formData.email,
          name: formData.name,
          propertyName: formData.propertyName,
        },
      };

      await axios.post(endpoint, payloadByTemplate[selectedTemplate]);

      setMessage(`✓ Email sent successfully to ${formData.email}!`);
      notify.success('Email', `Sent to ${formData.email}`);
      
      // Reset form
      setFormData({
        email: '',
        name: '',
        amount: '',
        dueDate: '',
        propertyName: '',
        expirationDate: ''
      });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send email. Please try again.';
      setError(msg);
      notify.error('Email', msg);
    } finally {
      setLoading(false);
    }
  };

  const emailTemplates = {
    'rent-reminder': {
      subject: `Rent Payment Reminder - ${formData.dueDate}`,
      body: `Dear ${formData.name || '[Tenant Name]'},

This is a friendly reminder that your rent payment of ${formData.amount || '[Amount]'} TZS is due on ${formData.dueDate || '[Due Date]'}.

Please ensure payment is made on time to avoid late fees.

If you have any questions or need assistance, please don't hesitate to contact us.

Best regards,
RentFlow-TZ Team`
    },
    'payment-receipt': {
      subject: 'Payment Receipt Confirmation',
      body: `Dear ${formData.name || '[Tenant Name]'},

Thank you for your payment! We have received your payment of ${formData.amount || '[Amount]'} TZS.

Your receipt is attached to this email. Please keep it for your records.

If you have any questions, please contact us.

Best regards,
RentFlow-TZ Team`
    },
    'lease-expiration': {
      subject: `Lease Expiration Notice - ${formData.expirationDate}`,
      body: `Dear ${formData.name || '[Tenant Name]'},

This is to inform you that your lease for ${formData.propertyName || '[Property Name]'} will expire on ${formData.expirationDate || '[Date]'}.

Please contact us to discuss renewal options or next steps.

Best regards,
RentFlow-TZ Team`
    },
    'maintenance': {
      subject: 'Maintenance Request Received',
      body: `Dear ${formData.name || '[Name]'},

We have received your maintenance request for ${formData.propertyName || '[Property]'}.

Our team will review it shortly and contact you with updates.

Reference ID: MNT-${Date.now()}

Best regards,
RentFlow-TZ Team`
    },
    'welcome': {
      subject: `Welcome to ${formData.propertyName || '[Property]'}!`,
      body: `Dear ${formData.name || '[Tenant Name]'},

Welcome to your new home at ${formData.propertyName || '[Property Name]'}!

We are delighted to have you as our tenant. If you need anything or have any questions, please don't hesitate to reach out.

Best regards,
RentFlow-TZ Team`
    }
  };

  const currentEmailTemplate = emailTemplates[selectedTemplate];

  const StatCard = ({ title, value, icon, color }) => (
    <div style={{
      background: cardColor,
      padding: "20px",
      borderRadius: "10px",
      boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.1)",
      flex: "1",
      minWidth: "200px",
      border: `2px solid ${color}20`
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ color: textColor + '99', fontSize: "12px", marginBottom: "8px", textTransform: "uppercase" }}>
            {title}
          </p>
          <p style={{ fontSize: "28px", fontWeight: "bold", color: color }}>{value}</p>
        </div>
        <div style={{ fontSize: "32px" }}>{icon}</div>
      </div>
    </div>
  );

  const InputField = ({ label, name, value, onChange, type = "text" }) => (
    <div style={{ marginBottom: "15px" }}>
      <label style={{
        display: "block",
        marginBottom: "8px",
        color: textColor,
        fontWeight: "500",
        fontSize: "14px"
      }}>
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={currentTemplate?.fields.includes(name)}
        style={{
          width: "100%",
          padding: "12px",
          border: `1px solid ${borderColor}`,
          borderRadius: "5px",
          fontSize: "14px",
          background: inputBg,
          color: textColor,
          boxSizing: "border-box"
        }}
      />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: bgColor }}>
      <Navbar />
      
      <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "10px", color: textColor }}>
          📧 Email Integration & Templates
        </h1>
        <p style={{ color: textColor + '99', marginBottom: "30px" }}>
          Send automated emails to tenants, payment reminders, receipts, and notifications
        </p>

        {message && (
          <div style={{
            background: "#4CAF50",
            color: "white",
            padding: "12px",
            borderRadius: "5px",
            marginBottom: "20px"
          }}>
            {message}
          </div>
        )}

        {error && (
          <div style={{
            background: "#f44336",
            color: "white",
            padding: "12px",
            borderRadius: "5px",
            marginBottom: "20px"
          }}>
            {error}
          </div>
        )}

        {/* Summary Stats */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px",
          marginBottom: "40px"
        }}>
          <StatCard title="Email Templates" value={templates.length} icon="📧" color="#667eea" />
          <StatCard title="Available Features" value="7" icon="⚙️" color="#4CAF50" />
          <StatCard title="Integration" value="Active" icon="✓" color="#2196F3" />
        </div>

        {/* Template Selection */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "15px",
          marginBottom: "40px"
        }}>
          {templates.map(template => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              style={{
                padding: "20px",
                background: selectedTemplate === template.id ? cardColor : cardColor,
                border: selectedTemplate === template.id ? `2px solid #667eea` : `1px solid ${borderColor}`,
                borderRadius: "10px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.3s ease",
                boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.1)",
                opacity: selectedTemplate === template.id ? 1 : 0.7
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = isDark ? "0 4px 12px rgba(0,0,0,0.4)" : "0 4px 12px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.1)";
              }}
            >
              <p style={{ fontSize: "28px", margin: "0 0 10px 0" }}>{template.icon}</p>
              <p style={{ fontSize: "16px", fontWeight: "bold", color: textColor, margin: "0 0 5px 0" }}>
                {template.name}
              </p>
              <p style={{ fontSize: "13px", color: textColor + '99', margin: 0 }}>
                {template.description}
              </p>
            </button>
          ))}
        </div>

        {/* Email Composition */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginBottom: "40px"
        }}>
          {/* Form */}
          <div style={{
            background: cardColor,
            padding: "25px",
            borderRadius: "10px",
            boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ fontSize: "20px", fontWeight: "bold", color: textColor, marginBottom: "20px" }}>
              {currentTemplate?.icon} {currentTemplate?.name}
            </h3>
            <form onSubmit={handleSendEmail}>
              <InputField
                label="Recipient Email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                type="email"
              />
              <InputField
                label="Recipient Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
              />
              {currentTemplate?.fields.includes('amount') && (
                <InputField
                  label="Amount (TZS)"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  type="number"
                />
              )}
              {currentTemplate?.fields.includes('dueDate') && (
                <InputField
                  label="Due Date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  type="date"
                />
              )}
              {currentTemplate?.fields.includes('propertyName') && (
                <InputField
                  label="Property Name"
                  name="propertyName"
                  value={formData.propertyName}
                  onChange={handleInputChange}
                />
              )}
              {currentTemplate?.fields.includes('expirationDate') && (
                <InputField
                  label="Expiration Date"
                  name="expirationDate"
                  value={formData.expirationDate}
                  onChange={handleInputChange}
                  type="date"
                />
              )}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: loading ? "#999" : "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: loading ? "not-allowed" : "pointer"
                }}
              >
                {loading ? "Sending..." : "Send Email"}
              </button>
            </form>
          </div>

          {/* Preview */}
          <div style={{
            background: cardColor,
            padding: "25px",
            borderRadius: "10px",
            boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ fontSize: "20px", fontWeight: "bold", color: textColor, marginBottom: "20px" }}>
              📧 Email Preview
            </h3>
            <div style={{
              background: isDark ? '#333' : '#f5f5f5',
              padding: "20px",
              borderRadius: "5px",
              border: `1px solid ${borderColor}`
            }}>
              <p style={{ color: textColor + '99', fontSize: "12px", marginBottom: "10px" }}>
                <strong>Subject:</strong>
              </p>
              <p style={{
                color: textColor,
                fontSize: "14px",
                fontWeight: "bold",
                marginBottom: "20px",
                padding: "10px",
                background: isDark ? '#2a2a2a' : 'white',
                borderRadius: "4px"
              }}>
                {currentEmailTemplate?.subject}
              </p>
              <p style={{ color: textColor + '99', fontSize: "12px", marginBottom: "10px" }}>
                <strong>Body:</strong>
              </p>
              <p style={{
                color: textColor,
                fontSize: "14px",
                lineHeight: "1.6",
                padding: "10px",
                background: isDark ? '#2a2a2a' : 'white',
                borderRadius: "4px",
                whiteSpace: "pre-wrap",
                wordWrap: "break-word"
              }}>
                {currentEmailTemplate?.body}
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div style={{
          background: cardColor,
          padding: "25px",
          borderRadius: "10px",
          boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <h3 style={{ fontSize: "20px", fontWeight: "bold", color: textColor, marginBottom: "20px" }}>
            🚀 Email Features
          </h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "15px"
          }}>
            <div style={{ padding: "15px", background: isDark ? '#333' : '#f5f5f5', borderRadius: "5px" }}>
              <p style={{ fontSize: "20px", margin: "0 0 8px 0" }}>✉️</p>
              <p style={{ color: textColor, fontWeight: "bold", margin: "0 0 5px 0" }}>Automated Reminders</p>
              <p style={{ color: textColor + '99', fontSize: "13px", margin: 0 }}>Send automatic rent payment reminders</p>
            </div>
            <div style={{ padding: "15px", background: isDark ? '#333' : '#f5f5f5', borderRadius: "5px" }}>
              <p style={{ fontSize: "20px", margin: "0 0 8px 0" }}>📄</p>
              <p style={{ color: textColor, fontWeight: "bold", margin: "0 0 5px 0" }}>Receipt Generation</p>
              <p style={{ color: textColor + '99', fontSize: "13px", margin: 0 }}>Automatically generate and email receipts</p>
            </div>
            <div style={{ padding: "15px", background: isDark ? '#333' : '#f5f5f5', borderRadius: "5px" }}>
              <p style={{ fontSize: "20px", margin: "0 0 8px 0" }}>📅</p>
              <p style={{ color: textColor, fontWeight: "bold", margin: "0 0 5px 0" }}>Lease Notifications</p>
              <p style={{ color: textColor + '99', fontSize: "13px", margin: 0 }}>Notify about expiring leases</p>
            </div>
            <div style={{ padding: "15px", background: isDark ? '#333' : '#f5f5f5', borderRadius: "5px" }}>
              <p style={{ fontSize: "20px", margin: "0 0 8px 0" }}>📧</p>
              <p style={{ color: textColor, fontWeight: "bold", margin: "0 0 5px 0" }}>Bulk Mailing</p>
              <p style={{ color: textColor + '99', fontSize: "13px", margin: 0 }}>Send emails to multiple recipients</p>
            </div>
            <div style={{ padding: "15px", background: isDark ? '#333' : '#f5f5f5', borderRadius: "5px" }}>
              <p style={{ fontSize: "20px", margin: "0 0 8px 0" }}>⏰</p>
              <p style={{ color: textColor, fontWeight: "bold", margin: "0 0 5px 0" }}>Scheduled Emails</p>
              <p style={{ color: textColor + '99', fontSize: "13px", margin: 0 }}>Schedule emails for future delivery</p>
            </div>
            <div style={{ padding: "15px", background: isDark ? '#333' : '#f5f5f5', borderRadius: "5px" }}>
              <p style={{ fontSize: "20px", margin: "0 0 8px 0" }}>📊</p>
              <p style={{ color: textColor, fontWeight: "bold", margin: "0 0 5px 0" }}>Email Tracking</p>
              <p style={{ color: textColor + '99', fontSize: "13px", margin: 0 }}>Track email opens and delivery</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
