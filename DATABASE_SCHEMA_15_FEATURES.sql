-- RENTFLOW-TZ BACKEND - 15 NEW FEATURES DATABASE SCHEMA
-- Run this SQL script to create all required tables for the 15 new features

-- 1. TENANT RATING TABLE
CREATE TABLE IF NOT EXISTS tenant_ratings (
  id SERIAL PRIMARY KEY,
  landlord_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payment_score INT CHECK (payment_score >= 0 AND payment_score <= 10),
  behavior_score INT CHECK (behavior_score >= 0 AND behavior_score <= 10),
  reliability_score INT CHECK (reliability_score >= 0 AND reliability_score <= 10),
  average_score DECIMAL(3,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_ratings_landlord ON tenant_ratings(landlord_id);
CREATE INDEX idx_tenant_ratings_tenant ON tenant_ratings(tenant_id);

-- 2. PAYMENT ALERTS TABLE
CREATE TABLE IF NOT EXISTS payment_alerts (
  id SERIAL PRIMARY KEY,
  landlord_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  amount DECIMAL(10,2),
  frequency VARCHAR(50), -- once, weekly, monthly
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_alerts_landlord ON payment_alerts(landlord_id);
CREATE INDEX idx_payment_alerts_tenant ON payment_alerts(tenant_id);
CREATE INDEX idx_payment_alerts_due_date ON payment_alerts(due_date);

-- 3. OCCUPANCY FORECAST TABLE
CREATE TABLE IF NOT EXISTS occupancy_forecasts (
  id SERIAL PRIMARY KEY,
  landlord_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id INT REFERENCES units(id) ON DELETE SET NULL,
  lease_end_date DATE NOT NULL,
  tenant_name VARCHAR(255),
  status VARCHAR(50), -- OCCUPIED, SOON, VACANT
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_occupancy_landlord ON occupancy_forecasts(landlord_id);
CREATE INDEX idx_occupancy_property ON occupancy_forecasts(property_id);
CREATE INDEX idx_occupancy_lease_date ON occupancy_forecasts(lease_end_date);

-- 4. UTILITY METERS TABLE
CREATE TABLE IF NOT EXISTS utility_meters (
  id SERIAL PRIMARY KEY,
  landlord_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id INT REFERENCES units(id) ON DELETE SET NULL,
  meter_type VARCHAR(50) NOT NULL, -- ELECTRICITY, WATER, GAS
  reading DECIMAL(12,2) NOT NULL,
  reading_date DATE NOT NULL,
  cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_utility_meters_landlord ON utility_meters(landlord_id);
CREATE INDEX idx_utility_meters_property ON utility_meters(property_id);
CREATE INDEX idx_utility_meters_type ON utility_meters(meter_type);
CREATE INDEX idx_utility_meters_date ON utility_meters(reading_date);

-- 5. MAINTENANCE INVENTORY TABLE
CREATE TABLE IF NOT EXISTS maintenance_inventory (
  id SERIAL PRIMARY KEY,
  landlord_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  stock INT DEFAULT 0,
  min_stock INT DEFAULT 5,
  supplier VARCHAR(255),
  cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_maintenance_landlord ON maintenance_inventory(landlord_id);
CREATE INDEX idx_maintenance_category ON maintenance_inventory(category);
CREATE INDEX idx_maintenance_stock ON maintenance_inventory(stock);

-- 6. VISITOR LOG TABLE
CREATE TABLE IF NOT EXISTS visitor_logs (
  id SERIAL PRIMARY KEY,
  landlord_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  visitor_name VARCHAR(255) NOT NULL,
  visitor_phone VARCHAR(20),
  purpose VARCHAR(255),
  visit_date DATE NOT NULL,
  visit_time TIME,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_visitor_logs_landlord ON visitor_logs(landlord_id);
CREATE INDEX idx_visitor_logs_property ON visitor_logs(property_id);
CREATE INDEX idx_visitor_logs_date ON visitor_logs(visit_date);

-- 7. TAX DEDUCTIONS TABLE
CREATE TABLE IF NOT EXISTS tax_deductions (
  id SERIAL PRIMARY KEY,
  landlord_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL, -- Maintenance, Insurance, Property Tax, Utilities, Advertising, Management
  amount DECIMAL(12,2) NOT NULL,
  tax_savings DECIMAL(12,2), -- 30% of amount
  description TEXT,
  expense_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tax_deductions_landlord ON tax_deductions(landlord_id);
CREATE INDEX idx_tax_deductions_category ON tax_deductions(category);
CREATE INDEX idx_tax_deductions_date ON tax_deductions(expense_date);

-- 8. QR INSPECTIONS TABLE
CREATE TABLE IF NOT EXISTS qr_inspections (
  id SERIAL PRIMARY KEY,
  landlord_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  qr_code VARCHAR(500),
  condition VARCHAR(50) NOT NULL, -- GOOD, FAIR, POOR
  inspection_date DATE NOT NULL,
  inspection_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_qr_inspections_landlord ON qr_inspections(landlord_id);
CREATE INDEX idx_qr_inspections_property ON qr_inspections(property_id);
CREATE INDEX idx_qr_inspections_condition ON qr_inspections(condition);

-- 9. VOICE NOTES TABLE
CREATE TABLE IF NOT EXISTS voice_notes (
  id SERIAL PRIMARY KEY,
  landlord_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(100), -- Inspection, Maintenance, Tenant, Property
  audio_url VARCHAR(500),
  transcription TEXT,
  record_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_voice_notes_landlord ON voice_notes(landlord_id);
CREATE INDEX idx_voice_notes_category ON voice_notes(category);
CREATE INDEX idx_voice_notes_date ON voice_notes(record_date);

-- 10. EMERGENCY CONTACTS TABLE
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id SERIAL PRIMARY KEY,
  landlord_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_type VARCHAR(50) NOT NULL, -- Electrician, Plumber, Painter, Doctor, Police, Fire, Hospital, Handyman, Security
  contact_name VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_emergency_contacts_landlord ON emergency_contacts(landlord_id);
CREATE INDEX idx_emergency_contacts_type ON emergency_contacts(contact_type);

-- 11. LANDLORD NETWORK TABLE
CREATE TABLE IF NOT EXISTS landlord_network (
  id SERIAL PRIMARY KEY,
  landlord_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  properties_count INT DEFAULT 0,
  years_experience INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_landlord_network_landlord ON landlord_network(landlord_id);

-- 12. PET POLICY TABLE
CREATE TABLE IF NOT EXISTS pet_policies (
  id SERIAL PRIMARY KEY,
  landlord_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pet_type VARCHAR(50) NOT NULL, -- Dog, Cat, Bird, Fish, Other
  pet_name VARCHAR(255),
  is_compliant BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pet_policies_landlord ON pet_policies(landlord_id);
CREATE INDEX idx_pet_policies_tenant ON pet_policies(tenant_id);
CREATE INDEX idx_pet_policies_compliance ON pet_policies(is_compliant);

-- 13. VEHICLE MANAGEMENT TABLE
CREATE TABLE IF NOT EXISTS vehicle_management (
  id SERIAL PRIMARY KEY,
  landlord_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vehicle_type VARCHAR(50), -- Car, Motorcycle, Truck, Van, Other
  registration_number VARCHAR(50) UNIQUE,
  parking_spot VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vehicle_management_landlord ON vehicle_management(landlord_id);
CREATE INDEX idx_vehicle_management_tenant ON vehicle_management(tenant_id);
CREATE INDEX idx_vehicle_management_registration ON vehicle_management(registration_number);

-- 14. INSURANCE/WARRANTY TABLE
CREATE TABLE IF NOT EXISTS insurance_warranty (
  id SERIAL PRIMARY KEY,
  landlord_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  record_type VARCHAR(50) NOT NULL, -- Insurance, Warranty, License
  provider VARCHAR(255),
  policy_number VARCHAR(100),
  start_date DATE,
  expiry_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_insurance_warranty_landlord ON insurance_warranty(landlord_id);
CREATE INDEX idx_insurance_warranty_property ON insurance_warranty(property_id);
CREATE INDEX idx_insurance_warranty_type ON insurance_warranty(record_type);
CREATE INDEX idx_insurance_warranty_expiry ON insurance_warranty(expiry_date);

-- 15. DISPUTE LOG TABLE
CREATE TABLE IF NOT EXISTS dispute_logs (
  id SERIAL PRIMARY KEY,
  landlord_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL, -- Maintenance, Payment, Noise, Safety, Other
  severity VARCHAR(50), -- Low, Medium, High
  description TEXT,
  status VARCHAR(50) DEFAULT 'OPEN', -- Open, In Progress, Resolved
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dispute_logs_landlord ON dispute_logs(landlord_id);
CREATE INDEX idx_dispute_logs_tenant ON dispute_logs(tenant_id);
CREATE INDEX idx_dispute_logs_status ON dispute_logs(status);
CREATE INDEX idx_dispute_logs_category ON dispute_logs(category);

-- Summary Statistics
-- Total new tables: 15
-- Total new indexes: 45+
-- All tables include landlord_id for multi-tenancy
-- All tables include created_at and updated_at for audit trails
-- Foreign keys configured with ON DELETE CASCADE for referential integrity
