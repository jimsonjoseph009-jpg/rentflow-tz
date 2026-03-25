const pool = require('../config/db');
const { applyPlanPriceOverrides } = require('../services/planPricing.service');

exports.getPlans = async (_req, res) => {
  try {
    const plansRes = await pool.query('SELECT * FROM plans WHERE is_active=true ORDER BY id');
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
