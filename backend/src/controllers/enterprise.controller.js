const pool = require('../config/db');

exports.requestEnterprisePlan = async (req, res) => {
  const userId = req.user.id;
  const {
    company_name,
    contact_person,
    contact_email,
    contact_phone,
    monthly_volume_estimate,
    custom_integrations,
    white_label_enabled = false,
    api_access_enabled = true,
  } = req.body;

  if (!company_name) {
    return res.status(400).json({ message: 'company_name is required' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO enterprise_clients
       (user_id, company_name, contact_person, contact_email, contact_phone, monthly_volume_estimate, custom_integrations, white_label_enabled, api_access_enabled, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'lead')
       RETURNING *`,
      [
        userId,
        company_name,
        contact_person || null,
        contact_email || null,
        contact_phone || null,
        monthly_volume_estimate || null,
        custom_integrations || null,
        white_label_enabled,
        api_access_enabled,
      ]
    );

    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to submit enterprise request' });
  }
};

exports.getEnterpriseClients = async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ec.*, u.name AS user_name, u.email AS user_email
       FROM enterprise_clients ec
       LEFT JOIN users u ON ec.user_id = u.id
       ORDER BY ec.created_at DESC`
    );

    return res.json(rows);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to fetch enterprise clients' });
  }
};

exports.updateEnterpriseClient = async (req, res) => {
  const { id } = req.params;
  const {
    company_name,
    contact_person,
    contact_email,
    contact_phone,
    monthly_volume_estimate,
    negotiated_price,
    white_label_enabled,
    api_access_enabled,
    custom_integrations,
    status,
  } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE enterprise_clients
       SET company_name=COALESCE($1, company_name),
           contact_person=COALESCE($2, contact_person),
           contact_email=COALESCE($3, contact_email),
           contact_phone=COALESCE($4, contact_phone),
           monthly_volume_estimate=COALESCE($5, monthly_volume_estimate),
           negotiated_price=COALESCE($6, negotiated_price),
           white_label_enabled=COALESCE($7, white_label_enabled),
           api_access_enabled=COALESCE($8, api_access_enabled),
           custom_integrations=COALESCE($9, custom_integrations),
           status=COALESCE($10, status)
       WHERE id=$11
       RETURNING *`,
      [
        company_name || null,
        contact_person || null,
        contact_email || null,
        contact_phone || null,
        monthly_volume_estimate || null,
        negotiated_price || null,
        white_label_enabled,
        api_access_enabled,
        custom_integrations || null,
        status || null,
        id,
      ]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Enterprise client not found' });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to update enterprise client' });
  }
};
