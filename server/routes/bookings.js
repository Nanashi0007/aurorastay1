const express = require("express");
const multer = require("multer");
const streamifier = require("streamifier");
const router = express.Router();
const db = require("../db");
const cloudinary = require("../cloudinary");
const { authenticate } = require("../middleware/authenticate");

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

      const roomResult = await db.query(
        "SELECT * FROM rooms WHERE id = $1 AND status = 'active'",
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
      `SELECT b.id
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

    res.json({ message: "Booking updated.", booking: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update booking." });
  }
});
module.exports = router;
