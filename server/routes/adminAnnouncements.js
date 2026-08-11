const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticate } = require("../middleware/authenticate");

function mapAnnouncementRow(row) {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    audience: row.audience,
    createdAt: row.created_at,
  };
}

// --- GET all announcements (admin history view) ---
router.get("/", authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM announcements ORDER BY created_at DESC LIMIT 100`,
    );
    res.json({ announcements: result.rows.map(mapAnnouncementRow) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch announcements." });
  }
});

// --- POST create an announcement and fan it out to matching users ---
router.post("/", authenticate, async (req, res) => {
  const client = await db.connect();
  try {
    const { title, message, audience } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required." });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required." });
    }
    if (!["all", "guest", "owner"].includes(audience)) {
      return res.status(400).json({ message: "Invalid audience." });
    }

    await client.query("BEGIN");

    const inserted = await client.query(
      `INSERT INTO announcements (title, message, audience, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title.trim(), message.trim(), audience, req.userId],
    );
    const announcement = inserted.rows[0];

    const userQuery =
      audience === "all"
        ? `SELECT id FROM users`
        : `SELECT id FROM users WHERE role = $1`;
    const userParams = audience === "all" ? [] : [audience];

    const usersResult = await client.query(userQuery, userParams);

    if (usersResult.rows.length > 0) {
      const values = [];
      const placeholders = usersResult.rows
        .map((u, i) => {
          const base = i * 4;
          values.push(u.id, "announcement", title.trim(), announcement.id);
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
        })
        .join(", ");

      await client.query(
        `INSERT INTO notifications (user_id, type, message, related_announcement_id)
         VALUES ${placeholders}`,
        values,
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Announcement sent.",
      announcement: mapAnnouncementRow(announcement),
      recipientCount: usersResult.rows.length,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Failed to send announcement." });
  } finally {
    client.release();
  }
});

// --- DELETE an announcement (removes the record; leaves already-sent notifications as history) ---
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      "DELETE FROM announcements WHERE id = $1 RETURNING id",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Announcement not found." });
    }
    res.json({ message: "Announcement deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete announcement." });
  }
});

module.exports = router;
