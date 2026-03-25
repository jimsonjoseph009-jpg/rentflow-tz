const pool = require('../config/db');

exports.createInventoryItem = async (req, res) => {
  const landlordId = req.user.id;
  const itemName = req.body.itemName ?? req.body.item_name ?? req.body.part_name;
  const category = req.body.category;
  const stock = req.body.stock ?? req.body.quantity ?? 0;
  const minStock = req.body.minStock ?? req.body.min_stock ?? 5;
  const supplier = req.body.supplier ?? null;
  const cost = req.body.cost ?? req.body.unit_cost ?? null;
  const notes = req.body.notes ?? null;

  try {
    const result = await pool.query(
      'INSERT INTO maintenance_inventory (landlord_id, item_name, category, stock, min_stock, supplier, cost, notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING *',
      [landlordId, itemName, category, stock, minStock || 5, supplier, cost, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getInventoryItems = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT *,
              item_name AS part_name,
              stock AS quantity,
              cost AS unit_cost
       FROM maintenance_inventory
       WHERE landlord_id=$1
       ORDER BY item_name ASC`,
      [landlordId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getInventoryItemById = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM maintenance_inventory WHERE id=$1 AND landlord_id=$2',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateInventoryItem = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;
  const itemName = req.body.itemName ?? req.body.item_name ?? req.body.part_name;
  const category = req.body.category;
  const stock = req.body.stock ?? req.body.quantity ?? 0;
  const minStock = req.body.minStock ?? req.body.min_stock ?? 5;
  const supplier = req.body.supplier ?? null;
  const cost = req.body.cost ?? req.body.unit_cost ?? null;
  const notes = req.body.notes ?? null;

  try {
    const result = await pool.query(
      'UPDATE maintenance_inventory SET item_name=$1, category=$2, stock=$3, min_stock=$4, supplier=$5, cost=$6, notes=$7, updated_at=NOW() WHERE id=$8 AND landlord_id=$9 RETURNING *',
      [itemName, category, stock, minStock, supplier, cost, notes, id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteInventoryItem = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM maintenance_inventory WHERE id=$1 AND landlord_id=$2 RETURNING *',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getLowStockItems = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT * FROM maintenance_inventory WHERE landlord_id=$1 AND stock <= min_stock ORDER BY stock ASC',
      [landlordId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getInventoryByCategory = async (req, res) => {
  const landlordId = req.user.id;
  const { category } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM maintenance_inventory WHERE landlord_id=$1 AND category=$2 ORDER BY item_name ASC',
      [landlordId, category]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
