-- Top 5 ROI modern pack schema

CREATE TABLE IF NOT EXISTS activity_events (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id INT REFERENCES tenants(id) ON DELETE SET NULL,
  property_id INT REFERENCES properties(id) ON DELETE SET NULL,
  event_type VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  source VARCHAR(40) NOT NULL DEFAULT 'system',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id INT REFERENCES tenants(id) ON DELETE SET NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS tenant_id INT REFERENCES tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activity_events_user_tenant ON activity_events(user_id, tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_user_property ON activity_events(user_id, property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_created ON email_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_user_tenant ON sms_logs(user_id, tenant_id, created_at DESC);
