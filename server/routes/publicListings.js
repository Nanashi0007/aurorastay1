const express = require("express");
const router = express.Router();
const db = require("../db");

function mapListingToHotelCard(
  row,
  photos = [],
  minPrice = null,
  reviewStats = null,
) {
  const coverImage =
    photos.find((p) => p.sort_order === 0)?.image_url ||
    photos[0]?.image_url ||
    null;

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
    price: minPrice != null ? Number(minPrice).toLocaleString() : null,
    image: coverImage,
    images: photos.map((p) => p.image_url),
    amenities: row.amenities || [],
    maxGuests: row.max_guests,
    roomType: row.room_type,
    rooms:
      row.rooms_available > 0
        ? `${row.rooms_available} room${row.rooms_available > 1 ? "s" : ""} left today`
        : "Fully booked",
    rating: avgRating ? Math.round(avgRating * 2 * 10) / 10 : null, // out of 10, e.g. 9.5
    reviews: reviewStats?.review_count
      ? Number(reviewStats.review_count)
      : null,
  };
}

// --- GET all active listings (public — for homepage/browse) ---
router.get("/", async (req, res) => {
  try {
    const { minPrice, maxPrice, type, amenities } = req.query;

    const conditions = ["l.status = 'active'"];
    const havingConditions = [];
    const values = [];
    let paramIndex = 1;

    if (type) {
      const types = type
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (types.length > 0) {
        conditions.push(`l.accommodation_type = ANY($${paramIndex})`);
        values.push(types);
        paramIndex++;
      }
    }

    if (amenities) {
      const amenityList = amenities
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      if (amenityList.length > 0) {
        // @> = "amenities column contains all of these values"
        conditions.push(`l.amenities @> $${paramIndex}`);
        values.push(amenityList);
        paramIndex++;
      }
    }

    if (minPrice && !isNaN(Number(minPrice))) {
      havingConditions.push(`MIN(r.price_per_night) >= $${paramIndex}`);
      values.push(Number(minPrice));
      paramIndex++;
    }

    if (maxPrice && !isNaN(Number(maxPrice))) {
      havingConditions.push(`MIN(r.price_per_night) <= $${paramIndex}`);
      values.push(Number(maxPrice));
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const havingClause =
      havingConditions.length > 0
        ? `HAVING ${havingConditions.join(" AND ")}`
        : "";

    const listingsResult = await db.query(
      `SELECT l.*, MIN(r.price_per_night) AS min_price
       FROM listings l
       LEFT JOIN rooms r ON r.property_id = l.id AND r.status = 'active'
       ${whereClause}
       GROUP BY l.id
       ${havingClause}
       ORDER BY l.id DESC`,
      values,
    );

    const listingIds = listingsResult.rows.map((row) => row.id);

    let reviewStatsByListing = {};
    if (listingIds.length > 0) {
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

    let photosByListing = {};
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
    }

    const hotels = listingsResult.rows.map((row) =>
      mapListingToHotelCard(
        row,
        photosByListing[row.id] || [],
        row.min_price,
        reviewStatsByListing[row.id] || null,
      ),
    );

    res.json({ hotels });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- GET filter options (accommodation types, amenities, price bounds) ---
router.get("/filters/meta", async (req, res) => {
  try {
    const typesResult = await db.query(
      `SELECT DISTINCT accommodation_type
       FROM listings
       WHERE status = 'active'
       ORDER BY accommodation_type`,
    );

    const amenitiesResult = await db.query(
      `SELECT DISTINCT unnest(amenities) AS amenity
       FROM listings
       WHERE status = 'active'
       ORDER BY amenity`,
    );

    const priceResult = await db.query(
      `SELECT MIN(r.price_per_night) AS min_price, MAX(r.price_per_night) AS max_price
       FROM rooms r
       JOIN listings l ON l.id = r.property_id
       WHERE r.status = 'active' AND l.status = 'active'`,
    );

    res.json({
      types: typesResult.rows.map((r) => r.accommodation_type),
      amenities: amenitiesResult.rows.map((r) => r.amenity),
      priceRange: {
        min: Number(priceResult.rows[0]?.min_price ?? 0),
        max: Number(priceResult.rows[0]?.max_price ?? 0),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- GET a single active listing by id (public — for detail page) ---
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const listingResult = await db.query(
      "SELECT * FROM listings WHERE id = $1 AND status = 'active'",
      [id],
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({ message: "Listing not found." });
    }

    const photosResult = await db.query(
      "SELECT * FROM listing_photos WHERE listing_id = $1 ORDER BY sort_order ASC",
      [id],
    );

    const priceResult = await db.query(
      `SELECT MIN(price_per_night) AS min_price
       FROM rooms
       WHERE property_id = $1 AND status = 'active'`,
      [id],
    );

    const reviewStatsResult = await db.query(
      `SELECT AVG(rating) AS avg_rating, COUNT(*) AS review_count
   FROM reviews
   WHERE listing_id = $1`,
      [id],
    );

    res.json({
      hotel: mapListingToHotelCard(
        listingResult.rows[0],
        photosResult.rows,
        priceResult.rows[0]?.min_price ?? null,
        reviewStatsResult.rows[0]?.review_count > 0
          ? reviewStatsResult.rows[0]
          : null,
      ),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
