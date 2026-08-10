const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticate } = require("../middleware/authenticate");

// --- GET all listing IDs the current guest has saved (lightweight, for heart state) ---
router.get("/ids", authenticate, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT listing_id FROM saved_listings WHERE guest_id = $1",
      [req.userId],
    );
    res.json({ listingIds: result.rows.map((r) => r.listing_id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch saved listings." });
  }
});

// --- GET full saved listings (for the Saved page) ---
router.get("/", authenticate, async (req, res) => {
  try {
    const listingsResult = await db.query(
      `SELECT l.*, MIN(r.price_per_night) AS min_price
   FROM saved_listings sl
   JOIN listings l ON l.id = sl.listing_id
   LEFT JOIN rooms r ON r.property_id = l.id AND r.status = 'active'
   WHERE sl.guest_id = $1 AND l.status = 'active'
   GROUP BY l.id, sl.created_at
   ORDER BY sl.created_at DESC`,
      [req.userId],
    );

    const listingIds = listingsResult.rows.map((row) => row.id);

    let photosByListing = {};
    let reviewStatsByListing = {};

    if (listingIds.length > 0) {
      const photosResult = await db.query(
        `SELECT * FROM listing_photos WHERE listing_id = ANY($1) ORDER BY sort_order ASC`,
        [listingIds],
      );
      photosByListing = photosResult.rows.reduce((acc, photo) => {
        if (!acc[photo.listing_id]) acc[photo.listing_id] = [];
        acc[photo.listing_id].push(photo);
        return acc;
      }, {});

      const reviewsResult = await db.query(
        `SELECT listing_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
         FROM reviews
         WHERE listing_id = ANY($1)
         GROUP BY listing_id`,
        [listingIds],
      );
      reviewStatsByListing = reviewsResult.rows.reduce((acc, row) => {
        acc[row.listing_id] = row;
        return acc;
      }, {});
    }

    // reuse the same shape as /api/hotels so HotelCard works unchanged
    const coverImage = (photos) =>
      photos.find((p) => p.sort_order === 0)?.image_url ||
      photos[0]?.image_url ||
      null;

    const hotels = listingsResult.rows.map((row) => {
      const photos = photosByListing[row.id] || [];
      const reviewStats = reviewStatsByListing[row.id] || null;
      const avgRating = reviewStats?.avg_rating
        ? Number(reviewStats.avg_rating)
        : null;

      return {
        id: row.id,
        type: row.accommodation_type,
        name: row.title,
        location: `${row.barangay}, ${row.municipality}`,
        completeAddress: row.complete_address,
        latitude: row.latitude,
        longitude: row.longitude,
        price:
          row.min_price != null ? Number(row.min_price).toLocaleString() : null,
        image: coverImage(photos),
        images: photos.map((p) => p.image_url),
        amenities: row.amenities || [],
        rating: avgRating ? Math.round(avgRating * 2 * 10) / 10 : null,
        reviews: reviewStats?.review_count
          ? Number(reviewStats.review_count)
          : null,
      };
    });

    res.json({ hotels });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch saved listings." });
  }
});

// --- POST save a listing ---
router.post("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      `INSERT INTO saved_listings (guest_id, listing_id)
       VALUES ($1, $2)
       ON CONFLICT (guest_id, listing_id) DO NOTHING`,
      [req.userId, id],
    );
    res.status(201).json({ message: "Listing saved." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save listing." });
  }
});

// --- DELETE unsave a listing ---
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      "DELETE FROM saved_listings WHERE guest_id = $1 AND listing_id = $2",
      [req.userId, id],
    );
    res.json({ message: "Listing unsaved." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to unsave listing." });
  }
});

module.exports = router;
