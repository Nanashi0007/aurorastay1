const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();
const db = require("../db");

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required." });
    }

    const result = await db.query("SELECT * FROM admins WHERE username = $1", [
      username,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const admin = result.rows[0];
    console.log("Looking up username:", JSON.stringify(username)); // temp
    console.log("Found admin row:", admin.username); // temp

    const match = await bcrypt.compare(password, admin.password_hash);
    console.log("Password match:", match); // temp

    if (!match) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
      { userId: admin.id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: admin.id,
        username: admin.username,
        role: "admin",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
