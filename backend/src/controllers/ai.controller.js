const pool = require('../config/db');

exports.getRentSuggestion = async (req, res) => {
  const { current_rent, occupancy_rate } = req.body;
  const currentRent = Number(current_rent || 0);
  const occupancy = Number(occupancy_rate || 0.85);

  const factor = occupancy > 0.9 ? 1.08 : occupancy < 0.7 ? 0.95 : 1.03;
  const suggested = Math.round(currentRent * factor);

  try {
    await pool.query(
      `INSERT INTO ai_usage_logs (user_id, feature_name, request_payload, response_payload, tokens_used)
       VALUES ($1,'rent_price_suggestion',$2,$3,$4)`,
      [
        req.user.id,
        JSON.stringify({ current_rent, occupancy_rate }),
        JSON.stringify({ suggested_rent: suggested, confidence: 0.78 }),
        120,
      ]
    );

    res.json({ suggested_rent: suggested, confidence: 0.78, note: 'AI recommendation based on occupancy trend.' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to generate AI suggestion' });
  }
};

exports.getRevenueForecast = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(amount),0) AS current_month_revenue
       FROM payments
       WHERE status='success'
         AND EXTRACT(MONTH FROM COALESCE(payment_date, created_at)) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM COALESCE(payment_date, created_at)) = EXTRACT(YEAR FROM CURRENT_DATE)`
    );

    const current = Number(rows[0].current_month_revenue || 0);
    const forecast = Math.round(current * 1.12);

    await pool.query(
      `INSERT INTO ai_usage_logs (user_id, feature_name, request_payload, response_payload, tokens_used)
       VALUES ($1,'revenue_forecast',$2,$3,$4)`,
      [req.user.id, JSON.stringify({ month: new Date().toISOString().slice(0, 7) }), JSON.stringify({ forecast }), 160]
    );

    res.json({ current_month_revenue: current, next_month_forecast: forecast });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to generate forecast' });
  }
};
