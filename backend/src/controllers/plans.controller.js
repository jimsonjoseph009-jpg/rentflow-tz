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

    // Safely attempt to create plan_features table and query features
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plan_features (
        id SERIAL PRIMARY KEY,
        plan_id INT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        feature_key VARCHAR(100) NOT NULL,
        feature_name VARCHAR(255) NOT NULL,
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
