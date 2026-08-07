import express from "express";
import pool from "../db/pool.js"; // adjust path to your pg Pool

const router = express.Router();

// GET /api/hotels?minPrice=1000&maxPrice=5000&type=Resort&amenities=WiFi,Pool
router.get("/hotels", async (req, res) => {
  try {
    const { minPrice, maxPrice, type, amenities } = req.query;

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

    query += ` ORDER BY id`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching hotels:", err);
    res.status(500).json({ error: "Failed to fetch hotels" });
  }
});

export default router;
