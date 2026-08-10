const express = require("express");
const multer = require("multer");
const streamifier = require("streamifier");
const router = express.Router();
const { authenticate } = require("../middleware/authenticate");
const db = require("../db");
const cloudinary = require("../cloudinary");

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 100;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per photo
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, or WEBP images are accepted."));
    }
    cb(null, true);
  },
});

const qrUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
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

function mapListingRow(row, photos = [], roomStats = null) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    accommodationType: row.accommodation_type,
    title: row.title,
    description: row.description,
    municipality: row.municipality,
    barangay: row.barangay,
    completeAddress: row.complete_address,
    amenities: row.amenities || [],
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    signatoryName: row.signatory_name,
    contractingParty: row.contracting_party,
    commMethods: row.comm_methods || [],
    status: row.status,
    coverImageUrl:
      photos.find((p) => p.sort_order === 0)?.image_url ||
      photos[0]?.image_url ||
      null,
    photos: photos.map((p) => ({ url: p.image_url, sortOrder: p.sort_order })),
    createdAt: row.created_at,
    latitude: row.latitude,
    longitude: row.longitude,
    gcashQrUrl: row.gcash_qr_url,
    wiseDetails: row.wise_details, // new

    minPricePerNight: roomStats?.min_price ?? null,
    maxGuestsAcrossRooms: roomStats?.max_guests ?? null,
    totalRoomsAvailable: roomStats?.total_rooms_available ?? 0,
    roomTypeCount: roomStats?.room_type_count ?? 0,
  };
}

// --- GET listings of the logged-in owner ---
router.get("/mine", authenticate, async (req, res) => {
  try {
    const ownerId = req.userId;

    const listingsResult = await db.query(
      "SELECT * FROM listings WHERE owner_id = $1 ORDER BY id DESC",
      [ownerId],
    );

    const listingIds = listingsResult.rows.map((row) => row.id);

    let photosByListing = {};
    let roomStatsByListing = {};

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

      const roomStatsResult = await db.query(
        `SELECT
           property_id,
           MIN(price_per_night) AS min_price,
           MAX(max_guests) AS max_guests,
           SUM(rooms_available) AS total_rooms_available,
           COUNT(*) AS room_type_count
         FROM rooms
         WHERE property_id = ANY($1) AND status = 'active'
         GROUP BY property_id`,
        [listingIds],
      );
      roomStatsByListing = roomStatsResult.rows.reduce((acc, row) => {
        acc[row.property_id] = row;
        return acc;
      }, {});
    }

    const listings = listingsResult.rows.map((row) =>
      mapListingRow(
        row,
        photosByListing[row.id] || [],
        roomStatsByListing[row.id] || null,
      ),
    );

    res.json({ listings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- PATCH upload/replace a listing's GCash QR code (owner only) ---
router.patch(
  "/:id/gcash-qr",
  authenticate,
  qrUpload.single("qrCode"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const ownerId = req.userId;

      if (!req.file) {
        return res.status(400).json({ message: "QR code image is required." });
      }

      const listingCheck = await db.query(
        "SELECT id, gcash_qr_public_id FROM listings WHERE id = $1 AND owner_id = $2",
        [id, ownerId],
      );
      if (listingCheck.rows.length === 0) {
        return res.status(404).json({ message: "Listing not found." });
      }

      const oldPublicId = listingCheck.rows[0].gcash_qr_public_id;

      const uploadResult = await uploadToCloudinary(
        req.file.buffer,
        "listings/gcash-qr",
      );

      await db.query(
        "UPDATE listings SET gcash_qr_url = $1, gcash_qr_public_id = $2 WHERE id = $3",
        [uploadResult.secure_url, uploadResult.public_id, id],
      );

      if (oldPublicId) {
        cloudinary.uploader
          .destroy(oldPublicId)
          .catch((err) => console.error("Failed to delete old QR code:", err));
      }

      res.json({ message: "QR code updated.", qrUrl: uploadResult.secure_url });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to update QR code." });
    }
  },
);

// --- POST create a new listing ---
// --- POST create a new listing ---
router.post(
  "/",
  authenticate,
  upload.fields([
    { name: "photos", maxCount: MAX_PHOTOS },
    { name: "qrCode", maxCount: 1 },
  ]),
  async (req, res) => {
    const client = await db.connect();

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
        wiseDetails,
        agreed,
      } = req.body;

      // Arrays arrive as JSON strings from FormData
      let amenities = [];
      let commMethods = [];
      try {
        amenities = req.body.amenities ? JSON.parse(req.body.amenities) : [];
        commMethods = req.body.commMethods
          ? JSON.parse(req.body.commMethods)
          : [];
      } catch {
        client.release();
        return res
          .status(400)
          .json({ message: "Invalid amenities or commMethods format." });
      }

      // --- Validation ---
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
          client.release();
          return res.status(400).json({ message: `${key} is required.` });
        }
      }

      if (agreed !== "true" && agreed !== true) {
        client.release();
        return res
          .status(400)
          .json({ message: "You must agree before submitting." });
      }

      const photoFiles = req.files?.photos || [];
      const qrFile = req.files?.qrCode?.[0] || null;

      if (photoFiles.length < MIN_PHOTOS) {
        client.release();
        return res
          .status(400)
          .json({ message: `Please upload at least ${MIN_PHOTOS} photos.` });
      }
      if (photoFiles.length > MAX_PHOTOS) {
        client.release();
        return res
          .status(400)
          .json({ message: `You can upload at most ${MAX_PHOTOS} photos.` });
      }

      if (!qrFile && !(wiseDetails && wiseDetails.trim())) {
        client.release();
        return res.status(400).json({
          message:
            "Add at least one payment method (GCash QR or Wise details).",
        });
      }

      // --- Upload all photos to Cloudinary in parallel ---
      const uploadResults = await Promise.all(
        photoFiles.map((file) => uploadToCloudinary(file.buffer, "listings")),
      );

      // --- Upload GCash QR code, if provided ---
      let gcashQrUrl = null;
      let gcashQrPublicId = null;
      if (qrFile) {
        const qrUploadResult = await uploadToCloudinary(
          qrFile.buffer,
          "listings/gcash-qr",
        );
        gcashQrUrl = qrUploadResult.secure_url;
        gcashQrPublicId = qrUploadResult.public_id;
      }

      await client.query("BEGIN");

      const insertListing = await client.query(
        `INSERT INTO listings
        (owner_id, accommodation_type, title, description, municipality, barangay,
         complete_address, latitude, longitude, amenities, contact_email, contact_phone, signatory_name,
         contracting_party, comm_methods, agreed, status,
         gcash_qr_url, gcash_qr_public_id, wise_details)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'active',$17,$18,$19)
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
          gcashQrUrl,
          gcashQrPublicId,
          wiseDetails || null,
        ],
      );

      const listing = insertListing.rows[0];

      // --- Insert photo rows, preserving upload order (first = cover) ---
      const photoRows = [];
      for (let i = 0; i < uploadResults.length; i++) {
        const result = await client.query(
          `INSERT INTO listing_photos (listing_id, image_url, public_id, sort_order)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
          [
            listing.id,
            uploadResults[i].secure_url,
            uploadResults[i].public_id,
            i,
          ],
        );
        photoRows.push(result.rows[0]);
      }

      await client.query("COMMIT");

      res.status(201).json({
        message: "Listing created successfully.",
        listing: mapListingRow(listing, photoRows),
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(err);
      res.status(500).json({ message: "Failed to create listing." });
    } finally {
      client.release();
    }
  },
);

