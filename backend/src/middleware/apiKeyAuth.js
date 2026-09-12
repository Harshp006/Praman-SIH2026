"use strict";

const crypto = require("crypto");
const config = require("../config");

function apiKeyAuth(req, res, next) {
  const apiKey = req.header("X-API-Key");
  
  if (!apiKey) {
    console.warn(`[GeM API] Missing API key from ${req.ip}`);
    return res.status(401).json({ error: "Invalid or missing API key" });
  }

  if (!config.GEM_API_KEY) {
    console.error("[GeM API] GEM_API_KEY is not configured on the server");
    return res.status(500).json({ error: "Internal processing error" });
  }

  try {
    const expectedKey = Buffer.from(config.GEM_API_KEY);
    const providedKey = Buffer.from(apiKey);

    if (expectedKey.length !== providedKey.length || !crypto.timingSafeEqual(expectedKey, providedKey)) {
      console.warn(`[GeM API] Invalid API key from ${req.ip}`);
      return res.status(401).json({ error: "Invalid or missing API key" });
    }
    
    next();
  } catch (err) {
    console.error("[GeM API] Error in apiKeyAuth:", err);
    return res.status(500).json({ error: "Internal processing error" });
  }
}

module.exports = apiKeyAuth;
