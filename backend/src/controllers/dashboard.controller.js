const pool = require('../config/db');

exports.getDashboard = async (req, res) => {
  const landlordId = req.user.id;

  try {
    // Total properties
    const totalPropertiesRes = await pool.query(
      'SELECT COUNT(*) AS total_properties FROM properties WHERE landlord_id=$1',
      [landlordId]
    );

    // Total units
    const totalUnitsRes = await pool.query(
      `SELECT COUNT(*) AS total_units
       FROM units u
       JOIN properties p ON u.property_id = p.id
       WHERE p.landlord_id=$1`,
      [landlordId]
    );

    // Occupied units
    const occupiedUnitsRes = await pool.query(
      `SELECT COUNT(*) AS occupied_units
       FROM units u
       JOIN tenants t ON u.id = t.unit_id
       JOIN properties p ON u.property_id = p.id
       WHERE p.landlord_id=$1`,
      [landlordId]
    );

    // Vacant units
    const vacantUnitsRes = await pool.query(
      `SELECT COUNT(*) AS vacant_units
       FROM units u
       JOIN properties p ON u.property_id = p.id
       WHERE p.landlord_id=$1 AND u.status='vacant'`,
      [landlordId]
    );

    // Monthly income
    const monthlyIncomeRes = await pool.query(
      `SELECT COALESCE(SUM(amount),0) AS monthly_income
       FROM payments pay
       JOIN tenants t ON pay.tenant_id = t.id
       JOIN units u ON t.unit_id = u.id
       JOIN properties p ON u.property_id = p.id
       WHERE p.landlord_id=$1
         AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [landlordId]
    );

    res.json({
      total_properties: totalPropertiesRes.rows[0].total_properties,
      total_units: totalUnitsRes.rows[0].total_units,
      occupied_units: occupiedUnitsRes.rows[0].occupied_units,
      vacant_units: vacantUnitsRes.rows[0].vacant_units,
      monthly_income: monthlyIncomeRes.rows[0].monthly_income
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
