const express = require("express");
const pool = require("../db");
const { authenticate, requireAdmin } = require("../middleware/authenticate");
const { logActivity } = require("../services/activityLogger");

const router = express.Router();
router.use(authenticate, requireAdmin);

function mapApplicationRow(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    contactNumber: row.contact_number,
    email: row.email,
    proofType: row.proof_type,
    proofFileUrl: row.proof_file_url,
    govIdFrontUrl: row.gov_id_front_url,
    govIdBackUrl: row.gov_id_back_url,
    status: row.status,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
  };
}

router.get("/", async (req, res) => {
  try {
    const { status, search } = req.query;
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (search) {
      conditions.push(
        `(full_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`,
      );
      values.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const result = await pool.query(
      `SELECT * FROM host_applications ${whereClause} ORDER BY created_at DESC`,
      values,
    );

    res.json({ applications: result.rows.map(mapApplicationRow) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch applications." });
  }
});

router.patch("/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await pool.query(
      `UPDATE host_applications
       SET status = 'approved', rejection_reason = NULL
       WHERE id = $1
       RETURNING *`,
      [id],
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ message: "Application not found." });
    }

    const adminResult = await pool.query(
      `SELECT first_name, last_name FROM users WHERE id = $1`,
      [req.userId],
    );
    const admin = adminResult.rows[0];

    await logActivity({
      adminId: req.userId,
      adminName: admin ? `${admin.first_name} ${admin.last_name}` : null,
      action: "application.approved",
      targetType: "host_application",
      targetId: id,
      description: `Approved host application #${id}`,
      ipAddress: req.ip,
    });

    res.json({
      message: "Application approved.",
      application: mapApplicationRow(updated.rows[0]),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to approve application." });
  }
});

router.patch("/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res
        .status(400)
        .json({ message: "A rejection reason is required." });
    }

    const updated = await pool.query(
      `UPDATE host_applications
       SET status = 'rejected', rejection_reason = $1
       WHERE id = $2
       RETURNING *`,
      [reason.trim(), id],
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ message: "Application not found." });
    }

    const adminResult = await pool.query(
      `SELECT first_name, last_name FROM users WHERE id = $1`,
      [req.userId],
    );
    const admin = adminResult.rows[0];

    await logActivity({
      adminId: req.userId,
      adminName: admin ? `${admin.first_name} ${admin.last_name}` : null,
      action: "application.rejected",
      targetType: "host_application",
      targetId: id,
      description: `Rejected host application #${id}: ${reason.trim()}`,
      ipAddress: req.ip,
    });

    res.json({
      message: "Application rejected.",
      application: mapApplicationRow(updated.rows[0]),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to reject application." });
  }
});

module.exports = router;
