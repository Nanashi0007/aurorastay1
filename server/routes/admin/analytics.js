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
      listingsByStatusResult,
      bookingsResult,
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
        `SELECT COALESCE(SUM(guests_count), 0) AS total
         FROM bookings WHERE status = 'confirmed'`,
      ),
      db.query(
        `SELECT COUNT(DISTINCT oid) AS count
         FROM host_applications
         WHERE status = 'approved'`,
      ),
      db.query("SELECT COUNT(*) AS count FROM users"),
    ]);

    const totalListings = Number(listingsResult.rows[0].count);
    const totalUsers = Number(usersResult.rows[0].count);
    const totalOwners = Number(ownersResult.rows[0].count);

    const activeInactive = { active: 0, inactive: 0 };
    listingsByStatusResult.rows.forEach((row) => {
      if (row.status === "active") activeInactive.active = Number(row.count);
      else activeInactive.inactive += Number(row.count);
    });

    res.json({
      totalListings,
      activeListings: activeInactive.active,
      inactiveListings: activeInactive.inactive,
      totalBookings: Number(bookingsResult.rows[0].count),
      totalGuestsHosted: Number(guestsResult.rows[0].total),
      totalOwners,
      totalTourists: Math.max(totalUsers - totalOwners, 0),
    });
  } catch (err) {
    console.error("Overview analytics failed:", err);
    res.status(500).json({ message: "Failed to load overview stats." });
  }
});

