const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');

const router = express.Router();

const receiptsDir = path.join(__dirname, '../../storage/receipts');

router.get('/:file', verifyToken, checkRole('landlord'), async (req, res) => {
  const rawName = String(req.params.file || '');
  const fileName = path.basename(rawName);

  if (!fileName || fileName !== rawName) {
    return res.status(400).json({ message: 'Invalid receipt file' });
  }

  if (!fileName.toLowerCase().endsWith('.pdf')) {
    return res.status(400).json({ message: 'Invalid receipt file type' });
  }

  try {
    const receiptPath = `/receipts/${fileName}`;

    const { rows } = await pool.query(
      `SELECT pay.id
       FROM payments pay
       JOIN tenants t ON pay.tenant_id = t.id
       JOIN units u ON t.unit_id = u.id
       JOIN properties pr ON u.property_id = pr.id
       WHERE pr.landlord_id=$1
         AND pay.receipt_path=$2
       LIMIT 1`,
      [req.user.id, receiptPath]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    const absolutePath = path.join(receiptsDir, fileName);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'Receipt file missing' });
    }

    const wantsDownload = String(req.query?.download || '') === '1';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${wantsDownload ? 'attachment' : 'inline'}; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    return res.sendFile(absolutePath);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to fetch receipt' });
  }
});

module.exports = router;
