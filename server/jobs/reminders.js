const cron = require("node-cron");
const db = require("../db");
const { createNotification } = require("../utils/notify");

function startReminderJobs() {
  // Check-in reminder — 3 days before check_in
  cron.schedule("0 8 * * *", async () => {
    try {
      const upcoming = await db.query(
        `SELECT b.id, b.guest_id, l.title
         FROM bookings b
         JOIN rooms r ON r.id = b.room_id
         JOIN listings l ON l.id = r.property_id
         WHERE b.status = 'confirmed'
           AND b.check_in::date = (CURRENT_DATE + INTERVAL '3 days')::date
           AND b.checkin_reminder_sent = false`,
      );

      for (const b of upcoming.rows) {
        await createNotification({
          userId: b.guest_id,
          type: "checkin_reminder",
          message: `Your check-in for ${b.title} is in 3 days.`,
          bookingId: b.id,
        });
      }

      if (upcoming.rows.length > 0) {
        await db.query(
          `UPDATE bookings SET checkin_reminder_sent = true WHERE id = ANY($1)`,
          [upcoming.rows.map((b) => b.id)],
        );
      }
    } catch (err) {
      console.error("Check-in reminder job failed:", err);
    }
  });

  // Check-out reminder — day after check_out ("how was your stay")
  cron.schedule("0 9 * * *", async () => {
    try {
      const finished = await db.query(
        `SELECT b.id, b.guest_id, l.title
         FROM bookings b
         JOIN rooms r ON r.id = b.room_id
         JOIN listings l ON l.id = r.property_id
         WHERE b.status = 'confirmed'
           AND b.check_out::date = (CURRENT_DATE - INTERVAL '1 day')::date
           AND b.checkout_reminder_sent = false`,
      );

      for (const b of finished.rows) {
        await createNotification({
          userId: b.guest_id,
          type: "checkout_reminder",
          message: `How was your stay at ${b.title}? We'd love your feedback.`,
          bookingId: b.id,
        });
      }

      if (finished.rows.length > 0) {
        await db.query(
          `UPDATE bookings SET checkout_reminder_sent = true WHERE id = ANY($1)`,
          [finished.rows.map((b) => b.id)],
        );
      }
    } catch (err) {
      console.error("Check-out reminder job failed:", err);
    }
  });

  console.log("Reminder cron jobs scheduled.");
}

module.exports = { startReminderJobs };
