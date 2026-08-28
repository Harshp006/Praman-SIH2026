/**
 * index.js — Praman Express application entry point
 *
 * Startup sequence (handled by docker-compose command):
 *   prisma db push → seed-if-empty.js → node src/index.js
 */

"use strict";

const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const morgan       = require("morgan");

const config       = require("./config");
const errorHandler = require("./middleware/errorHandler");
const authRoutes   = require("./routes/auth");
const bidderRoutes = require("./routes/bidders");
const dashRoutes   = require("./routes/dashboard");
const { isOllamaReady } = require("./engines/ollama");

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ─── App setup ───────────────────────────────────────────────────────────────

const app = express();

// Security + logging
app.use(helmet());
app.use(cors({
  origin: "*", // Layer 3 (frontend) will be on a different port in dev
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(morgan(config.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use("/api/auth",      authRoutes);
app.use("/api/bidders",   bidderRoutes);
app.use("/api/dashboard", dashRoutes);

/**
 * GET /api/health
 * Liveness check — also probes DB and Ollama for Layer 3 banner warnings.
 */
app.get("/api/health", async (_req, res) => {
  let dbOk     = false;
  let ollamaOk = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch { /* intentional */ }

  try {
    ollamaOk = await isOllamaReady();
  } catch { /* intentional */ }

  res.status(dbOk ? 200 : 503).json({
    status:   dbOk ? "ok" : "degraded",
    uptime:   Math.floor(process.uptime()),
    dbOk,
    ollamaOk,
    ollamaModel: config.OLLAMA_MODEL,
    env:         config.NODE_ENV,
  });
});

// 404 for unknown routes
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// Global error handler (must be last)
app.use(errorHandler);

// ─── Server startup ──────────────────────────────────────────────────────────

const PORT = Number(config.PORT);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀  Praman API v2 listening on :${PORT}`);
  console.log(`    → Health:    http://localhost:${PORT}/api/health`);
  console.log(`    → Bidders:   http://localhost:${PORT}/api/bidders`);
  console.log(`    → Dashboard: http://localhost:${PORT}/api/dashboard/stats`);
  console.log(`    → Ollama:    ${config.OLLAMA_BASE_URL} (model: ${config.OLLAMA_MODEL})\n`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received — closing DB connection …");
  await prisma.$disconnect();
  process.exit(0);
});
