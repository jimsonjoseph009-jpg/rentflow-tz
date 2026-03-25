const pool = require('../config/db');

const toNumber = (value) => Number(value || 0);

exports.getCommandCenter = async (req, res) => {
  const landlordId = req.user.id;

  try {
    const summaryQuery = `
      WITH landlord_units AS (
        SELECT u.id, u.rent_amount, u.status
        FROM units u
        JOIN properties p ON p.id = u.property_id
        WHERE p.landlord_id = $1
      ),
      occupied_units AS (
        SELECT COUNT(*)::int AS occupied_count
        FROM landlord_units
        WHERE status = 'occupied'
      ),
      totals AS (
        SELECT
          (SELECT COUNT(*)::int FROM properties WHERE landlord_id = $1) AS total_properties,
          (SELECT COUNT(*)::int FROM landlord_units) AS total_units,
          (SELECT occupied_count FROM occupied_units) AS occupied_units,
          (SELECT COALESCE(SUM(rent_amount), 0)::numeric FROM landlord_units WHERE status = 'occupied') AS monthly_expected
      ),
      collections AS (
        SELECT COALESCE(SUM(pay.amount), 0)::numeric AS monthly_collected
        FROM payments pay
        JOIN tenants t ON t.id = pay.tenant_id
        JOIN units u ON u.id = t.unit_id
        JOIN properties p ON p.id = u.property_id
        WHERE p.landlord_id = $1
          AND pay.status = 'success'
          AND DATE_TRUNC('month', pay.payment_date) = DATE_TRUNC('month', CURRENT_DATE)
      ),
      at_risk AS (
        SELECT COUNT(*)::int AS at_risk_tenants
        FROM tenants t
        JOIN units u ON u.id = t.unit_id
        JOIN properties p ON p.id = u.property_id
        LEFT JOIN LATERAL (
          SELECT pay.payment_date, pay.status
          FROM payments pay
          WHERE pay.tenant_id = t.id
          ORDER BY pay.payment_date DESC NULLS LAST, pay.id DESC
          LIMIT 1
        ) lp ON TRUE
        WHERE p.landlord_id = $1
          AND (
            lp.payment_date IS NULL
            OR lp.status <> 'success'
            OR lp.payment_date < CURRENT_DATE - INTERVAL '30 days'
          )
      )
      SELECT
        totals.total_properties,
        totals.total_units,
        totals.occupied_units,
        totals.monthly_expected,
        collections.monthly_collected,
        at_risk.at_risk_tenants
      FROM totals
      CROSS JOIN collections
      CROSS JOIN at_risk;
    `;

    const summaryRes = await pool.query(summaryQuery, [landlordId]);
    const row = summaryRes.rows[0] || {
      total_properties: 0,
      total_units: 0,
      occupied_units: 0,
      monthly_expected: 0,
      monthly_collected: 0,
      at_risk_tenants: 0,
    };

    const totalUnits = toNumber(row.total_units);
    const occupiedUnits = toNumber(row.occupied_units);
    const monthlyExpected = toNumber(row.monthly_expected);
    const monthlyCollected = toNumber(row.monthly_collected);
    const collectionGap = Math.max(monthlyExpected - monthlyCollected, 0);

    const occupancyRate = totalUnits > 0 ? Number(((occupiedUnits / totalUnits) * 100).toFixed(1)) : 0;
    const collectionRate = monthlyExpected > 0 ? Number(((monthlyCollected / monthlyExpected) * 100).toFixed(1)) : 0;

    const alerts = [];

    if (toNumber(row.at_risk_tenants) > 0) {
      alerts.push({
        level: 'high',
        code: 'TENANT_RISK',
        title: 'Tenants need follow-up',
        message: `${row.at_risk_tenants} tenant(s) are at risk due to overdue or failed recent payment history.`,
      });
    }

    if (collectionGap > 0) {
      alerts.push({
        level: collectionGap > monthlyExpected * 0.3 ? 'high' : 'medium',
        code: 'COLLECTION_GAP',
        title: 'Collection gap detected',
        message: `Collection gap is ${collectionGap.toLocaleString()} TZS for this month.`,
      });
    }

    if (occupancyRate < 70 && totalUnits > 0) {
      alerts.push({
        level: 'medium',
        code: 'LOW_OCCUPANCY',
        title: 'Low occupancy trend',
        message: `Occupancy is ${occupancyRate}% which is below your 70% target.`,
      });
    }

    return res.json({
      summary: {
        total_properties: toNumber(row.total_properties),
        total_units: totalUnits,
        occupied_units: occupiedUnits,
        occupancy_rate: occupancyRate,
        monthly_expected: monthlyExpected,
        monthly_collected: monthlyCollected,
        collection_rate: collectionRate,
        collection_gap: collectionGap,
        at_risk_tenants: toNumber(row.at_risk_tenants),
      },
      alerts,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('getCommandCenter error:', error.message);
    return res.status(500).json({ message: 'Failed to load command center insights' });
  }
};
