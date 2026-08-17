const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticate, requireAdmin } = require("../middleware/authenticate");
const { logActivity } = require("../services/activityLogger");

// Every route in this file requires a valid admin token
router.use(authenticate, requireAdmin);

// --- GET all users (search by email/name, filter by role) ---
router.get("/users", async (req, res) => {
  try {
    const { search, role } = req.query;
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(
        `(email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`,
      );
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      conditions.push(`role = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await db.query(
      `SELECT id, first_name, last_name, email, picture, role, created_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT 100`,
      values,
    );

    res.json({
      users: result.rows.map((u) => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        picture: u.picture,
        role: u.role,
        createdAt: u.created_at,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch users." });
  }
});

// --- PATCH change a user's role (promote/demote) ---
router.patch("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["guest", "admin"].includes(role)) {
      return res.status(400).json({
        message:
          "Role must be 'guest' or 'admin'. 'Owner' status is granted automatically when a host application is approved.",
      });
    }

    // Prevent an admin from demoting themselves and locking everyone out
    if (Number(id) === req.userId && role !== "admin") {
      return res
        .status(400)
        .json({ message: "You cannot change your own admin role." });
    }

    const updated = await db.query(
      `UPDATE users SET role = $1 WHERE id = $2
       RETURNING id, first_name, last_name, email, role`,
      [role, id],
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const adminResult = await db.query(
      `SELECT first_name, last_name FROM users WHERE id = $1`,
      [req.userId],
    );
    const admin = adminResult.rows[0];

    await logActivity({
      adminId: req.userId,
      adminName: admin ? `${admin.first_name} ${admin.last_name}` : null,
      action: "user.role_changed",
      targetType: "user",
      targetId: id,
      description: `Changed ${updated.rows[0].email}'s role to ${role}`,
      ipAddress: req.ip,
    });

    res.json({
      message: "Role updated.",
      user: {
        id: updated.rows[0].id,
        firstName: updated.rows[0].first_name,
        lastName: updated.rows[0].last_name,
        email: updated.rows[0].email,
        role: updated.rows[0].role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update role." });
  }
});

// --- GET all host applications (filter by status) ---
router.get("/applications", async (req, res) => {
  try {
    const { status } = req.query;
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`ha.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await db.query(
      `SELECT ha.*, u.email AS account_email, u.picture
       FROM host_applications ha
       JOIN users u ON u.id = ha.oid
       ${whereClause}
       ORDER BY ha.created_at DESC`,
      values,
    );

    res.json({
      applications: result.rows.map((row) => ({
        id: row.id,
        userId: row.oid,
        fullName: row.full_name,
        contactNumber: row.contact_number,
        email: row.email,
        accountEmail: row.account_email,
        picture: row.picture,
        proofType: row.proof_type,
        proofFileUrl: row.proof_file_url,
        govIdFrontUrl: row.gov_id_front_url,
        govIdBackUrl: row.gov_id_back_url,
        status: row.status,
        rejectionReason: row.rejection_reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch applications." });
  }
});

// --- PATCH approve an application (also promotes the user to "owner") ---
router.patch("/applications/:id/approve", async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const appResult = await client.query(
      `UPDATE host_applications
       SET status = 'approved', rejection_reason = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING oid`,
      [req.params.id],
    );

    if (appResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Application not found." });
    }

    const ownerId = appResult.rows[0].oid;

    await client.query(
      `UPDATE users SET role = 'owner' WHERE id = $1 AND role != 'admin'`,
      [ownerId],
    );

    await client.query("COMMIT");

    const adminResult = await db.query(
      `SELECT first_name, last_name FROM users WHERE id = $1`,
      [req.userId],
    );
    const admin = adminResult.rows[0];

    await logActivity({
      adminId: req.userId,
      adminName: admin ? `${admin.first_name} ${admin.last_name}` : null,
      action: "application.approved",
      targetType: "host_application",
      targetId: req.params.id,
      description: `Approved host application #${req.params.id}`,
      ipAddress: req.ip,
    });

    res.json({ message: "Application approved." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Failed to approve application." });
  } finally {
    client.release();
  }
});

// --- PATCH reject an application (requires a reason) ---
router.patch("/applications/:id/reject", async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Rejection reason is required." });
    }

    const result = await db.query(
      `UPDATE host_applications
       SET status = 'rejected', rejection_reason = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id`,
      [reason.trim(), req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Application not found." });
    }

    const adminResult = await db.query(
      `SELECT first_name, last_name FROM users WHERE id = $1`,
      [req.userId],
    );
    const admin = adminResult.rows[0];

    await logActivity({
      adminId: req.userId,
      adminName: admin ? `${admin.first_name} ${admin.last_name}` : null,
      action: "application.rejected",
      targetType: "host_application",
      targetId: req.params.id,
      description: `Rejected host application #${req.params.id}: ${reason.trim()}`,
      ipAddress: req.ip,
    });

    res.json({ message: "Application rejected." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to reject application." });
  }
});

module.exports = router;
