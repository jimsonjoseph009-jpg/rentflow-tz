import axios from '../utils/axiosConfig';

const emailService = {
  /**
   * Send rent reminder email to tenant
   */
  sendRentReminder: async (tenantEmail, tenantName, amount, dueDate) => {
    try {
      const response = await axios.post('/email/send-rent-reminder', {
        email: tenantEmail,
        name: tenantName,
        amount,
        dueDate
      });
      return response.data;
    } catch (error) {
      console.error('Error sending rent reminder:', error);
      throw error;
    }
  },

  /**
   * Send payment receipt email
   */
  sendPaymentReceipt: async (tenantEmail, tenantName, amount, date, receiptId) => {
    try {
      const response = await axios.post('/email/send-payment-receipt', {
        email: tenantEmail,
        name: tenantName,
        amount,
        date,
        receiptId
      });
      return response.data;
    } catch (error) {
      console.error('Error sending payment receipt:', error);
      throw error;
    }
  },

  /**
   * Send lease expiration notice
   */
  sendLeaseExpirationNotice: async (tenantEmail, tenantName, propertyName, expirationDate) => {
    try {
      const response = await axios.post('/email/send-lease-expiration', {
        email: tenantEmail,
        name: tenantName,
        propertyName,
        expirationDate
      });
      return response.data;
    } catch (error) {
      console.error('Error sending lease expiration notice:', error);
      throw error;
    }
  },

  /**
   * Send maintenance request notification
   */
  sendMaintenanceNotification: async (email, name, propertyName, description) => {
    try {
      const response = await axios.post('/email/send-maintenance-notification', {
        email,
        name,
        propertyName,
        description
      });
      return response.data;
    } catch (error) {
      console.error('Error sending maintenance notification:', error);
      throw error;
    }
  },

  /**
   * Generate and send invoice email
   */
  sendInvoice: async (tenantEmail, tenantName, invoiceData) => {
    try {
      const response = await axios.post('/email/send-invoice', {
        email: tenantEmail,
        name: tenantName,
        ...invoiceData
      });
      return response.data;
    } catch (error) {
      console.error('Error sending invoice:', error);
      throw error;
    }
  },

  /**
   * Send bulk emails to multiple recipients
   */
  sendBulkEmail: async (recipients, subject, message) => {
    try {
      const response = await axios.post('/email/send-bulk', {
        recipients,
        subject,
        message
      });
      return response.data;
    } catch (error) {
      console.error('Error sending bulk email:', error);
      throw error;
    }
  },

  /**
   * Schedule email to be sent later
   */
  scheduleEmail: async (email, subject, message, scheduledTime) => {
    try {
      const response = await axios.post('/email/schedule', {
        email,
        subject,
        message,
        scheduledTime
      });
      return response.data;
    } catch (error) {
      console.error('Error scheduling email:', error);
      throw error;
    }
  }
};

export default emailService;
