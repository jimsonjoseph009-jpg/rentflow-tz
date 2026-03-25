const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authMiddleware = require("../middleware/auth"); // <--- middleware imported

// GET /api/properties
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM properties ORDER BY id");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
