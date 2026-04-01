const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { observeRequest } = require('./services/observability.service');
const { ensureOptionalTables, ensureSaasTables } = require('./services/schemaBootstrap.service');
const { initCronJobs } = require('./services/cronJobs.service');
require('dotenv').config();

// Auto-create DB tables on boot
ensureOptionalTables().catch((err) => console.error('[boot] ensureOptionalTables error:', err.message));
ensureSaasTables().catch((err) => console.error('[boot] ensureSaasTables error:', err.message));

// Start cron jobs
initCronJobs();

const app = express();

const bodyLimit = process.env.REQUEST_BODY_LIMIT || '50mb';
app.use(
  express.json({
    limit: bodyLimit,
    verify: (req, _res, buf) => {
      // Used for webhook signature verification (Fastlipa callbacks).
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));
app.use(cookieParser());
const allowedOrigins = [
  ...(process.env.FRONTEND_URL || '').split(',').map((origin) => origin.trim()),
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes('*') || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS blocked: origin not allowed'));
    },
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan('dev'));
app.use(observeRequest);

const globalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'rentflow-backend',
    timestamp: new Date().toISOString(),
  });
});

// Private receipts (PDFs). Requires auth + ownership check.
const receiptsRoutes = require('./routes/receipts.routes');
app.use('/receipts', receiptsRoutes);

