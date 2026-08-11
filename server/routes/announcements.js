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

// --- GET a single announcement by id (any logged-in user) ---
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query("SELECT * FROM announcements WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Announcement not found." });
    }

    res.json({ announcement: mapAnnouncementRow(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch announcement." });
  }
});

module.exports = router;
