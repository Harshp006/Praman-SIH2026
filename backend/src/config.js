/**
 * config.js — Centralised environment configuration
 * All process.env reads live here; nothing else imports dotenv directly.
 */

"use strict";

module.exports = {
  PORT:            process.env.PORT            || "4000",
  NODE_ENV:        process.env.NODE_ENV        || "development",
  DATABASE_URL:    process.env.DATABASE_URL,

  // JWT
  JWT_SECRET:      process.env.JWT_SECRET      || "praman_jwt_dev_secret_CHANGE_IN_PROD",
  JWT_EXPIRES_IN:  process.env.JWT_EXPIRES_IN  || "8h",

  // Ollama — spec requires 8 s timeout; fallback fires automatically on expiry
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://ollama:11434",
  OLLAMA_MODEL:    process.env.OLLAMA_MODEL    || "llama3.2:3b",
  OLLAMA_TIMEOUT:  8_000, // ms — per spec; fallback recommendation used on timeout

  // Uploads directory (absolute inside container; relative on host dev)
  UPLOADS_DIR: process.env.UPLOADS_DIR || "/uploads",
};
