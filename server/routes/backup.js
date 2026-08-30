// server/routes/backup.js
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");
const multer = require("multer");
const bcrypt = require("bcrypt");
const pool = require("../db");
const { authenticate, requireAdmin } = require("../middleware/authenticate");
const { logActivity } = require("../services/activityLogger"); // ADJUST path if it lives elsewhere

const PG_DUMP = process.env.PG_DUMP_PATH || "pg_dump";

const CONFIRM_PHRASE = "RESTORE DATABASE";

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB — adjust to your DB size
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== ".sql") {
      return cb(new Error("Only .sql files are accepted."));
    }
    cb(null, true);
  },
});

// Handles two possible admin identities:
//   1. A row in `admins` (logged in via the username/password form) —
//      requires the actual account password.
//   2. A row in `users` with role = 'admin' (logged in via Google) —
//      has no app password to check, so instead requires the typed
//      confirmation phrase as the step-up factor.
// Either way, the typed confirmation phrase is always required.
async function requireReauth(req, res, next) {
  const { password, confirmText } = req.body;

  if (confirmText !== CONFIRM_PHRASE) {
    return res
      .status(400)
      .json({ message: `Type "${CONFIRM_PHRASE}" exactly to confirm.` });
  }

  try {
    const adminResult = await pool.query(
      "SELECT password_hash FROM admins WHERE id = $1",
      [req.userId],
    );

    if (adminResult.rows.length > 0) {
      if (!password) {
        return res
          .status(400)
          .json({ message: "Password confirmation is required." });
      }
      const valid = await bcrypt.compare(
        password,
        adminResult.rows[0].password_hash,
      );
      if (!valid) {
        return res.status(401).json({ message: "Incorrect password." });
      }
      return next();
    }

    const userResult = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND role = 'admin'",
      [req.userId],
    );

    if (userResult.rows.length > 0) {
      return next();
    }

    return res.status(401).json({ message: "Not authorized." });
  } catch (err) {
    console.error("Reauth check failed:", err);
    res.status(500).json({ message: "Server error." });
  }
}

function pgEnv() {
  return { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || "" };
}

function pgArgs() {
  return [
    "--host",
    process.env.DB_HOST || "localhost",
    "--port",
    String(process.env.DB_PORT || 5432),
    "--username",
    process.env.DB_USER || "postgres",
    "--dbname",
    process.env.DB_NAME || "aurorastay",
  ];
}

// --- Restore via the pg pool directly (no psql binary required) ---
async function runSqlRestore(sqlFilePath) {
  const sql = fs.readFileSync(sqlFilePath, "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// --- GET /api/admin/backup/download ---
router.get("/download", authenticate, requireAdmin, async (req, res) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `aurorastay-backup-${timestamp}.sql`;

  res.setHeader("Content-Type", "application/sql");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const dump = spawn(
    PG_DUMP,
    [
      ...pgArgs(),
      "--schema=public",
      "--no-owner",
      "--no-privileges",
      "--clean",
      "--if-exists",
    ],
    { env: pgEnv() },
  );

  dump.stdout.pipe(res);

  let stderr = "";
  dump.stderr.on("data", (chunk) => (stderr += chunk.toString()));

  dump.on("error", (err) => {
    console.error("pg_dump failed to start:", err);
    if (!res.headersSent) res.status(500).json({ message: "Backup failed." });
  });

  dump.on("close", (code) => {
    if (code !== 0) console.error("pg_dump exited with code", code, stderr);
    logActivity({
      adminId: req.userId,
      adminName: req.userUsername || null,
      action: "backup_download",
      targetType: "database",
      targetId: null,
      description: "Downloaded a full database backup.",
      metadata: { filename },
      ipAddress: req.ip,
    });
  });
});

// --- POST /api/admin/backup/restore ---
router.post(
  "/restore",
  authenticate,
  requireAdmin,
  upload.single("backupFile"),
  requireReauth,
  async (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "A .sql backup file is required." });
    }

    const uploadedPath = req.file.path;

    try {
      await runSqlRestore(uploadedPath);

      await logActivity({
        adminId: req.userId,
        adminName: req.userUsername || null,
        action: "restore",
        targetType: "database",
        targetId: null,
        description: "Restored the database from an uploaded backup file.",
        metadata: {
          originalFilename: req.file.originalname,
        },
        ipAddress: req.ip,
      });

      res.json({
        message: "Database restored successfully.",
      });
    } catch (err) {
      console.error("Restore failed:", err);
      res.status(500).json({
        message:
          "Restore failed. Check server logs. No changes were committed.",
      });
    } finally {
      fs.unlink(uploadedPath, () => {});
    }
  },
);

module.exports = router;
