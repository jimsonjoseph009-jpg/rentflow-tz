const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const auth = require("../middleware/auth");

router.get("/", auth, async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM units ORDER BY id");
  res.json(rows);
});

router.post("/", auth, async (req, res) => {
  const { property_id, unit_number, rent_amount, status } = req.body;

  const { rows } = await pool.query(
    "INSERT INTO units (property_id, unit_number, rent_amount, status) VALUES ($1,$2,$3,$4) RETURNING *",
    [property_id, unit_number, rent_amount, status]
  );

  res.json(rows[0]);
});

router.put("/:id", auth, async (req, res) => {
  const { property_id, unit_number, rent_amount, status } = req.body;

  await pool.query(
    "UPDATE units SET property_id=$1, unit_number=$2, rent_amount=$3, status=$4 WHERE id=$5",
    [property_id, unit_number, rent_amount, status, req.params.id]
  );

  res.json({ message: "Updated" });
});

router.delete("/:id", auth, async (req, res) => {
  await pool.query("DELETE FROM units WHERE id=$1", [req.params.id]);
  res.json({ message: "Deleted" });
});

module.exports = router;
