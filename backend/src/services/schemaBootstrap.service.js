const pool = require('../config/db');

let ready = false;
let saasReady = false;

const ensureOptionalTables = async () => {
  if (ready) return;

  await pool.query(`
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_user_id_unique ON tenants(user_id) WHERE user_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS marketplace_listings (
      id SERIAL PRIMARY KEY,
      landlord_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(50) NOT NULL DEFAULT 'apartment',
      listing_type VARCHAR(50) NOT NULL DEFAULT 'rent',
      price_tzs NUMERIC(12,2) NOT NULL DEFAULT 0,
      location VARCHAR(255),
      media_type VARCHAR(20) NOT NULL DEFAULT 'image',
      media_url TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_marketplace_landlord_id ON marketplace_listings(landlord_id);
    CREATE INDEX IF NOT EXISTS idx_marketplace_active ON marketplace_listings(is_active);

    CREATE TABLE IF NOT EXISTS team_members (
      id SERIAL PRIMARY KEY,
      landlord_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name VARCHAR(120) NOT NULL,
      email VARCHAR(160) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'manager',
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      permissions JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (landlord_id, email)
    );

    CREATE INDEX IF NOT EXISTS idx_team_members_landlord_id ON team_members(landlord_id);

    CREATE TABLE IF NOT EXISTS pay_links (
      id SERIAL PRIMARY KEY,
      token VARCHAR(120) NOT NULL UNIQUE,
      landlord_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      amount NUMERIC(12,2) NOT NULL,
      currency VARCHAR(8) NOT NULL DEFAULT 'TZS',
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP,
      used_payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
      used_at TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_pay_links_token ON pay_links(token);
    CREATE INDEX IF NOT EXISTS idx_pay_links_landlord_id ON pay_links(landlord_id);
    CREATE INDEX IF NOT EXISTS idx_pay_links_tenant_id ON pay_links(tenant_id);

    CREATE TABLE IF NOT EXISTS chat_threads (
      id SERIAL PRIMARY KEY,
      landlord_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      last_message_at TIMESTAMP,
      UNIQUE (landlord_id, tenant_id)
    );

    CREATE INDEX IF NOT EXISTS idx_chat_threads_landlord_id ON chat_threads(landlord_id);
    CREATE INDEX IF NOT EXISTS idx_chat_threads_tenant_id ON chat_threads(tenant_id);

    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      thread_id INTEGER NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
      sender_type VARCHAR(20) NOT NULL,
      body TEXT,
      media_url TEXT,
      media_type VARCHAR(20),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    ALTER TABLE chat_messages ALTER COLUMN body DROP NOT NULL;
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS media_url TEXT;
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS media_type VARCHAR(20);

    CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON chat_messages(thread_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

    CREATE TABLE IF NOT EXISTS tenant_chat_links (
      id SERIAL PRIMARY KEY,
      token VARCHAR(120) NOT NULL UNIQUE,
      thread_id INTEGER NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_tenant_chat_links_token ON tenant_chat_links(token);

    CREATE TABLE IF NOT EXISTS tenant_invites (
      id SERIAL PRIMARY KEY,
      token VARCHAR(120) NOT NULL UNIQUE,
      landlord_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP,
      used_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      used_at TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_tenant_invites_token ON tenant_invites(token);
    CREATE INDEX IF NOT EXISTS idx_tenant_invites_landlord_id ON tenant_invites(landlord_id);
    CREATE INDEX IF NOT EXISTS idx_tenant_invites_tenant_id ON tenant_invites(tenant_id);

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

    CREATE INDEX IF NOT EXISTS idx_activity_events_user_tenant ON activity_events(user_id, tenant_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_activity_events_user_property ON activity_events(user_id, property_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_email_logs_user_created ON email_logs(user_id, created_at DESC);
  `);

  ready = true;
};