// --- GET /api/admin/analytics/listings ---
router.get("/listings", authenticate, requireAdmin, async (req, res) => {
  try {
    const [
      byMunicipalityResult,
      byTypeResult,
      byAmenityResult,
      mapPointsResult,
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
                status, latitude, longitude
         FROM listings
         WHERE latitude IS NOT NULL AND longitude IS NOT NULL`,
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
      mapPoints: mapPointsResult.rows.map((row) => ({
        id: row.id,
        title: row.title,
        type: row.accommodation_type,
        location: [row.barangay, row.municipality].filter(Boolean).join(", "),
        status: row.status,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
      })),
    });
  } catch (err) {
    console.error("Listings analytics failed:", err);
    res.status(500).json({ message: "Failed to load listings stats." });
  }
});

// --- GET /api/admin/analytics/bookings ---
router.get("/bookings", authenticate, requireAdmin, async (req, res) => {
  try {
    const [
      volumeTrendResult,
      funnelResult,
      revenueResult,
      topListingsResult,
      topMunicipalitiesResult,
    ] = await Promise.all([
      db.query(
        `SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*) AS count
         FROM bookings
         GROUP BY month
         ORDER BY month ASC`,
      ),
      db.query(
        `SELECT status, COUNT(*) AS count
         FROM bookings
         GROUP BY status`,
      ),
      db.query(
        `SELECT COALESCE(SUM(total_price), 0) AS total
         FROM bookings
         WHERE status = 'confirmed'`,
      ),
      db.query(
        `SELECT l.id, l.title, l.municipality, l.barangay,
                COUNT(b.id) AS booking_count,
                COALESCE(SUM(b.total_price) FILTER (WHERE b.status = 'confirmed'), 0) AS revenue
         FROM bookings b
         JOIN rooms r ON r.id = b.room_id
         JOIN listings l ON l.id = r.property_id
         GROUP BY l.id, l.title, l.municipality, l.barangay
         ORDER BY booking_count DESC
         LIMIT 10`,
      ),
      db.query(
        `SELECT l.municipality,
                COUNT(b.id) AS booking_count,
                COALESCE(SUM(b.total_price) FILTER (WHERE b.status = 'confirmed'), 0) AS revenue
         FROM bookings b
         JOIN rooms r ON r.id = b.room_id
         JOIN listings l ON l.id = r.property_id
         GROUP BY l.municipality
         ORDER BY booking_count DESC
         LIMIT 10`,
      ),
    ]);

    const funnel = { pending: 0, confirmed: 0, declined: 0, cancelled: 0 };
    funnelResult.rows.forEach((row) => {
      if (row.status in funnel) funnel[row.status] = Number(row.count);
    });
    const decidedCount = funnel.confirmed + funnel.declined;

    res.json({
      volumeTrend: volumeTrendResult.rows.map((row) => ({
        month: row.month,
        count: Number(row.count),
      })),
      funnel: {
        pending: funnel.pending,
        confirmed: funnel.confirmed,
        declined: funnel.declined,
        cancelled: funnel.cancelled,
        confirmRate:
          decidedCount > 0
            ? Math.round((funnel.confirmed / decidedCount) * 1000) / 10
            : null,
        declineRate:
          decidedCount > 0
            ? Math.round((funnel.declined / decidedCount) * 1000) / 10
            : null,
      },
      totalConfirmedRevenue: Number(revenueResult.rows[0].total),
      topListings: topListingsResult.rows.map((row) => ({
        id: row.id,
        title: row.title,
        location: [row.barangay, row.municipality].filter(Boolean).join(", "),
        bookingCount: Number(row.booking_count),
        revenue: Number(row.revenue),
      })),
      topMunicipalities: topMunicipalitiesResult.rows.map((row) => ({
        municipality: row.municipality,
        bookingCount: Number(row.booking_count),
        revenue: Number(row.revenue),
      })),
    });
  } catch (err) {
    console.error("Bookings analytics failed:", err);
    res.status(500).json({ message: "Failed to load bookings stats." });
  }
});

// --- GET /api/admin/analytics/growth ---
router.get("/growth", authenticate, requireAdmin, async (req, res) => {
  try {
    const [ownerSignupsResult, listingCreationResult, userSignupsResult] =
      await Promise.all([
        db.query(
          `SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*) AS count
           FROM host_applications
           WHERE status = 'approved'
           GROUP BY month
           ORDER BY month ASC`,
        ),
        db.query(
          `SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*) AS count
           FROM listings
           GROUP BY month
           ORDER BY month ASC`,
        ),
        db.query(
          `SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*) AS count
           FROM users
           GROUP BY month
           ORDER BY month ASC`,
        ),
      ]);

    res.json({
      ownerSignups: ownerSignupsResult.rows.map((row) => ({
        month: row.month,
        count: Number(row.count),
      })),
      listingCreation: listingCreationResult.rows.map((row) => ({
        month: row.month,
        count: Number(row.count),
      })),
      userSignups: userSignupsResult.rows.map((row) => ({
        month: row.month,
        count: Number(row.count),
      })),
    });
  } catch (err) {
    console.error("Growth analytics failed:", err);
    res.status(500).json({ message: "Failed to load growth stats." });
  }
});

// --- GET /api/admin/analytics/overview/listings?status=active|inactive ---
router.get(
  "/overview/listings",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { status } = req.query;
      let query = `SELECT id, title, accommodation_type, municipality, barangay, status, created_at
                 FROM listings`;
      if (status === "active") query += ` WHERE status = 'active'`;
      else if (status === "inactive") query += ` WHERE status != 'active'`;
      query += ` ORDER BY created_at DESC`;

      const result = await db.query(query);
      res.json({ listings: result.rows });
    } catch (err) {
      console.error("Overview listings detail failed:", err);
      res.status(500).json({ message: "Failed to load listings." });
    }
  },
);

// --- GET /api/admin/analytics/overview/bookings?status=confirmed ---
router.get(
  "/overview/bookings",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { status } = req.query;
      let query = `SELECT b.id, b.guest_name, b.check_in, b.check_out, b.guests_count,
                        b.status, b.total_price, b.created_at, l.title
                 FROM bookings b
                 JOIN rooms r ON r.id = b.room_id
                 JOIN listings l ON l.id = r.property_id`;
      const params = [];
      if (status) {
        params.push(status);
        query += ` WHERE b.status = $1`;
      }
      query += ` ORDER BY b.created_at DESC`;

      const result = await db.query(query, params);
      res.json({ bookings: result.rows });
    } catch (err) {
      console.error("Overview bookings detail failed:", err);
      res.status(500).json({ message: "Failed to load bookings." });
    }
  },
);

// --- GET /api/admin/analytics/overview/owners ---
router.get("/overview/owners", authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ha.id, ha.oid, ha.full_name, ha.email, ha.accommodation_name,
              ha.accommodation_type, ha.municipality, ha.created_at
       FROM host_applications ha
       WHERE ha.status = 'approved'
       ORDER BY ha.created_at DESC`,
    );
    res.json({ owners: result.rows });
  } catch (err) {
    console.error("Overview owners detail failed:", err);
    res.status(500).json({ message: "Failed to load owners." });
  }
});

// --- GET /api/admin/analytics/overview/tourists ---
router.get(
  "/overview/tourists",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const result = await db.query(
        `SELECT u.id, u.first_name, u.last_name, u.email, u.created_at
       FROM users u
       WHERE u.id NOT IN (
         SELECT oid FROM host_applications WHERE status = 'approved'
       )
       ORDER BY u.created_at DESC`,
      );
      res.json({ tourists: result.rows });
    } catch (err) {
      console.error("Overview tourists detail failed:", err);
      res.status(500).json({ message: "Failed to load tourists." });
    }
  },
);

module.exports = router;
