const pool = require('../config/db');

exports.createTaxDeduction = async (req, res) => {
  const landlordId = req.user.id;
  const category = req.body.category;
  const amount = req.body.amount;
  const description = req.body.description;
  const expenseDate = req.body.expenseDate ?? req.body.expense_date ?? req.body.deduction_date;

  try {
    const taxSavings = (parseFloat(amount) * 0.30).toFixed(2);
    const result = await pool.query(
      'INSERT INTO tax_deductions (landlord_id, category, amount, tax_savings, description, expense_date, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *',
      [landlordId, category, amount, taxSavings, description, expenseDate]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTaxDeductions = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT *,
              expense_date AS deduction_date,
              NULL::TEXT AS receipt_url
       FROM tax_deductions
       WHERE landlord_id=$1
       ORDER BY expense_date DESC`,
      [landlordId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTaxDeductionById = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM tax_deductions WHERE id=$1 AND landlord_id=$2',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Deduction not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateTaxDeduction = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;
  const category = req.body.category;
  const amount = req.body.amount;
  const description = req.body.description;
  const expenseDate = req.body.expenseDate ?? req.body.expense_date ?? req.body.deduction_date;

  try {
    const taxSavings = (parseFloat(amount) * 0.30).toFixed(2);
    const result = await pool.query(
      'UPDATE tax_deductions SET category=$1, amount=$2, tax_savings=$3, description=$4, expense_date=$5, updated_at=NOW() WHERE id=$6 AND landlord_id=$7 RETURNING *',
      [category, amount, taxSavings, description, expenseDate, id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Deduction not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteTaxDeduction = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM tax_deductions WHERE id=$1 AND landlord_id=$2 RETURNING *',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Deduction not found' });
    res.json({ message: 'Deduction deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTaxSummary = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT category, SUM(amount) as total_amount, SUM(tax_savings) as total_savings, COUNT(*) as count FROM tax_deductions WHERE landlord_id=$1 GROUP BY category ORDER BY total_amount DESC',
      [landlordId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAnnualTaxSummary = async (req, res) => {
  const landlordId = req.user.id;
  const { year } = req.params;

  try {
    const result = await pool.query(
      'SELECT SUM(amount) as total_deductions, SUM(tax_savings) as total_tax_savings FROM tax_deductions WHERE landlord_id=$1 AND EXTRACT(YEAR FROM expense_date)=$2',
      [landlordId, year]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
