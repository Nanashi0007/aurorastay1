const pool = require("../db"); // adjust to your actual pool path

async function logActivity({
  adminId,
  adminName,
  action,
  targetType,
  targetId,
  description,
  metadata,
  ipAddress,
}) {
  try {
    await pool.query(
      `INSERT INTO activity_logs
        (admin_id, admin_name, action, target_type, target_id, description, metadata, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        adminId,
        adminName,
        action,
        targetType,
        targetId,
        description,
        metadata ? JSON.stringify(metadata) : null,
        ipAddress,
      ],
    );
  } catch (err) {
    // Never let a logging failure break the actual admin action
    console.error("Failed to log activity:", err);
  }
}

module.exports = { logActivity };