const ensureSaasTables = async () => {
  if (saasReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS plans (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      price_monthly DECIMAL(12,2) NOT NULL DEFAULT 0,
      price_yearly DECIMAL(12,2) NOT NULL DEFAULT 0,
      property_limit INT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS plan_features (
      id SERIAL PRIMARY KEY,
      plan_id INT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
      feature_key VARCHAR(100) NOT NULL,
      feature_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id INT NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
      billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
      amount DECIMAL(12,2) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','trial','cancelled')),
      starts_at TIMESTAMP,
      ends_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      plan_id INT REFERENCES plans(id) ON DELETE SET NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'trial' CHECK (status IN ('active','expired','trial','cancelled')),
      billing_cycle VARCHAR(20) CHECK (billing_cycle IN ('monthly','yearly')),
      started_at TIMESTAMP,
      expires_at TIMESTAMP,
      cancelled_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS billing_history (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subscription_id INT REFERENCES subscriptions(id) ON DELETE SET NULL,
      billing_type VARCHAR(30) NOT NULL CHECK (billing_type IN ('subscription','transaction_fee','sms_topup')),
      amount DECIMAL(12,2) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'TZS',
      payment_method VARCHAR(50),
      transaction_id VARCHAR(120),
      gateway_reference VARCHAR(120),
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','cancelled')),
      payment_url TEXT,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transaction_fees (
      id SERIAL PRIMARY KEY,
      payment_id INT REFERENCES payments(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      fee_percent DECIMAL(5,2) NOT NULL,
      fee_amount DECIMAL(12,2) NOT NULL,
      rent_amount DECIMAL(12,2) NOT NULL,
      total_amount DECIMAL(12,2) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_usage_logs (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      feature_name VARCHAR(100) NOT NULL,
      request_payload JSONB,
      response_payload JSONB,
      tokens_used INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sms_logs (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_phone VARCHAR(30) NOT NULL,
      message TEXT NOT NULL,
      sms_type VARCHAR(30) NOT NULL CHECK (sms_type IN ('rent_reminder','payment_confirmation','lease_expiry','other')),
      provider_message_id VARCHAR(120),
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sms_usage (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      period_month VARCHAR(7) NOT NULL,
      sms_count INT NOT NULL DEFAULT 0,
      total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, period_month)
    );

    CREATE TABLE IF NOT EXISTS sms_billing (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sms_usage_id INT REFERENCES sms_usage(id) ON DELETE SET NULL,
      amount DECIMAL(12,2) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
      payment_method VARCHAR(50),
      transaction_id VARCHAR(120),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS enterprise_clients (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE SET NULL,
      company_name VARCHAR(255) NOT NULL,
      contact_person VARCHAR(255),
      contact_email VARCHAR(255),
      contact_phone VARCHAR(30),
      monthly_volume_estimate DECIMAL(12,2),
      negotiated_price DECIMAL(12,2),
      white_label_enabled BOOLEAN DEFAULT FALSE,
      api_access_enabled BOOLEAN DEFAULT TRUE,
      custom_integrations TEXT,
      status VARCHAR(20) DEFAULT 'lead' CHECK (status IN ('lead','active','inactive')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_billing_history_user_id ON billing_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_transaction_fees_user_id ON transaction_fees(user_id);
    CREATE INDEX IF NOT EXISTS idx_sms_usage_user_id ON sms_usage(user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
  `);

  // Seed default plans
  await pool.query(`
    INSERT INTO plans (code, name, description, price_monthly, price_yearly, property_limit)
    VALUES
      ('starter', 'Starter Plan', 'Basic plan for small landlords. Manage up to 10 properties.', 1000, 15000, 10),
      ('pro', 'Pro Plan', 'Advanced tools with payment automation and analytics.', 1000, 15000, 50),
      ('enterprise', 'Enterprise Plan', 'Unlimited scale, AI-powered analytics, and priority support.', 0, 0, NULL)
    ON CONFLICT (code) DO UPDATE
    SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      price_monthly = EXCLUDED.price_monthly,
      price_yearly = EXCLUDED.price_yearly,
      property_limit = EXCLUDED.property_limit,
      is_active = true;
  `);

  // Seed plan features (idempotent)
  await pool.query(`
    INSERT INTO plan_features (plan_id, feature_key, feature_name)
    SELECT p.id, f.feature_key, f.feature_name
    FROM plans p
    JOIN (
      VALUES
        ('starter', 'basic_dashboard', 'Dashboard & Analytics'),
        ('starter', 'rent_tracking', 'Rent Tracking'),
        ('starter', 'basic_reports', 'Basic Reports'),
        ('starter', 'property_management', 'Property Management (up to 10)'),
        ('starter', 'tenant_management', 'Tenant Management'),
        ('pro', 'advanced_reports', 'Advanced Reports & Insights'),
        ('pro', 'automated_reminders', 'Automated Rent Reminders'),
        ('pro', 'tenant_portal', 'Tenant Portal'),
        ('pro', 'payment_integration', 'Fastlipa Payment Integration'),
        ('pro', 'sms_notifications', 'SMS Notifications'),
        ('pro', 'property_management', 'Property Management (up to 50)'),
        ('pro', 'maintenance_tracking', 'Maintenance Tracking'),
        ('pro', 'financial_reports', 'Financial Reports'),
        ('enterprise', 'ai_analytics', 'AI-Powered Analytics'),
        ('enterprise', 'automated_accounting', 'Automated Accounting'),
        ('enterprise', 'priority_support', 'Priority Support'),
        ('enterprise', 'custom_integrations', 'Custom Integrations'),
        ('enterprise', 'unlimited_properties', 'Unlimited Properties'),
        ('enterprise', 'white_label', 'White-Label Option'),
        ('enterprise', 'api_access', 'Full API Access')
    ) AS f(plan_code, feature_key, feature_name) ON p.code = f.plan_code
    WHERE NOT EXISTS (
      SELECT 1 FROM plan_features pf WHERE pf.plan_id = p.id AND pf.feature_key = f.feature_key
    );
  `);

  saasReady = true;
};

module.exports = {
  ensureOptionalTables,
  ensureSaasTables,
};
