const express = require("express");
const pool = require("../../db");
const { authenticate, requireAdmin } = require("../../middleware/authenticate");

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get("/", async (req, res) => {
  try {
    const {
      action,
      adminId,
      startDate,
      endDate,
      page = 1,
      limit = 25,
    } = req.query;
    const conditions = [];
    const values = [];
    let i = 1;

    if (action) {
      conditions.push(`action = $${i++}`);
      values.push(action);
    }
    if (adminId) {
      conditions.push(`admin_id = $${i++}`);
      values.push(adminId);
    }
    if (startDate) {
      conditions.push(`created_at >= $${i++}`);
      values.push(startDate);
    }
    if (endDate) {
      conditions.push(`created_at <= $${i++}`);
      values.push(endDate);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * limit;

    const logsResult = await pool.query(
      `SELECT * FROM activity_logs ${where} ORDER BY created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
      [...values, limit, offset],
    );
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM activity_logs ${where}`,
      values,
    );

    res.json({
      logs: logsResult.rows,
      total: Number(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch activity logs." });
  }
});

module.exports = router;
