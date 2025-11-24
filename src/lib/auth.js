// lib/auth.js
import jwt from "jsonwebtoken";

export function verifyJWT(token) {
  if (!token) return null;
  try {
    // returns decoded payload on success
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    // Explicit handling for expired token so routes can react properly
    if (err && err.name === "TokenExpiredError") {
      return { expired: true, expiredAt: err.expiredAt };
    }
    // Log for debugging, but return null so routes treat it as invalid token.
    console.error("JWT verification failed:", err && err.message ? err.message : err);
    return null;
  }
}
