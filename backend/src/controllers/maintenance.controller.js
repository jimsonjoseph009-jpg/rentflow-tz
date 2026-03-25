const pool = require('../config/db');
const { createNotification } = require('../services/notification.service');
const { processWorkflowEvent } = require('../services/workflow.service');

const ensureTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS maintenance_requests (
      id SERIAL PRIMARY KEY,
      landlord_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      property_id INT REFERENCES properties(id) ON DELETE SET NULL,
      unit_id INT REFERENCES units(id) ON DELETE SET NULL,
      description TEXT NOT NULL,
      priority VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(20) DEFAULT 'pending',
      budget DECIMAL(12,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

exports.getMaintenanceRequests = async (req, res) => {
  try {
    await ensureTable();
    let query, params;
    
    if (req.user.role === 'tenant') {
      const llRes = await pool.query(
        `SELECT pr.landlord_id, pr.id as property_id, un.id as unit_id
         FROM tenants t
         JOIN units un ON t.unit_id = un.id
         JOIN properties pr ON un.property_id = pr.id
         WHERE t.user_id = $1`,
        [req.user.id]
      );
      if (llRes.rows.length === 0) return res.status(403).json({ message: 'Tenant not linked to any property' });
      
      query = `SELECT * FROM maintenance_requests WHERE landlord_id=$1 AND property_id=$2 AND unit_id=$3 ORDER BY created_at DESC`;
      params = [llRes.rows[0].landlord_id, llRes.rows[0].property_id, llRes.rows[0].unit_id];
    } else {
      query = `SELECT * FROM maintenance_requests WHERE landlord_id=$1 ORDER BY created_at DESC`;
      params = [req.user.id];
    }

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to fetch maintenance requests' });
  }
};

exports.createMaintenanceRequest = async (req, res) => {
  let { property_id, unit_id, description, priority = 'medium', status = 'pending', budget } = req.body;
  let landlordId = req.user.id;
  let createdByTenant = false;

  try {
    await ensureTable();
    
    if (req.user.role === 'tenant') {
      const llRes = await pool.query(
        `SELECT pr.landlord_id, pr.id as property_id, un.id as unit_id, u.name
         FROM tenants t
         JOIN units un ON t.unit_id = un.id
         JOIN properties pr ON un.property_id = pr.id
         JOIN users u ON t.user_id = u.id
         WHERE t.user_id = $1`,
        [req.user.id]
      );
      if (llRes.rows.length === 0) return res.status(403).json({ message: 'Tenant not linked to any property' });
      
      landlordId = llRes.rows[0].landlord_id;
      property_id = llRes.rows[0].property_id;
      unit_id = llRes.rows[0].unit_id;
      description = `[Tenant Request: ${llRes.rows[0].name}] ${description}`;
      status = 'pending'; // Force pending status for tenants
      budget = null; // Tenants cannot set budget
      createdByTenant = true;
    }

    const { rows } = await pool.query(
      `INSERT INTO maintenance_requests (landlord_id, property_id, unit_id, description, priority, status, budget)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [landlordId, property_id || null, unit_id || null, description, priority, status, budget || null]
    );
    await createNotification({
      userId: landlordId,
      type: 'info',
      title: createdByTenant ? 'New Tenant Maintenance Request' : 'Maintenance Request Created',
      message: `New maintenance request created (${priority})`,
      metadata: { maintenance_id: rows[0].id },
    });
    await processWorkflowEvent({
      userId: landlordId,
      eventType: 'maintenance_created',
      payload: {
        maintenance_id: rows[0].id,
        property_id: rows[0].property_id,
        unit_id: rows[0].unit_id,
        priority: rows[0].priority,
        status: rows[0].status,
      },
    });
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to create maintenance request' });
  }
};

exports.updateMaintenanceRequest = async (req, res) => {
  const { id } = req.params;
  const { property_id, unit_id, description, priority, status, budget } = req.body;

  try {
    await ensureTable();
    const { rows } = await pool.query(
      `UPDATE maintenance_requests
       SET property_id=COALESCE($1, property_id),
           unit_id=COALESCE($2, unit_id),
           description=COALESCE($3, description),
           priority=COALESCE($4, priority),
           status=COALESCE($5, status),
           budget=COALESCE($6, budget),
           updated_at=NOW()
       WHERE id=$7 AND landlord_id=$8
       RETURNING *`,
      [property_id || null, unit_id || null, description || null, priority || null, status || null, budget || null, id, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }

    await createNotification({
      userId: req.user.id,
      type: 'info',
      title: 'Maintenance Updated',
      message: `Maintenance #${rows[0].id} updated to status ${rows[0].status}`,
      metadata: { maintenance_id: rows[0].id, status: rows[0].status },
    });
    await processWorkflowEvent({
      userId: req.user.id,
      eventType: 'maintenance_updated',
      payload: {
        maintenance_id: rows[0].id,
        property_id: rows[0].property_id,
        unit_id: rows[0].unit_id,
        priority: rows[0].priority,
        status: rows[0].status,
      },
    });

    res.json(rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to update maintenance request' });
  }
};

exports.deleteMaintenanceRequest = async (req, res) => {
  try {
    await ensureTable();
    const { rowCount } = await pool.query(
      `DELETE FROM maintenance_requests WHERE id=$1 AND landlord_id=$2`,
      [req.params.id, req.user.id]
    );

    if (!rowCount) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }

    res.json({ message: 'Maintenance request deleted' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to delete maintenance request' });
  }
};
