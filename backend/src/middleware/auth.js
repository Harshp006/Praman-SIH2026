/**
 * auth.js (middleware) — JWT Bearer token verification
 *
 * Usage: router.post('/decision', requireAuth, handler)
 * Attaches req.officer = { id, email, name, iat, exp }
 */

"use strict";

const jwt    = require("jsonwebtoken");
const config = require("../config");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = async function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized",
      detail: "Missing or malformed Authorization: Bearer <token> header.",
    });
  }

  const token = header.slice(7);

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    // Verify officer actually still exists in DB
    const officer = await prisma.officer.findUnique({ where: { id: decoded.id } });
    if (!officer) {
      return res.status(401).json({
        error: "Invalid token",
        detail: "User account no longer exists in the system.",
      });
    }
    
    req.officer = decoded;
    next();
  } catch (err) {
    const expired = err.name === "TokenExpiredError";
    return res.status(401).json({
      error: expired ? "Token expired" : "Invalid token",
      detail: expired
        ? "Your session has expired. Please log in again."
        : "The provided token is invalid or tampered.",
    });
  }
};