// Public avatars (unguessable filenames). Used in profile UI <img> tags.
app.use(
  '/avatars',
  (_req, res, next) => {
    // Allow the frontend origin (e.g. localhost:3000) to load images from the backend origin (e.g. localhost:5000).
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(path.join(__dirname, '../storage/avatars'))
);

// Public voice note audio (unguessable filenames). Used in voice notes UI <audio> tags.
app.use(
  '/voice-notes-audio',
  (_req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(path.join(__dirname, '../storage/voice-notes'))
);

// Public chat media (unguessable filenames). Used in chat UI <img> and <video> tags.
app.use(
  '/chat-media',
  (_req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(path.join(__dirname, '../storage/chat-media'))
);

// Auth routes
const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);
// Dashboard route
const dashboardRoutes = require('./routes/dashboard.routes');
app.use('/api/dashboard', dashboardRoutes);
// property routes
const propertyRoutes = require('./routes/property.routes');
app.use('/api/properties', propertyRoutes);
// units routes
const unitRoutes = require('./routes/unit.routes');
app.use('/api/units', unitRoutes);
// tenantroutes
const tenantRoutes = require('./routes/tenant.routes');
app.use('/api/tenants', tenantRoutes);
// payment routes
const paymentRoutes = require('./routes/payment.routes');
app.use('/api/payments', paymentRoutes);

// payment methods
const paymentMethodsRoutes = require('./routes/paymentMethods.routes');
app.use('/api/payment-methods', paymentMethodsRoutes);

// NEW FEATURE ROUTES (15 Features)
const maintenanceTrackerRoutes = require('./routes/maintenance.routes');
app.use('/api/maintenance', maintenanceTrackerRoutes);

const emailRoutes = require('./routes/email.routes');
app.use('/api/email', emailRoutes);

// Tenant Rating routes
const tenantRatingRoutes = require('./routes/tenantRating.routes');
app.use('/api/tenant-ratings', tenantRatingRoutes);
// Payment Alerts routes
const paymentAlertsRoutes = require('./routes/paymentAlerts.routes');
app.use('/api/payment-alerts', paymentAlertsRoutes);
// Occupancy Forecast routes
const occupancyRoutes = require('./routes/occupancyForecast.routes');
app.use('/api/occupancy', occupancyRoutes);
app.use('/api/occupancy-forecast', occupancyRoutes);
// Utility Meters routes
const utilityMetersRoutes = require('./routes/utilityMeters.routes');
app.use('/api/utility-meters', utilityMetersRoutes);
// Maintenance Inventory routes
const maintenanceRoutes = require('./routes/maintenanceInventory.routes');
app.use('/api/maintenance-inventory', maintenanceRoutes);
// Visitor Log routes
const visitorLogRoutes = require('./routes/visitorLog.routes');
app.use('/api/visitor-logs', visitorLogRoutes);
app.use('/api/visitor-log', visitorLogRoutes);
// Tax Deductions routes
const taxDeductionsRoutes = require('./routes/taxDeductions.routes');
app.use('/api/tax-deductions', taxDeductionsRoutes);
// QR Inspections routes
const qrInspectionsRoutes = require('./routes/qrInspections.routes');
app.use('/api/qr-inspections', qrInspectionsRoutes);
// Voice Notes routes
const voiceNotesRoutes = require('./routes/voiceNotes.routes');
app.use('/api/voice-notes', voiceNotesRoutes);
// Emergency Contacts routes
const emergencyContactsRoutes = require('./routes/emergencyContacts.routes');
app.use('/api/emergency-contacts', emergencyContactsRoutes);
// Landlord Network routes
const landlordNetworkRoutes = require('./routes/landlordNetwork.routes');
app.use('/api/landlord-network', landlordNetworkRoutes);
// Pet Policy routes
const petPolicyRoutes = require('./routes/petPolicy.routes');
app.use('/api/pet-policies', petPolicyRoutes);
app.use('/api/pet-policy', petPolicyRoutes);
// Vehicle Management routes
const vehicleManagementRoutes = require('./routes/vehicleManagement.routes');
app.use('/api/vehicles', vehicleManagementRoutes);
app.use('/api/vehicle-management', vehicleManagementRoutes);
// Insurance/Warranty routes
const insuranceWarrantyRoutes = require('./routes/insuranceWarranty.routes');
app.use('/api/insurance-warranty', insuranceWarrantyRoutes);
// Dispute Log routes
const disputeLogRoutes = require('./routes/disputeLog.routes');
app.use('/api/disputes', disputeLogRoutes);
app.use('/api/dispute-log', disputeLogRoutes);

// SaaS monetization routes
const plansRoutes = require('./routes/plans.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const billingRoutes = require('./routes/billing.routes');
const smsRoutes = require('./routes/sms.routes');
const aiRoutes = require('./routes/ai.routes');
const adminMonetizationRoutes = require('./routes/adminMonetization.routes');
const enterpriseRoutes = require('./routes/enterprise.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const workflowRoutes = require('./routes/workflow.routes');
const copilotRoutes = require('./routes/copilot.routes');
const timelineRoutes = require('./routes/timeline.routes');
const workflowTemplatesRoutes = require('./routes/workflowTemplates.routes');
const metricsRoutes = require('./routes/metrics.routes');
const insightsRoutes = require('./routes/insights.routes');
const marketplaceRoutes = require('./routes/marketplace.routes');
const teamMembersRoutes = require('./routes/teamMembers.routes');
const payLinksRoutes = require('./routes/payLinks.routes');
const publicPayLinksRoutes = require('./routes/publicPayLinks.routes');
const chatRoutes = require('./routes/chat.routes');
const tenantInvitesRoutes = require('./routes/tenantInvites.routes');
const publicTenantInvitesRoutes = require('./routes/publicTenantInvites.routes');

app.use('/api/plans', plansRoutes);
app.use('/api/subscribe', subscriptionRoutes);
app.use('/api/subscription-status', subscriptionRoutes);

// Official Fastlipa webhook endpoint — Fastlipa POSTs here after customer enters PIN
const { subscriptionCallback } = require('./controllers/subscription.controller');
app.post('/api/payments/webhook', subscriptionCallback);

app.use('/api', billingRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminMonetizationRoutes);
app.use('/api/enterprise', enterpriseRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/copilot', copilotRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/workflow-templates', workflowTemplatesRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/team-members', teamMembersRoutes);
app.use('/api/paylinks', payLinksRoutes);
app.use('/api/public/paylinks', publicPayLinksRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tenant-invites', tenantInvitesRoutes);
app.use('/api/public/tenant-invites', publicTenantInvitesRoutes);

app.use((error, _req, res, next) => {
  console.error('[Unhandled Error]', error.message || error);
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Uploaded media is too large. Please use a smaller file.' });
  }
  if (res.headersSent) {
    return next(error);
  }
  return res.status(500).json({ message: 'Internal Server Error' });
});

module.exports = app;
