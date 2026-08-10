const db = require("../db");

async function createNotification({ userId, type, message, bookingId = null }) {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, message, related_booking_id)
       VALUES ($1, $2, $3, $4)`,
      [userId, type, message, bookingId],
    );
  } catch (err) {
    // Never let a notification failure break the booking flow
    console.error("Failed to create notification:", err);
  }
}

module.exports = { createNotification };
