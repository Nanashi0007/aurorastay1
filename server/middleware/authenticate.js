const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verifies the Authorization: Bearer <token> header and attaches
 * req.userId and req.userRole. Used to protect routes that act on
 * "the logged-in user".
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing auth token." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    req.userRole = payload.role || "guest";
    next();
  } catch (err) {
    console.error("JWT verify failed:", err.name, "-", err.message);
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

/**
 * Must be used AFTER authenticate. Blocks any request whose token role
 * isn't "admin" — used to protect admin-only routes server-side.
 */
function requireAdmin(req, res, next) {
  if (req.userRole !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }
  next();
}

module.exports = { authenticate, requireAdmin };
