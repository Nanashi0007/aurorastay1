import express from "express";
import pool from "../db.js"; // adjust path to your pg Pool

const router = express.Router();

// GET /api/hotels?minPrice=1000&maxPrice=5000&type=Resort&amenities=WiFi,Pool&destination=baler&checkIn=2026-08-16&checkOut=2026-08-23&guests=2
router.get("/hotels", async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const {
      minPrice,
      maxPrice,
      type,
      amenities,
      destination,
      checkIn,
      checkOut,
      guests,
    } = req.query;

    let query = `SELECT * FROM hotels WHERE 1=1`;
    const params = [];

    if (minPrice) {
      params.push(minPrice);
      query += ` AND price >= $${params.length}`;
    }

    if (maxPrice) {
      params.push(maxPrice);
      query += ` AND price <= $${params.length}`;
    }

    if (type) {
      params.push(type);
      query += ` AND type = $${params.length}`;
    }

    if (amenities) {
      // expects a postgres text[] (or jsonb array) column named "amenities"
      const amenitiesArr = amenities.split(",");
      params.push(amenitiesArr);
      query += ` AND amenities @> $${params.length}`;
    }

    // ASSUMPTION: hotels.location or hotels.city holds the searchable place name.
    // Swap "location" below for your actual column.
    if (destination) {
      params.push(`%${destination}%`);
      query += ` AND location ILIKE $${params.length}`;
    }

    // ASSUMPTION: hotels.max_guests (int) holds room/hotel capacity.
    // Swap "max_guests" below for your actual column.
    if (guests) {
      params.push(guests);
      query += ` AND max_guests >= $${params.length}`;
    }

    // ASSUMPTION: availability is tracked in a separate "bookings" table
    // with hotel_id, check_in, check_out columns. This excludes hotels
    // that already have an overlapping booking for the requested range.
    // If you don't have a bookings table yet, remove this block —
    // date filtering has no effect until you do.
    if (checkIn && checkOut) {
      params.push(checkIn, checkOut);
      query += ` AND NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.hotel_id = hotels.id
        AND b.check_in < $${params.length}
        AND b.check_out > $${params.length - 1}
      )`;
    }

    query += ` ORDER BY id`;

    console.log("Query:", query);
    console.log("Params:", params);

    const result = await pool.query(query, params);
    console.log(`Returned ${result.rows.length} rows`);
    res.json({ hotels: result.rows });
  } catch (err) {
    console.error("Error fetching hotels:", err);
    res.status(500).json({ error: "Failed to fetch hotels" });
  }
});

export default router;
