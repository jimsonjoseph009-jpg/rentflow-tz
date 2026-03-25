const pool = require('../config/db');
const { processWorkflowEvent } = require('../services/workflow.service');

exports.getWorkflows = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM workflow_rules WHERE user_id=$1 ORDER BY updated_at DESC, id DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to fetch workflows' });
  }
};

exports.createWorkflow = async (req, res) => {
  const { name, event_type, conditions = {}, actions = [], is_active = true } = req.body;

  if (!name || !event_type || !Array.isArray(actions) || actions.length === 0) {
    return res.status(400).json({ message: 'name, event_type and non-empty actions array are required' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO workflow_rules (user_id, name, event_type, conditions, actions, is_active, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       RETURNING *`,
      [req.user.id, name, event_type, JSON.stringify(conditions || {}), JSON.stringify(actions), is_active]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to create workflow' });
  }
};

exports.updateWorkflow = async (req, res) => {
  const { id } = req.params;
  const { name, event_type, conditions, actions, is_active } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE workflow_rules
       SET name=COALESCE($1, name),
           event_type=COALESCE($2, event_type),
           conditions=COALESCE($3, conditions),
           actions=COALESCE($4, actions),
           is_active=COALESCE($5, is_active),
           updated_at=NOW()
       WHERE id=$6 AND user_id=$7
       RETURNING *`,
      [
        name || null,
        event_type || null,
        conditions !== undefined ? JSON.stringify(conditions) : null,
        actions !== undefined ? JSON.stringify(actions) : null,
        is_active,
        id,
        req.user.id,
      ]
    );

    if (!rows.length) return res.status(404).json({ message: 'Workflow not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to update workflow' });
  }
};

exports.deleteWorkflow = async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM workflow_rules WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!rowCount) return res.status(404).json({ message: 'Workflow not found' });
    res.json({ message: 'Workflow deleted' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to delete workflow' });
  }
};

exports.getWorkflowRuns = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT wr.*, w.name AS workflow_name
       FROM workflow_runs wr
       LEFT JOIN workflow_rules w ON wr.rule_id = w.id
       WHERE wr.user_id=$1
       ORDER BY wr.created_at DESC
       LIMIT 200`,
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to fetch workflow runs' });
  }
};

exports.triggerWorkflowTest = async (req, res) => {
  const { event_type, payload = {} } = req.body;
  if (!event_type) return res.status(400).json({ message: 'event_type is required' });

  await processWorkflowEvent({ userId: req.user.id, eventType: event_type, payload });
  res.json({ message: 'Workflow test event dispatched' });
};

exports.createWorkflowFromTemplate = async (req, res) => {
  const { name, event_type, conditions = {}, actions = [], is_active = true } = req.body;
  if (!name || !event_type || !Array.isArray(actions) || actions.length === 0) {
    return res.status(400).json({ message: 'Invalid template payload' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO workflow_rules (user_id, name, event_type, conditions, actions, is_active, updated_at)\n       VALUES ($1,$2,$3,$4,$5,$6,NOW())\n       RETURNING *`,
      [req.user.id, name, event_type, JSON.stringify(conditions), JSON.stringify(actions), is_active]
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to create workflow from template' });
  }
};
