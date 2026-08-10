const express = require("express");
const multer = require("multer");
const streamifier = require("streamifier");
const router = express.Router();
const db = require("../db");
const cloudinary = require("../cloudinary");
const { authenticate } = require("../middleware/authenticate");
const { createNotification } = require("../utils/notify");

const DEPOSIT_RATE = 0.3; // 30% down payment

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, or WEBP images are accepted."));
    }
    cb(null, true);
  },
});

function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

function mapBookingRow(row) {
  return {
    id: row.id,
    roomId: row.room_id,
    roomName: row.room_name,
    listingId: row.property_id,
    listingTitle: row.title,
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
    coverPhotoUrl: row.cover_photo_url,
    accommodationType: row.accommodation_type,
    location: [row.barangay, row.municipality].filter(Boolean).join(", "),
  };
}

// --- POST create a new booking with deposit proof (guest only) ---
router.post(
  "/",
  authenticate,
  upload.single("depositProof"),
  async (req, res) => {
    try {
      const {
        roomId,
        checkIn,
        checkOut,
        guestsCount,
        guestName,
        guestContact,
        specialRequests,
        paymentMethod,
      } = req.body;

      if (!roomId || !checkIn || !checkOut || !guestName || !guestContact) {
        return res.status(400).json({ message: "Missing required fields." });
      }
      if (!req.file) {
        return res
          .status(400)
          .json({ message: "Deposit payment screenshot is required." });
      }

      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      if (
        isNaN(checkInDate) ||
        isNaN(checkOutDate) ||
        checkOutDate <= checkInDate
      ) {
        return res.status(400).json({ message: "Invalid date range." });
      }

      // const roomResult = await db.query(
      //   "SELECT * FROM rooms WHERE id = $1 AND status = 'active'",
      //   [roomId],
      // );
      const roomResult = await db.query(
        `SELECT r.*, l.owner_id, l.title AS listing_title
   FROM rooms r
   JOIN listings l ON l.id = r.property_id
   WHERE r.id = $1 AND r.status = 'active'`,
        [roomId],
      );
      if (roomResult.rows.length === 0) {
        return res.status(404).json({ message: "Room not found." });
      }
      const room = roomResult.rows[0];

      const nights = Math.round(
        (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24),
      );
      const totalPrice = nights * Number(room.price_per_night);
      const depositAmount = Math.round(totalPrice * DEPOSIT_RATE);

      const proofUpload = await uploadToCloudinary(
        req.file.buffer,
        "bookings/deposit-proofs",
      );

      const inserted = await db.query(
        `INSERT INTO bookings
          (room_id, guest_id, guest_name, guest_contact, check_in, check_out,
           guests_count, special_requests, price_per_night, total_price,
           deposit_amount, deposit_proof_url, deposit_proof_public_id,
           payment_status, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'submitted','pending')
         RETURNING *`,
        [
          roomId,
          req.userId,
          guestName,
          guestContact,
          checkIn,
          checkOut,
          guestsCount || 1,
          specialRequests || null,
          room.price_per_night,
          totalPrice,
          depositAmount,
          proofUpload.secure_url,
          proofUpload.public_id,
        ],
      );

      await createNotification({
        userId: room.owner_id,
        type: "booking_request",
        message: `${guestName} requested a booking for ${room.listing_title}.`,
        bookingId: inserted.rows[0].id,
      });

      res.status(201).json({
        message: "Booking request submitted.",
        booking: mapBookingRow({
          ...inserted.rows[0],
          room_name: room.room_name,
          property_id: room.property_id,
        }),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to create booking." });
    }
  },
);

// --- GET current guest's bookings ---
router.get("/me", authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.*, r.room_name, r.property_id, l.title,
              l.accommodation_type, l.municipality, l.barangay,
              lp.image_url AS cover_photo_url
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       JOIN listings l ON l.id = r.property_id
       LEFT JOIN listing_photos lp
         ON lp.listing_id = l.id AND lp.sort_order = 0
       WHERE b.guest_id = $1
       ORDER BY b.created_at DESC`,
      [req.userId],
    );
    res.json({ bookings: result.rows.map(mapBookingRow) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch bookings." });
  }
});

// --- GET bookings for properties owned by the current user (owner dashboard) ---
router.get("/owner", authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.*, r.room_name, r.property_id, l.title,
              l.accommodation_type, l.municipality, l.barangay,
              lp.image_url AS cover_photo_url
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       JOIN listings l ON l.id = r.property_id
       LEFT JOIN listing_photos lp
         ON lp.listing_id = l.id AND lp.sort_order = 0
       WHERE l.owner_id = $1
       ORDER BY b.created_at DESC`,
      [req.userId],
    );
    res.json({ bookings: result.rows.map(mapBookingRow) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch bookings." });
  }
});

// --- PATCH owner confirms or declines a booking ---
router.patch("/:id/status", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'confirmed' | 'declined' | 'cancelled'

    if (!["confirmed", "declined", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const ownsCheck = await db.query(
      `SELECT b.id, b.guest_id, l.title
   FROM bookings b
   JOIN rooms r ON r.id = b.room_id
   JOIN listings l ON l.id = r.property_id
   WHERE b.id = $1 AND l.owner_id = $2`,
      [id, req.userId],
    );
    if (ownsCheck.rows.length === 0) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const updated = await db.query(
      "UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *",
      [status, id],
    );

    const { guest_id, title } = ownsCheck.rows[0];
    const statusMessages = {
      confirmed: `Your booking for ${title} was confirmed.`,
      declined: `Your booking for ${title} was declined.`,
      cancelled: `Your booking for ${title} was cancelled by the owner.`,
    };

    await createNotification({
      userId: guest_id,
      type: `booking_${status}`,
      message: statusMessages[status],
      bookingId: id,
    });
    res.json({ message: "Booking updated.", booking: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to RETURNING booking." });
  }
});

// --- PATCH guest cancels their own booking ---
router.patch("/:id/cancel", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const bookingCheck = await db.query(
      `SELECT b.id, b.status, l.owner_id, l.title
   FROM bookings b
   JOIN rooms r ON r.id = b.room_id
   JOIN listings l ON l.id = r.property_id
   WHERE b.id = $1 AND b.guest_id = $2`,
      [id, req.userId],
    );
    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const currentStatus = bookingCheck.rows[0].status;
    if (!["pending", "confirmed"].includes(currentStatus)) {
      return res
        .status(400)
        .json({ message: "This booking can no longer be cancelled." });
    }

    const updated = await db.query(
      "UPDATE bookings SET status = 'cancelled' WHERE id = $1 RETURNING *",
      [id],
    );

    await createNotification({
      userId: bookingCheck.rows[0].owner_id,
      type: "booking_cancelled",
      message: `A guest cancelled their booking for ${bookingCheck.rows[0].title}.`,
      bookingId: id,
    });

    res.json({ message: "Booking cancelled.", booking: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to cancel booking." });
  }
});

// --- POST guest submits a review for a completed, confirmed booking ---
router.post("/:id/review", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const ratingNum = Number(rating);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5." });
    }

    const bookingCheck = await db.query(
      `SELECT b.id, b.status, b.check_out, l.id AS listing_id
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       JOIN listings l ON l.id = r.property_id
       WHERE b.id = $1 AND b.guest_id = $2`,
      [id, req.userId],
    );
    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const booking = bookingCheck.rows[0];
    if (booking.status !== "confirmed") {
      return res
        .status(400)
        .json({ message: "Only confirmed stays can be reviewed." });
    }
    if (new Date(booking.check_out) >= new Date()) {
      return res
        .status(400)
        .json({ message: "You can review after your stay is complete." });
    }

    const inserted = await db.query(
      `INSERT INTO reviews (booking_id, guest_id, listing_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, req.userId, booking.listing_id, ratingNum, comment || null],
    );

    res.status(201).json({
      message: "Review submitted.",
      review: {
        id: inserted.rows[0].id,
        rating: inserted.rows[0].rating,
        comment: inserted.rows[0].comment,
        createdAt: inserted.rows[0].created_at,
      },
    });
  } catch (err) {
    if (err.code === "23505") {
      // unique constraint on booking_id — already reviewed
      return res
        .status(400)
        .json({ message: "You already reviewed this booking." });
    }
    console.error(err);
    res.status(500).json({ message: "Failed to submit review." });
  }
});
module.exports = router;
