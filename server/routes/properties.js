const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authenticate");
const db = require("../db");

function mapPropertyRow(row, roomCount = 0, coverImageUrl = null) {
  return {
    id: row.id,
    accommodationType: row.accommodation_type,
    title: row.title,
    description: row.description,
    municipality: row.municipality,
    barangay: row.barangay,
    completeAddress: row.complete_address,
    latitude: row.latitude,
    longitude: row.longitude,
    amenities: row.amenities || [],
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    signatoryName: row.signatory_name,
    contractingParty: row.contracting_party,
    commMethods: row.comm_methods || [],
    status: row.status,
    roomCount,
    coverImageUrl,
    createdAt: row.created_at,
  };
}

// --- GET properties of the logged-in owner, with room count + cover photo ---
router.get("/mine", authenticate, async (req, res) => {
  try {
    const ownerId = req.userId;

    const propertiesResult = await db.query(
      "SELECT * FROM properties WHERE owner_id = $1 ORDER BY id DESC",
      [ownerId],
    );

    const propertyIds = propertiesResult.rows.map((r) => r.id);
    let roomCounts = {};
    let coverImages = {};

    if (propertyIds.length > 0) {
      const countsResult = await db.query(
        `SELECT property_id, COUNT(*) AS count
         FROM rooms WHERE property_id = ANY($1)
         GROUP BY property_id`,
        [propertyIds],
      );
      roomCounts = countsResult.rows.reduce((acc, r) => {
        acc[r.property_id] = Number(r.count);
        return acc;
      }, {});

      // Grab one cover photo per property — first room's first photo
      const coverResult = await db.query(
        `SELECT DISTINCT ON (r.property_id) r.property_id, rp.image_url
         FROM rooms r
         JOIN room_photos rp ON rp.room_id = r.id
         WHERE r.property_id = ANY($1)
         ORDER BY r.property_id, r.id ASC, rp.sort_order ASC`,
        [propertyIds],
      );
      coverImages = coverResult.rows.reduce((acc, r) => {
        acc[r.property_id] = r.image_url;
        return acc;
      }, {});
    }

    const properties = propertiesResult.rows.map((row) =>
      mapPropertyRow(row, roomCounts[row.id] || 0, coverImages[row.id] || null),
    );

    res.json({ properties });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- GET a single property (with its rooms) ---
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.userId;

    const propertyResult = await db.query(
      "SELECT * FROM properties WHERE id = $1 AND owner_id = $2",
      [id, ownerId],
    );

    if (propertyResult.rows.length === 0) {
      return res.status(404).json({ message: "Property not found." });
    }

    const roomsResult = await db.query(
      "SELECT * FROM rooms WHERE property_id = $1 ORDER BY id ASC",
      [id],
    );

    res.json({
      property: mapPropertyRow(propertyResult.rows[0]),
      rooms: roomsResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- POST create a new property (no photos, no room type — just the property itself) ---
router.post("/", authenticate, async (req, res) => {
  try {
    const ownerId = req.userId;

    const {
      accommodationType,
      title,
      description,
      municipality,
      barangay,
      completeAddress,
      latitude,
      longitude,
      contactEmail,
      contactPhone,
      signatoryName,
      contractingParty,
      agreed,
    } = req.body;

    let amenities = [];
    let commMethods = [];
    try {
      amenities = req.body.amenities ? JSON.parse(req.body.amenities) : [];
      commMethods = req.body.commMethods
        ? JSON.parse(req.body.commMethods)
        : [];
    } catch {
      return res
        .status(400)
        .json({ message: "Invalid amenities or commMethods format." });
    }

    const required = {
      accommodationType,
      title,
      municipality,
      barangay,
      completeAddress,
      contactEmail,
      contactPhone,
      signatoryName,
      contractingParty,
    };
    for (const [key, value] of Object.entries(required)) {
      if (!value || !String(value).trim()) {
        return res.status(400).json({ message: `${key} is required.` });
      }
    }

    if (agreed !== "true" && agreed !== true) {
      return res
        .status(400)
        .json({ message: "You must agree before submitting." });
    }

    const result = await db.query(
      `INSERT INTO properties
        (owner_id, accommodation_type, title, description, municipality, barangay,
         complete_address, latitude, longitude, amenities, contact_email, contact_phone,
         signatory_name, contracting_party, comm_methods, agreed, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'active')
       RETURNING *`,
      [
        ownerId,
        accommodationType,
        title,
        description || null,
        municipality,
        barangay,
        completeAddress,
        latitude ? Number(latitude) : null,
        longitude ? Number(longitude) : null,
        amenities,
        contactEmail,
        contactPhone,
        signatoryName,
        contractingParty,
        commMethods,
        true,
      ],
    );

    res.status(201).json({
      message: "Property created successfully.",
      property: mapPropertyRow(result.rows[0], 0, null),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create property." });
  }
});

// --- PATCH update a property ---
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.userId;

    const existing = await db.query(
      "SELECT id FROM properties WHERE id = $1 AND owner_id = $2",
      [id, ownerId],
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Property not found." });
    }

    const {
      accommodationType,
      title,
      description,
      municipality,
      barangay,
      completeAddress,
      latitude,
      longitude,
      contactEmail,
      contactPhone,
      status,
    } = req.body;

    let amenities;
    try {
      amenities = req.body.amenities
        ? JSON.parse(req.body.amenities)
        : undefined;
    } catch {
      return res.status(400).json({ message: "Invalid amenities format." });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    function addUpdate(column, value) {
      if (value === undefined) return;
      updates.push(`${column} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    addUpdate("accommodation_type", accommodationType);
    addUpdate("title", title);
    addUpdate("description", description);
    addUpdate("municipality", municipality);
    addUpdate("barangay", barangay);
    addUpdate("complete_address", completeAddress);
    addUpdate("latitude", latitude ? Number(latitude) : undefined);
    addUpdate("longitude", longitude ? Number(longitude) : undefined);
    addUpdate("contact_email", contactEmail);
    addUpdate("contact_phone", contactPhone);
    addUpdate("amenities", amenities);
    addUpdate("status", status);

    if (updates.length === 0) {
      return res.status(400).json({ message: "No valid fields to update." });
    }

    values.push(id, ownerId);
    const result = await db.query(
      `UPDATE properties SET ${updates.join(", ")}
       WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1}
       RETURNING *`,
      values,
    );

    res.json({
      message: "Property updated successfully.",
      property: mapPropertyRow(result.rows[0]),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update property." });
  }
});

// --- DELETE a property (cascades to rooms + room_photos via FK) ---
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.userId;

    const result = await db.query(
      "DELETE FROM properties WHERE id = $1 AND owner_id = $2 RETURNING id",
      [id, ownerId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Property not found." });
    }

    res.json({ message: "Property deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete property." });
  }
});

module.exports = router;
