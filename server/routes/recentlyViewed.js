const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const db = require("../db");
const { authenticate } = require("../middleware/authenticate");

function getAuthUserIdFromHeader(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return null;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "development-secret");
    return payload.userId || null;
  } catch {
    return null;
  }
}

// --- POST record a view (upsert: bumps viewed_at if already viewed) ---
router.post("/", async (req, res) => {
  try {
    const userId = getAuthUserIdFromHeader(req);
    if (!userId) {
      return res.status(200).json({ message: "Guest view ignored." });
    }

    const { listingId } = req.body;

    if (!listingId) {
      return res.status(400).json({ message: "listingId is required." });
    }

    await db.query(
      `INSERT INTO recently_viewed (user_id, listing_id, viewed_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, listing_id)
       DO UPDATE SET viewed_at = NOW()`,
      [userId, listingId],
    );

    res.status(201).json({ message: "Recorded." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to record view." });
  }
});

// --- GET the current user's recently viewed listings, most recent first ---
router.get("/", async (req, res) => {
  try {
    const userId = getAuthUserIdFromHeader(req);
    if (!userId) {
      return res.json({ hotels: [] });
    }

    const limit = Math.min(Number(req.query.limit) || 12, 50);

    const result = await db.query(
      `SELECT l.*, rv.viewed_at,
              COALESCE(
                (SELECT lp.image_url FROM listing_photos lp
                 WHERE lp.listing_id = l.id ORDER BY lp.sort_order ASC LIMIT 1),
                NULL
              ) AS cover_image_url
       FROM recently_viewed rv
       JOIN listings l ON l.id = rv.listing_id
       WHERE rv.user_id = $1 AND l.status = 'active'
       ORDER BY rv.viewed_at DESC
       LIMIT $2`,
      [userId, limit],
    );

    res.json({
      hotels: result.rows.map((row) => ({
        id: row.id,
        name: row.title,
        image: row.cover_image_url,
        accommodationType: row.accommodation_type,
        location: [row.barangay, row.municipality].filter(Boolean).join(", "),
        viewedAt: row.viewed_at,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch recently viewed." });
  }
});

module.exports = router;
