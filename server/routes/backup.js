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

const PG_BIN = "C:\\Program Files\\PostgreSQL\\18\\bin";
const PG_DUMP = path.join(PG_BIN, "pg_dump.exe");
const PSQL = path.join(PG_BIN, "psql.exe");

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

// Require the admin to re-enter their password immediately before this
// action, even though they already have a valid session. Protects against
// a hijacked or left-open admin session being used to wipe the database.
async function requireReauth(req, res, next) {
  const { password } = req.body;
  if (!password) {
    return res
      .status(400)
      .json({ message: "Password confirmation is required." });
  }
  try {
    const result = await pool.query(
      "SELECT password_hash FROM admins WHERE id = $1",
      [req.userId],
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Not authorized." });
    }
    const valid = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Incorrect password." });
    }
    next();
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

async function logAdminAction(userId, action, ip, meta = {}) {
  try {
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, action, ip_address, meta, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, action, ip, JSON.stringify(meta)],
    );
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

function runPgDumpToFile(outPath) {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(outPath);
    const dump = spawn(
      PG_DUMP,
      [...pgArgs(), "--no-owner", "--no-privileges"],
      { env: pgEnv() },
    );
    dump.stdout.pipe(out);
    dump.on("error", reject);
    dump.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`pg_dump exited ${code}`)),
    );
  });
}

function runPsqlRestore(sqlFilePath) {
  return new Promise((resolve, reject) => {
    const restore = spawn(
      PSQL,
      [
        ...pgArgs(),
        "--single-transaction",
        "--set",
        "ON_ERROR_STOP=on",
        "--file",
        sqlFilePath,
      ],
      { env: pgEnv() },
    );
    let stderr = "";
    restore.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    restore.on("error", reject);
    restore.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(stderr || `psql exited ${code}`)),
    );
  });
}

// --- GET /api/admin/backup/download ---
router.get("/download", authenticate, requireAdmin, async (req, res) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `aurorastay-backup-${timestamp}.sql`;

  res.setHeader("Content-Type", "application/sql");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const dump = spawn(PG_DUMP, [...pgArgs(), "--no-owner", "--no-privileges"], {
    env: pgEnv(),
  });

  dump.stdout.pipe(res);

  let stderr = "";
  dump.stderr.on("data", (chunk) => (stderr += chunk.toString()));

  dump.on("error", (err) => {
    console.error("pg_dump failed to start:", err);
    if (!res.headersSent) res.status(500).json({ message: "Backup failed." });
  });

  dump.on("close", (code) => {
    if (code !== 0) console.error("pg_dump exited with code", code, stderr);
    logAdminAction(req.userId, "backup_download", req.ip);
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
      const safetyBackupPath = path.join(
        os.tmpdir(),
        `pre-restore-safety-${Date.now()}.sql`,
      );
      await runPgDumpToFile(safetyBackupPath);

      await runPsqlRestore(uploadedPath);

      await logAdminAction(req.userId, "restore", req.ip, {
        originalFilename: req.file.originalname,
        safetyBackupPath,
      });

      res.json({
        message:
          "Database restored successfully. A safety backup of the prior state was saved on the server.",
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
