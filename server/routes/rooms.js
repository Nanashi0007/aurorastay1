const express = require("express");
const multer = require("multer");
const streamifier = require("streamifier");
const router = express.Router({ mergeParams: true });
const { authenticate } = require("../middleware/authenticate");
const db = require("../db");
const cloudinary = require("../cloudinary");

const MAX_PHOTOS = 20;

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

function mapRoomRow(row, photos = []) {
  return {
    id: row.id,
    propertyId: row.property_id,
    roomName: row.room_name,
    description: row.description,
    pricePerNight: row.price_per_night,
    maxGuests: row.max_guests,
    roomsAvailable: row.rooms_available,
    bedType: row.bed_type,
    roomSizeSqm: row.room_size_sqm,
    floorRange: row.floor_range,
    view: row.view,
    smokingAllowed: row.smoking_allowed,
    amenities: row.amenities || {},
    childPolicy: row.child_policy,
    cribsExtraBeds: row.cribs_extra_beds,
    status: row.status,
    photos: photos.map((p) => ({ url: p.image_url, sortOrder: p.sort_order })),
    createdAt: row.created_at,
  };
}

// --- GET all rooms for a property, PUBLIC (no auth) ---
router.get("/public", async (req, res) => {
  try {
    const { id: propertyId } = req.params;

    const roomsResult = await db.query(
      "SELECT * FROM rooms WHERE property_id = $1 AND status = 'active' ORDER BY id ASC",
      [propertyId],
    );

    const roomIds = roomsResult.rows.map((r) => r.id);
    let photosByRoom = {};
    if (roomIds.length > 0) {
      const photosResult = await db.query(
        "SELECT * FROM room_photos WHERE room_id = ANY($1) ORDER BY sort_order ASC",
        [roomIds],
      );
      photosByRoom = photosResult.rows.reduce((acc, p) => {
        if (!acc[p.room_id]) acc[p.room_id] = [];
        acc[p.room_id].push(p);
        return acc;
      }, {});
    }

    const rooms = roomsResult.rows.map((row) =>
      mapRoomRow(row, photosByRoom[row.id] || []),
    );
    res.json({ rooms });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- GET all rooms for a property (public) ---
router.get("/", async (req, res) => {
  try {
    const { id: propertyId } = req.params;

    const roomsResult = await db.query(
      "SELECT * FROM rooms WHERE property_id = $1 AND status = 'active' ORDER BY id ASC",
      [propertyId],
    );

    const roomIds = roomsResult.rows.map((r) => r.id);
    let photosByRoom = {};
    if (roomIds.length > 0) {
      const photosResult = await db.query(
        `SELECT * FROM room_photos WHERE room_id = ANY($1) ORDER BY sort_order ASC`,
        [roomIds],
      );
      photosByRoom = photosResult.rows.reduce((acc, photo) => {
        if (!acc[photo.room_id]) acc[photo.room_id] = [];
        acc[photo.room_id].push(photo);
        return acc;
      }, {});
    }

    const rooms = roomsResult.rows.map((row) =>
      mapRoomRow(row, photosByRoom[row.id] || []),
    );

    res.json({ rooms });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- POST create a new room under a property (owner only) ---
router.post("/", authenticate, upload.array("photos", 20), async (req, res) => {
  const client = await db.connect();

  try {
    const { id: propertyId } = req.params;
    const ownerId = req.userId;

    // Confirm the property belongs to this owner
    const propertyCheck = await client.query(
      "SELECT id FROM listings WHERE id = $1 AND owner_id = $2",
      [propertyId, ownerId],
    );
    if (propertyCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: "Property not found." });
    }

    const {
      roomName,
      description,
      pricePerNight,
      maxGuests,
      roomsAvailable,
      bedType,
      roomSizeSqm,
      floorRange,
      view,
      smokingAllowed,
      childPolicy,
      cribsExtraBeds,
    } = req.body;

    let amenities = {};
    try {
      amenities = req.body.amenities ? JSON.parse(req.body.amenities) : {};
    } catch {
      client.release();
      return res.status(400).json({ message: "Invalid amenities format." });
    }

    if (!roomName || !String(roomName).trim()) {
      client.release();
      return res.status(400).json({ message: "Room name is required." });
    }
    if (!pricePerNight || Number(pricePerNight) <= 0) {
      client.release();
      return res.status(400).json({ message: "Enter a valid price." });
    }

    const photoFiles = req.files || [];
    const uploadResults = await Promise.all(
      photoFiles.map((file) => uploadToCloudinary(file.buffer, "rooms")),
    );

    await client.query("BEGIN");

    const insertRoom = await client.query(
      `INSERT INTO rooms
      (property_id, room_name, description, price_per_night, max_guests,
       rooms_available, bed_type, room_size_sqm, floor_range, view,
       smoking_allowed, amenities, child_policy, cribs_extra_beds)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
      [
        propertyId,
        roomName,
        description || null,
        pricePerNight,
        maxGuests || 1,
        roomsAvailable || 1,
        bedType || null,
        roomSizeSqm || null,
        floorRange || null,
        view || null,
        smokingAllowed === "true" || smokingAllowed === true,
        JSON.stringify(amenities),
        childPolicy || null,
        cribsExtraBeds || null,
      ],
    );

    const room = insertRoom.rows[0];

    const photoRows = [];
    for (let i = 0; i < uploadResults.length; i++) {
      const result = await client.query(
        `INSERT INTO room_photos (room_id, image_url, public_id, sort_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
        [room.id, uploadResults[i].secure_url, uploadResults[i].public_id, i],
      );
      photoRows.push(result.rows[0]);
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Room added successfully.",
      room: mapRoomRow(room, photoRows),
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Failed to add room." });
  } finally {
    client.release();
  }
});

router.use((err, req, res, next) => {
  if (err) {
    console.error("Room upload error:", err);
    return res.status(400).json({ message: err.message || "Upload failed." });
  }
  next();
});

// --- DELETE a room ---
router.delete("/:roomId", authenticate, async (req, res) => {
  const client = await db.connect();
  try {
    const { id: propertyId, roomId } = req.params;
    const ownerId = req.userId;

    const propertyCheck = await client.query(
      "SELECT id FROM listings WHERE id = $1 AND owner_id = $2",
      [propertyId, ownerId],
    );
    if (propertyCheck.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: "Property not found." });
    }

    const roomResult = await client.query(
      "SELECT id FROM rooms WHERE id = $1 AND property_id = $2",
      [roomId, propertyId],
    );
    if (roomResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: "Room not found." });
    }

    const photos = await client.query(
      "SELECT * FROM room_photos WHERE room_id = $1",
      [roomId],
    );

    await client.query("BEGIN");
    await client.query("DELETE FROM room_photos WHERE room_id = $1", [roomId]);
    await client.query("DELETE FROM rooms WHERE id = $1", [roomId]);
    await client.query("COMMIT");

    await Promise.allSettled(
      photos.rows.map((p) => cloudinary.uploader.destroy(p.public_id)),
    );

    res.json({ message: "Room deleted successfully." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Failed to delete room." });
  } finally {
    client.release();
  }
});

// --- PATCH update a room (with photo add/remove support) ---
router.patch(
  "/:roomId",
  authenticate,
  upload.array("photos", MAX_PHOTOS),
  async (req, res) => {
    const client = await db.connect();

    try {
      const { id: propertyId, roomId } = req.params;
      const ownerId = req.userId;

      const propertyCheck = await client.query(
        "SELECT id FROM listings WHERE id = $1 AND owner_id = $2",
        [propertyId, ownerId],
      );
      if (propertyCheck.rows.length === 0) {
        client.release();
        return res.status(404).json({ message: "Property not found." });
      }

      const existing = await client.query(
        "SELECT id FROM rooms WHERE id = $1 AND property_id = $2",
        [roomId, propertyId],
      );
      if (existing.rows.length === 0) {
        client.release();
        return res.status(404).json({ message: "Room not found." });
      }

      const {
        roomName,
        description,
        pricePerNight,
        maxGuests,
        roomsAvailable,
        bedType,
        roomSizeSqm,
        floorRange,
        view,
        smokingAllowed,
        childPolicy,
        cribsExtraBeds,
        status,
      } = req.body;

      let amenities;
      try {
        amenities = req.body.amenities
          ? JSON.parse(req.body.amenities)
          : undefined;
      } catch {
        client.release();
        return res.status(400).json({ message: "Invalid amenities format." });
      }

      let keepPhotoUrls = null;
      try {
        keepPhotoUrls = req.body.keepPhotoUrls
          ? JSON.parse(req.body.keepPhotoUrls)
          : null;
      } catch {
        client.release();
        return res
          .status(400)
          .json({ message: "Invalid keepPhotoUrls format." });
      }

      await client.query("BEGIN");

      const updates = [];
      const values = [];
      let paramIndex = 1;

      function addUpdate(column, value) {
        if (value === undefined) return;
        updates.push(`${column} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }

      addUpdate("room_name", roomName);
      addUpdate("description", description);
      addUpdate("price_per_night", pricePerNight);
      addUpdate("max_guests", maxGuests);
      addUpdate("rooms_available", roomsAvailable);
      addUpdate("bed_type", bedType);
      addUpdate("room_size_sqm", roomSizeSqm || null);
      addUpdate("floor_range", floorRange);
      addUpdate(
        "smoking_allowed",
        smokingAllowed === undefined
          ? undefined
          : smokingAllowed === "true" || smokingAllowed === true,
      );
      addUpdate("view", view);
      addUpdate("amenities", amenities);
      addUpdate("child_policy", childPolicy);
      addUpdate("cribs_extra_beds", cribsExtraBeds);
      addUpdate("status", status);

      let updatedRoom;
      if (updates.length > 0) {
        values.push(roomId, propertyId);
        const result = await client.query(
          `UPDATE rooms SET ${updates.join(", ")}
           WHERE id = $${paramIndex} AND property_id = $${paramIndex + 1}
           RETURNING *`,
          values,
        );
        updatedRoom = result.rows[0];
      } else {
        const result = await client.query("SELECT * FROM rooms WHERE id = $1", [
          roomId,
        ]);
        updatedRoom = result.rows[0];
      }

      // --- Handle photo removal ---
      if (keepPhotoUrls !== null) {
        const currentPhotos = await client.query(
          "SELECT * FROM room_photos WHERE room_id = $1",
          [roomId],
        );
        const toRemove = currentPhotos.rows.filter(
          (p) => !keepPhotoUrls.includes(p.image_url),
        );
        for (const photo of toRemove) {
          await client.query("DELETE FROM room_photos WHERE id = $1", [
            photo.id,
          ]);
        }
        await Promise.allSettled(
          toRemove.map((p) => cloudinary.uploader.destroy(p.public_id)),
        );
      }

      // --- Handle new photo uploads ---
      const newFiles = req.files || [];
      if (newFiles.length > 0) {
        const uploadResults = await Promise.all(
          newFiles.map((file) => uploadToCloudinary(file.buffer, "rooms")),
        );

        const currentMax = await client.query(
          "SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM room_photos WHERE room_id = $1",
          [roomId],
        );
        let nextOrder = currentMax.rows[0].max_order + 1;

        for (const result of uploadResults) {
          await client.query(
            `INSERT INTO room_photos (room_id, image_url, public_id, sort_order)
             VALUES ($1, $2, $3, $4)`,
            [roomId, result.secure_url, result.public_id, nextOrder],
          );
          nextOrder++;
        }
      }

      await client.query("COMMIT");

      const finalPhotos = await db.query(
        "SELECT * FROM room_photos WHERE room_id = $1 ORDER BY sort_order ASC",
        [roomId],
      );

      res.json({
        message: "Room updated successfully.",
        room: mapRoomRow(updatedRoom, finalPhotos.rows),
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(err);
      res.status(500).json({ message: "Failed to update room." });
    } finally {
      client.release();
    }
  },
);

module.exports = router;
