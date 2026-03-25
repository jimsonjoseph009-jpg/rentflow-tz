-- RentFlow TZ payment integration migration

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id INT REFERENCES properties(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  transaction_id VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email VARCHAR(255);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS property_id INT REFERENCES properties(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) NOT NULL DEFAULT 'manual';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(120);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_reference VARCHAR(120);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_status VARCHAR(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_response JSONB;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS callback_received_at TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(80);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_path TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_status_check'
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_status_check
      CHECK (status IN ('pending', 'success', 'failed'));
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS payment_webhook_logs (
  id SERIAL PRIMARY KEY,
  payment_id INT REFERENCES payments(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  signature VARCHAR(255),
  status VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_property_id ON payments(property_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_logs_payment_id ON payment_webhook_logs(payment_id);

CREATE TABLE IF NOT EXISTS landlord_payment_methods (
  id SERIAL PRIMARY KEY,
  landlord_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_name VARCHAR(50) NOT NULL,
  account_name VARCHAR(100),
  account_number VARCHAR(100) NOT NULL,
  instructions TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_landlord_payment_methods_landlord_id ON landlord_payment_methods(landlord_id);
