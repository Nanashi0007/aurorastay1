const express = require("express");
const router = express.Router();
const db = require("../db");

function mapListingToHotelCard(row, photos = [], minPrice = null) {
  const coverImage =
    photos.find((p) => p.sort_order === 0)?.image_url ||
    photos[0]?.image_url ||
    null;

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
    rating: null,
    reviews: null,
  };
}

// --- GET all active listings (public — for homepage/browse) ---
router.get("/", async (req, res) => {
  try {
    const listingsResult = await db.query(
      "SELECT * FROM listings WHERE status = 'active' ORDER BY id DESC",
    );

    const listingIds = listingsResult.rows.map((row) => row.id);

    let photosByListing = {};
    let minPriceByListing = {};

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

      const priceResult = await db.query(
        `SELECT property_id, MIN(price_per_night) AS min_price
         FROM rooms
         WHERE property_id = ANY($1) AND status = 'active'
         GROUP BY property_id`,
        [listingIds],
      );
      minPriceByListing = priceResult.rows.reduce((acc, row) => {
        acc[row.property_id] = row.min_price;
        return acc;
      }, {});
    }

    const hotels = listingsResult.rows.map((row) =>
      mapListingToHotelCard(
        row,
        photosByListing[row.id] || [],
        minPriceByListing[row.id] ?? null,
      ),
    );

    res.json({ hotels });
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

    res.json({
      hotel: mapListingToHotelCard(
        listingResult.rows[0],
        photosResult.rows,
        priceResult.rows[0]?.min_price ?? null,
      ),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