// --- GET a single listing for PUBLIC/guest viewing (no auth, no owner check) ---
router.get("/public/:id", async (req, res) => {
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

    const roomStatsResult = await db.query(
      `SELECT
         MIN(price_per_night) AS min_price,
         MAX(max_guests) AS max_guests,
         SUM(rooms_available) AS total_rooms_available,
         COUNT(*) AS room_type_count
       FROM rooms
       WHERE property_id = $1 AND status = 'active'`,
      [id],
    );

    const roomStats =
      roomStatsResult.rows[0]?.room_type_count > 0
        ? roomStatsResult.rows[0]
        : null;

    res.json({
      listing: mapListingRow(
        listingResult.rows[0],
        photosResult.rows,
        roomStats,
      ),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- GET a single listing (view) — must belong to the logged-in owner ---
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.userId;

    const listingResult = await db.query(
      "SELECT * FROM listings WHERE id = $1 AND owner_id = $2",
      [id, ownerId],
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({ message: "Listing not found." });
    }

    const photosResult = await db.query(
      "SELECT * FROM listing_photos WHERE listing_id = $1 ORDER BY sort_order ASC",
      [id],
    );

    const roomStatsResult = await db.query(
      `SELECT
         MIN(price_per_night) AS min_price,
         MAX(max_guests) AS max_guests,
         SUM(rooms_available) AS total_rooms_available,
         COUNT(*) AS room_type_count
       FROM rooms
       WHERE property_id = $1 AND status = 'active'`,
      [id],
    );

    const roomStats =
      roomStatsResult.rows[0]?.room_type_count > 0
        ? roomStatsResult.rows[0]
        : null;

    res.json({
      listing: mapListingRow(
        listingResult.rows[0],
        photosResult.rows,
        roomStats,
      ),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
// --- PATCH update a listing (with photo add/remove support) ---
router.patch(
  "/:id",
  authenticate,
  upload.array("photos", MAX_PHOTOS),
  async (req, res) => {
    const client = await db.connect();

    try {
      const { id } = req.params;
      const ownerId = req.userId;

      const existing = await client.query(
        "SELECT id FROM listings WHERE id = $1 AND owner_id = $2",
        [id, ownerId],
      );
      if (existing.rows.length === 0) {
        client.release();
        return res.status(404).json({ message: "Listing not found." });
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
        await client.query("ROLLBACK");
        client.release();
        return res.status(400).json({ message: "Invalid amenities format." });
      }

      let keepPhotoUrls = [];
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

      // --- Update listing fields ---
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
      addUpdate("municipality", municipality);
      addUpdate("barangay", barangay);
      addUpdate("complete_address", completeAddress);
      addUpdate("latitude", latitude);
      addUpdate("longitude", longitude);
      addUpdate("contact_email", contactEmail);
      addUpdate("contact_phone", contactPhone);
      addUpdate("amenities", amenities);
      addUpdate("title", title);
      addUpdate("description", description);
      addUpdate("status", status);

      let updatedListing;
      if (updates.length > 0) {
        values.push(id, ownerId);
        const result = await client.query(
          `UPDATE listings SET ${updates.join(", ")}
         WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1}
         RETURNING *`,
          values,
        );
        updatedListing = result.rows[0];
      } else {
        const result = await client.query(
          "SELECT * FROM listings WHERE id = $1",
          [id],
        );
        updatedListing = result.rows[0];
      }

      // --- Handle photo removal ---
      if (keepPhotoUrls !== null) {
        const currentPhotos = await client.query(
          "SELECT * FROM listing_photos WHERE listing_id = $1",
          [id],
        );

        const toRemove = currentPhotos.rows.filter(
          (p) => !keepPhotoUrls.includes(p.image_url),
        );

        for (const photo of toRemove) {
          await client.query("DELETE FROM listing_photos WHERE id = $1", [
            photo.id,
          ]);
        }

        // Clean up Cloudinary after DB rows are removed
        await Promise.allSettled(
          toRemove.map((p) => cloudinary.uploader.destroy(p.public_id)),
        );
      }

      // --- Handle new photo uploads ---
      const newFiles = req.files || [];
      if (newFiles.length > 0) {
        const uploadResults = await Promise.all(
          newFiles.map((file) => uploadToCloudinary(file.buffer, "listings")),
        );

        const currentMax = await client.query(
          "SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM listing_photos WHERE listing_id = $1",
          [id],
        );
        let nextOrder = currentMax.rows[0].max_order + 1;

        for (const result of uploadResults) {
          await client.query(
            `INSERT INTO listing_photos (listing_id, image_url, public_id, sort_order)
           VALUES ($1, $2, $3, $4)`,
            [id, result.secure_url, result.public_id, nextOrder],
          );
          nextOrder++;
        }
      }

      await client.query("COMMIT");

      const finalPhotos = await db.query(
        "SELECT * FROM listing_photos WHERE listing_id = $1 ORDER BY sort_order ASC",
        [id],
      );

      res.json({
        message: "Listing updated successfully.",
        listing: mapListingRow(updatedListing, finalPhotos.rows),
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(err);
      res.status(500).json({ message: "Failed to update listing." });
    } finally {
      client.release();
    }
  },
);

// --- DELETE a listing — must belong to the logged-in owner ---
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.userId;

    // Get Cloudinary public_ids first so we can clean up storage after DB delete succeeds
    const photosResult = await db.query(
      `SELECT lp.public_id
       FROM listing_photos lp
       JOIN listings l ON l.id = lp.listing_id
       WHERE lp.listing_id = $1 AND l.owner_id = $2`,
      [id, ownerId],
    );

    const result = await db.query(
      "DELETE FROM listings WHERE id = $1 AND owner_id = $2 RETURNING id",
      [id, ownerId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Listing not found." });
    }

    // listing_photos rows are removed automatically via ON DELETE CASCADE.
    // Clean up the actual Cloudinary assets too, so they don't linger unused.
    await Promise.allSettled(
      photosResult.rows.map((row) =>
        cloudinary.uploader.destroy(row.public_id),
      ),
    );

    res.json({ message: "Listing deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete listing." });
  }
});

// --- GET all reviews + rating summary for a listing (public) ---
router.get("/public/:id/reviews", async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit) || 5, 20);
    const offset = Number(req.query.offset) || 0;

    const summaryResult = await db.query(
      `SELECT COUNT(*) AS review_count, AVG(rating) AS avg_rating
       FROM reviews WHERE listing_id = $1`,
      [id],
    );

    const reviewsResult = await db.query(
      `SELECT r.rating, r.comment, r.created_at, u.first_name, u.picture
       FROM reviews r
       JOIN users u ON u.id = r.guest_id
       WHERE r.listing_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset],
    );

    const reviewCount = Number(summaryResult.rows[0].review_count);
    const avgRating = summaryResult.rows[0].avg_rating
      ? Number(summaryResult.rows[0].avg_rating)
      : null;

    res.json({
      reviewCount,
      averageRating: avgRating,
      scoreOutOf10: avgRating ? Math.round(avgRating * 2 * 10) / 10 : null,
      reviews: reviewsResult.rows.map((row) => ({
        rating: row.rating,
        comment: row.comment,
        createdAt: row.created_at,
        guestFirstName: row.first_name,
        guestPicture: row.picture,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch reviews." });
  }
});

module.exports = router;
