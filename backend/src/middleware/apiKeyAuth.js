/**
 * apiKeyAuth.js — Middleware for validating PRAMAN and GeM API Keys
 *
 * Verifies Authorization: Bearer <API_KEY> or X-API-Key header.
 * Accepts PRAMAN_API_KEY or GEM_API_KEY.
 * Returns 401 Unauthorized if invalid or missing.
 */

"use strict";

const crypto = require("crypto");
const config = require("../config");

function safeEqual(a, b) {
  if (!a || !b) return false;
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = function apiKeyAuth(req, res, next) {
  let apiKey = null;

  // Extract from Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    apiKey = authHeader.slice(7).trim();
  }

  // Fallback: Extract from x-api-key / X-API-Key header
  if (!apiKey) {
    const rawKey = req.header("X-API-Key") || req.header("x-api-key");
    if (rawKey) apiKey = String(rawKey).trim();
  }

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Invalid or missing API key",
    });
  }

  const validKeys = [config.PRAMAN_API_KEY, config.GEM_API_KEY].filter(Boolean);
  const isValid = validKeys.some((validKey) => safeEqual(apiKey, validKey));

  if (!isValid) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Invalid or missing API key",
    });
  }

  next();
};
