const pool = require('../config/db');
const { applyPlanPriceOverrides } = require('../services/planPricing.service');

exports.getPlans = async (_req, res) => {
  try {
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
    `);

    let plansRes = await pool.query('SELECT * FROM plans WHERE is_active=true ORDER BY id');
    
    if (plansRes.rowCount === 0) {
      await pool.query(`
        INSERT INTO plans (code, name, description, price_monthly, price_yearly, property_limit)
        VALUES
          ('starter', 'Starter Plan', 'Basic plan for small landlords', 500, 15000, 10),
          ('pro', 'Pro Plan', 'Advanced tools with payment and automation', 500, 15000, 50),
          ('enterprise', 'Enterprise Plan', 'Unlimited scale, AI, priority support', 0, 0, NULL)
        ON CONFLICT (code) DO UPDATE SET is_active=true;
      `);
      plansRes = await pool.query('SELECT * FROM plans WHERE is_active=true ORDER BY id');
    }

    // Safely attempt to create remaining saas_monetization tables so that /subscription-status doesn't crash on Vercel
    await pool.query(`
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
    `);
    
    const featuresRes = await pool.query('SELECT plan_id, feature_key, feature_name FROM plan_features ORDER BY id');

    const featureMap = featuresRes.rows.reduce((acc, row) => {
      if (!acc[row.plan_id]) acc[row.plan_id] = [];
      acc[row.plan_id].push({ key: row.feature_key, name: row.feature_name });
      return acc;
    }, {});

    const payload = plansRes.rows.map((plan) => ({
      ...applyPlanPriceOverrides(plan),
      features: featureMap[plan.id] || [],
    }));

    res.json(payload);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to fetch plans' });
  }
};
