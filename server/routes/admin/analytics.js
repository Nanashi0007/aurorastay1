// server/routes/admin/analytics.js
const express = require("express");
const router = express.Router();
const db = require("../../db");
const { authenticate, requireAdmin } = require("../../middleware/authenticate");

// --- GET /api/admin/analytics/overview ---
router.get("/overview", authenticate, requireAdmin, async (req, res) => {
  try {
    const [
      listingsResult,
      activeListingsResult,
      bookingsResult,
      revenueResult,
      guestsResult,
      ownersResult,
      usersResult,
    ] = await Promise.all([
      db.query("SELECT COUNT(*) AS count FROM listings"),
      db.query(
        `SELECT status, COUNT(*) AS count FROM listings GROUP BY status`,
      ),
      db.query("SELECT COUNT(*) AS count FROM bookings"),
      db.query(
        `SELECT COALESCE(SUM(total_price), 0) AS total
         FROM bookings WHERE status = 'confirmed'`,
      ),
      db.query(
        `SELECT COALESCE(SUM(guests_count), 0) AS total
         FROM bookings WHERE status = 'confirmed'`,
      ),
      db.query(`SELECT COUNT(DISTINCT owner_id) AS count FROM listings`),
      db.query("SELECT COUNT(*) AS count FROM users"),
    ]);

    const totalListings = Number(listingsResult.rows[0].count);
    const totalUsers = Number(usersResult.rows[0].count);
    const totalOwners = Number(ownersResult.rows[0].count);

    const activeInactive = { active: 0, inactive: 0 };
    activeListingsResult.rows.forEach((row) => {
      if (row.status === "active") activeInactive.active = Number(row.count);
      else activeInactive.inactive += Number(row.count);
    });

    res.json({
      totalListings,
      activeListings: activeInactive.active,
      inactiveListings: activeInactive.inactive,
      totalBookings: Number(bookingsResult.rows[0].count),
      totalConfirmedRevenue: Number(revenueResult.rows[0].total),
      totalGuestsHosted: Number(guestsResult.rows[0].total),
      totalOwners,
      totalTourists: Math.max(totalUsers - totalOwners, 0),
    });
  } catch (err) {
    console.error("Overview analytics failed:", err);
    res.status(500).json({ message: "Failed to load overview stats." });
  }
});

router.get("/listings", authenticate, requireAdmin, async (req, res) => {
  try {
    const [
      byMunicipalityResult,
      byTypeResult,
      byAmenityResult,
      mapResult,
      newListingsResult,
    ] = await Promise.all([
      db.query(
        `SELECT municipality, barangay, COUNT(*) AS count
         FROM listings
         GROUP BY municipality, barangay
         ORDER BY count DESC`,
      ),
      db.query(
        `SELECT accommodation_type, COUNT(*) AS count
         FROM listings
         GROUP BY accommodation_type
         ORDER BY count DESC`,
      ),
      db.query(
        `SELECT unnest(amenities) AS amenity, COUNT(*) AS count
         FROM listings
         GROUP BY amenity
         ORDER BY count DESC`,
      ),
      db.query(
        `SELECT id, title, accommodation_type, municipality, barangay,
                latitude, longitude, status
         FROM listings
         WHERE latitude IS NOT NULL AND longitude IS NOT NULL`,
      ),
      db.query(
        `SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*) AS count
         FROM listings
         GROUP BY month
         ORDER BY month ASC`,
      ),
    ]);

    res.json({
      byLocation: byMunicipalityResult.rows.map((row) => ({
        municipality: row.municipality,
        barangay: row.barangay,
        count: Number(row.count),
      })),
      byType: byTypeResult.rows.map((row) => ({
        type: row.accommodation_type,
        count: Number(row.count),
      })),
      byAmenity: byAmenityResult.rows.map((row) => ({
        amenity: row.amenity,
        count: Number(row.count),
      })),
      mapPoints: mapResult.rows.map((row) => ({
        id: row.id,
        title: row.title,
        type: row.accommodation_type,
        location: [row.barangay, row.municipality].filter(Boolean).join(", "),
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        status: row.status,
      })),
      newListingsOverTime: newListingsResult.rows.map((row) => ({
        month: row.month,
        count: Number(row.count),
      })),
    });
  } catch (err) {
    console.error("Listings analytics failed:", err);
    res.status(500).json({ message: "Failed to load listings stats." });
  }
});

module.exports = router;
