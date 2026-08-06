require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const pool = require("./db");
const { authenticate } = require("./middleware/authenticate");
const hostApplicationsRoutes = require("./routes/hostApplications");
const listingRoutes = require("./routes/listings");
const publicListingRoutes = require("./routes/publicListings");
const roomRoutes = require("./routes/rooms");
const bookingRoutes = require("./routes/bookings");
const bookingsUpcomingRoutes = require("./routes/bookingsUpcoming"); // ADD THIS

const app = express();

app.use(cors());
app.use(express.json());

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;

if (!GOOGLE_CLIENT_ID) {
  throw new Error("GOOGLE_CLIENT_ID env var is required");
}
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET env var is required");
}

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

app.post("/api/auth/google", async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ message: "Missing Google credential." });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    console.error("Google token verification failed:", err);
    return res.status(401).json({ message: "Invalid Google credential." });
  }

  const {
    sub: googleId,
    email,
    given_name: firstName,
    family_name: lastName,
    picture,
    email_verified: emailVerified,
  } = payload;

  if (!email) {
    return res.status(400).json({ message: "Google account has no email." });
  }

  try {
    const existing = await pool.query(
      "SELECT id, first_name, last_name, email, picture FROM users WHERE google_id = $1 OR email = $2",
      [googleId, email],
    );

    let user;
    let isNewUser = false;

    if (existing.rows.length > 0) {
      user = existing.rows[0];

      await pool.query(
        `UPDATE users
         SET google_id = $1, picture = $2, email_verified = $3
         WHERE id = $4`,
        [googleId, picture || null, !!emailVerified, user.id],
      );
    } else {
      isNewUser = true;

      const inserted = await pool.query(
        `INSERT INTO users
         (google_id, first_name, last_name, email, picture, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, first_name, last_name, email, picture`,
        [
          googleId,
          firstName || "",
          lastName || "",
          email,
          picture || null,
          !!emailVerified,
        ],
      );
      user = inserted.rows[0];
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      message: "Logged in.",
      token,
      isNewUser,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        picture: user.picture,
      },
    });
  } catch (err) {
    console.error("Google auth failed:", err);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
});

app.patch("/api/users/me", authenticate, async (req, res) => {
  const { firstName, lastName } = req.body;

  if (!firstName || !lastName) {
    return res
      .status(400)
      .json({ message: "First and last name are required." });
  }

  try {
    const updated = await pool.query(
      `UPDATE users
       SET first_name = $1, last_name = $2
       WHERE id = $3
       RETURNING id, first_name, last_name, email, picture`,
      [firstName.trim(), lastName.trim(), req.userId],
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = updated.rows[0];

    res.json({
      message: "Profile updated.",
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        picture: user.picture,
      },
    });
  } catch (err) {
    console.error("Profile update failed:", err);
    res.status(500).json({ message: "Update failed. Please try again." });
  }
});

app.use("/api/bookings", bookingRoutes);
app.use("/api/listings/:id/rooms", roomRoutes);
app.use("/api/host-applications", hostApplicationsRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/hotels", publicListingRoutes);
app.use("/api/bookings", bookingsUpcomingRoutes);

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
