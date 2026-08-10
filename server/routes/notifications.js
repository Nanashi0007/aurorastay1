const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticate } = require("../middleware/authenticate");

function mapNotificationRow(row) {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    relatedBookingId: row.related_booking_id,
    read: row.read,
    createdAt: row.created_at,
  };
}

// --- GET current user's notifications ---
router.get("/", authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.userId],
    );
    res.json({ notifications: result.rows.map(mapNotificationRow) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch notifications." });
  }
});

// --- GET unread count (cheap call for the bell badge) ---
router.get("/unread-count", authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false`,
      [req.userId],
    );
    res.json({ count: Number(result.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch unread count." });
  }
});

// --- PATCH mark one notification as read ---
router.patch("/:id/read", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE notifications SET read = true
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.userId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Notification not found." });
    }
    res.json({ notification: mapNotificationRow(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update notification." });
  }
});

// --- PATCH mark all as read (used when the bell dropdown opens) ---
router.patch("/read-all", authenticate, async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`,
      [req.userId],
    );
    res.json({ message: "All notifications marked as read." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update notifications." });
  }
});

module.exports = router;
