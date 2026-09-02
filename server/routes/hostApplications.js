const express = require("express");
const multer = require("multer");
const streamifier = require("streamifier");
const pool = require("../db");
const cloudinary = require("../cloudinary");
const { authenticate } = require("../middleware/authenticate");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only PDF, JPG, PNG, or WEBP files are accepted."));
    }
    cb(null, true);
  },
});

function uploadToCloudinary(buffer, folder, mimetype) {
  return new Promise((resolve, reject) => {
    const isPdf = mimetype === "application/pdf";
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: isPdf ? "image" : "auto", // force PDFs through the image pipeline
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

// --- GET current user's latest application status ---
router.get("/me", authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, status, rejection_reason, created_at, updated_at
       FROM host_applications
       WHERE oid = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.userId],
    );

    res.json({ application: rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch application status." });
  }
});

// --- POST new application ---
router.post(
  "/",
  authenticate,
  upload.fields([
    { name: "proofFile", maxCount: 1 },
    { name: "govIdFront", maxCount: 1 },
    { name: "govIdBack", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { fullName, contactNumber, email, proofType, agreed } = req.body;

      const required = {
        fullName,
        contactNumber,
        email,
        proofType,
      };
      for (const [key, value] of Object.entries(required)) {
        if (!value || !value.trim()) {
          return res.status(400).json({ error: `${key} is required.` });
        }
      }

      if (agreed !== "true" && agreed !== true) {
        return res
          .status(400)
          .json({ error: "You must certify the information." });
      }

      const proofFile = req.files?.proofFile?.[0];
      const govIdFront = req.files?.govIdFront?.[0];
      const govIdBack = req.files?.govIdBack?.[0];

      if (!proofFile) {
        return res
          .status(400)
          .json({ error: "Proof of ownership file is required." });
      }
      if (!govIdFront) {
        return res
          .status(400)
          .json({ error: "Front of government ID is required." });
      }
      if (!govIdBack) {
        return res
          .status(400)
          .json({ error: "Back of government ID is required." });
      }

      const [proofUpload, frontUpload, backUpload] = await Promise.all([
        uploadToCloudinary(
          proofFile.buffer,
          "host-applications/proofs",
          proofFile.mimetype,
        ),
        uploadToCloudinary(
          govIdFront.buffer,
          "host-applications/gov-ids",
          govIdFront.mimetype,
        ),
        uploadToCloudinary(
          govIdBack.buffer,
          "host-applications/gov-ids",
          govIdBack.mimetype,
        ),
      ]);

      const { rows } = await pool.query(
        `INSERT INTO host_applications
          (oid, full_name, contact_number, email,  proof_type,
           proof_file_url, proof_file_public_id,
           gov_id_front_url, gov_id_front_public_id,
           gov_id_back_url, gov_id_back_public_id,
           agreed, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending')
         RETURNING id, status`,
        [
          req.userId,
          fullName,
          contactNumber,
          email,
          proofType,
          proofUpload.secure_url,
          proofUpload.public_id,
          frontUpload.secure_url,
          frontUpload.public_id,
          backUpload.secure_url,
          backUpload.public_id,
          true,
        ],
      );

      res.status(201).json({
        message: "Application submitted for verification.",
        application: rows[0],
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to submit application." });
    }
  },
);

module.exports = router;
