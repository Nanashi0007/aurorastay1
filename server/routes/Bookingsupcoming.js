const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticate } = require("../middleware/authenticate");

function mapBookingRow(row) {
  return {
    id: row.id,
    roomId: row.room_id,
    roomName: row.room_name,
    listingId: row.property_id,
    listingTitle: row.title,
    location: row.complete_address,
    accommodationType: row.accommodation_type,
    coverPhotoUrl: row.cover_photo_url,
    guestName: row.guest_name,
    guestContact: row.guest_contact,
    checkIn: row.check_in,
    checkOut: row.check_out,
    guestsCount: row.guests_count,
    specialRequests: row.special_requests,
    pricePerNight: row.price_per_night,
    totalPrice: row.total_price,
    depositAmount: row.deposit_amount,
    depositProofUrl: row.deposit_proof_url,
    paymentStatus: row.payment_status,
    status: row.status,
    createdAt: row.created_at,
    // new:
    review: row.review_id
      ? {
          id: row.review_id,
          rating: row.review_rating,
          comment: row.review_comment,
          createdAt: row.review_created_at,
        }
      : null,
  };
}

const BOOKING_SELECT = `
  SELECT
    b.*,
    r.room_name,
    r.property_id,
    l.title,
    l.accommodation_type,
    complete_address,        
    lp.image_url AS cover_photo_url,
    rev.id AS review_id,
    rev.rating AS review_rating,
    rev.comment AS review_comment,
    rev.created_at AS review_created_at
  FROM bookings b
  JOIN rooms r ON r.id = b.room_id
  JOIN listings l ON l.id = r.property_id
  LEFT JOIN LATERAL (
    SELECT image_url
    FROM listing_photos
    WHERE listing_id = l.id
    ORDER BY sort_order ASC
    LIMIT 1
  ) lp ON true
  LEFT JOIN reviews rev ON rev.booking_id = b.id
`;

// --- GET current guest's upcoming bookings only ---
// "Upcoming" = check-out date is today or later, AND status is not declined/cancelled
router.get("/upcoming", authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `${BOOKING_SELECT}
       WHERE b.guest_id = $1
         AND b.check_out >= CURRENT_DATE
         AND b.status NOT IN ('declined', 'cancelled')
       ORDER BY b.check_in ASC`,
      [req.userId],
    );
    res.json({ bookings: result.rows.map(mapBookingRow) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch upcoming bookings." });
  }
});

// --- GET current guest's booking history ---
// "History" = check-out date already passed, OR status is declined/cancelled
router.get("/history", authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `${BOOKING_SELECT}
       WHERE b.guest_id = $1
         AND (
           b.check_out < CURRENT_DATE
           OR b.status IN ('declined', 'cancelled')
         )
       ORDER BY b.check_out DESC`,
      [req.userId],
    );
    res.json({ bookings: result.rows.map(mapBookingRow) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch booking history." });
  }
});

module.exports = router;
