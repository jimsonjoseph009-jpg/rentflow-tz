-- RentFlow SaaS Monetization Schema

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

INSERT INTO plans (code, name, description, price_monthly, price_yearly, property_limit)
VALUES
  ('starter', 'Starter Plan', 'Basic plan for small landlords', 500, 15000, 10),
  ('pro', 'Pro Plan', 'Advanced tools with payment and automation', 500, 15000, 50),
  ('enterprise', 'Enterprise Plan', 'Unlimited scale, AI, priority support', 0, 0, NULL)
ON CONFLICT (code) DO UPDATE
SET
  name=EXCLUDED.name,
  description=EXCLUDED.description,
  price_monthly=EXCLUDED.price_monthly,
  price_yearly=EXCLUDED.price_yearly,
  property_limit=EXCLUDED.property_limit,
  is_active=true;

INSERT INTO plan_features (plan_id, feature_key, feature_name)
SELECT p.id, f.feature_key, f.feature_name
FROM plans p
JOIN (
  VALUES
    ('starter', 'basic_dashboard', 'Basic dashboard'),
    ('starter', 'rent_tracking', 'Rent tracking'),
    ('starter', 'basic_reports', 'Basic reports'),
    ('pro', 'advanced_reports', 'Advanced reports'),
    ('pro', 'automated_reminders', 'Automated rent reminders'),
    ('pro', 'tenant_portal', 'Tenant portal'),
    ('pro', 'payment_integration', 'Payment integration'),
    ('enterprise', 'ai_analytics', 'AI analytics'),
    ('enterprise', 'automated_accounting', 'Automated accounting'),
    ('enterprise', 'priority_support', 'Priority support'),
    ('enterprise', 'custom_integrations', 'Custom integrations')
) AS f(plan_code, feature_key, feature_name)
ON p.code = f.plan_code
WHERE NOT EXISTS (
  SELECT 1 FROM plan_features pf WHERE pf.plan_id = p.id AND pf.feature_key = f.feature_key
);
