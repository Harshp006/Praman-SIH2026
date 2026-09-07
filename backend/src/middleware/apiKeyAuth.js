/**
 * apiKeyAuth.js — Middleware for validating PRAMAN API Keys
 *
 * Verifies Authorization: Bearer <PRAMAN_API_KEY> or x-api-key header
 * Returns 401 Unauthorized if invalid or missing.
 */

"use strict";

const config = require("../config");

module.exports = function apiKeyAuth(req, res, next) {
  let apiKey = null;

  // Extract from Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    apiKey = authHeader.slice(7).trim();
  }

  // Fallback: Extract from x-api-key header
  if (!apiKey && req.headers["x-api-key"]) {
    apiKey = String(req.headers["x-api-key"]).trim();
  }

  // Validate API Key
  if (!apiKey || apiKey !== config.PRAMAN_API_KEY) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Invalid or missing API key",
    });
  }

  next();
};
