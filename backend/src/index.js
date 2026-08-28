/**
 * index.js — Praman Express application entry point
 *
 * Startup sequence (handled by docker-compose command):
 *   prisma db push → node src/seed.js → node src/index.js
 */

"use strict";

const path         = require("path");
const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const morgan       = require("morgan");

const config       = require("./config");
const errorHandler = require("./middleware/errorHandler");
const authRoutes   = require("./routes/auth");
const bidderRoutes = require("./routes/bidders");
const dashRoutes   = require("./routes/dashboard");
const tenderRoutes = require("./routes/tenders");
const { isOllamaReady } = require("./engines/ollama");

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ─── App setup ───────────────────────────────────────────────────────────────

const app = express();

// Security + logging
app.use(helmet());
app.use(cors({
  origin: "*", // frontend on different port in dev
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(morgan(config.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));

// Serve uploaded documents statically at /uploads/{bidderId}/{filename}
app.use("/uploads", express.static(config.UPLOADS_DIR));

// ─── Routes ──────────────────────────────────────────────────────────────────

// POST /auth/login (spec) — kept at /api/auth/login for frontend compatibility
app.use("/auth",          authRoutes);   // spec-correct prefix
app.use("/api/auth",      authRoutes);   // backward-compat prefix for existing frontend
app.use("/api/bidders",   bidderRoutes);
app.use("/api/tenders",   tenderRoutes);
app.use("/api/dashboard", dashRoutes);

/**
 * GET /api/audit — Global audit trail (paginated)
 * Spec route — uses the same handler as GET /api/bidders/:id/audit
 * but without a bidder filter. Implemented inline to avoid a circular
 * require; the bidderRoutes module handles this on its own router instance.
 */
const auditRouter = require("express").Router();
const { PrismaClient: PC2 } = require("@prisma/client");
const auditPrisma = new PC2();
const requireAuth = require("./middleware/auth");

auditRouter.get("/export", requireAuth, async (req, res, next) => {
  try {
    const logs = await auditPrisma.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      include: {
        bidder:  { select: { name: true, gstin: true } },
        officer: { select: { name: true, email: true } },
      },
    });

    let csv = "Timestamp,Actor,Action,Bidder Name,GSTIN\n";
    logs.forEach(log => {
      const ts = new Date(log.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      const actor = `"${(log.actor || "System").replace(/"/g, '""')}"`;
      const action = `"${(log.action || "").replace(/"/g, '""')}"`;
      const bidderName = `"${(log.bidder?.name || "N/A").replace(/"/g, '""')}"`;
      const gstin = `"${(log.bidder?.gstin || "N/A").replace(/"/g, '""')}"`;
      csv += `${ts},${actor},${action},${bidderName},${gstin}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="Praman_Audit_Logs.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

auditRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page     || "1",  10));
    const pageSize = Math.min(100, parseInt(req.query.pageSize || "50", 10));

    const [total, logs] = await Promise.all([
      auditPrisma.auditLog.count(),
      auditPrisma.auditLog.findMany({
        orderBy: { timestamp: "desc" },
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        include: {
          bidder:  { select: { id: true, name: true, gstin: true } },
          officer: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    res.json({ logs, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    next(err);
  }
});

app.use("/api/audit", auditRouter);

/**
 * GET /api/health
 * Liveness check — probes DB and Ollama.
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
    status:      dbOk ? "ok" : "degraded",
    uptime:      Math.floor(process.uptime()),
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
  console.log(`\n🚀  Praman API listening on :${PORT}`);
  console.log(`    → Health:    http://localhost:${PORT}/api/health`);
  console.log(`    → Auth:      http://localhost:${PORT}/auth/login  (also /api/auth/login)`);
  console.log(`    → Bidders:   http://localhost:${PORT}/api/bidders`);
  console.log(`    → Audit:     http://localhost:${PORT}/api/audit`);
  console.log(`    → Dashboard: http://localhost:${PORT}/api/dashboard/stats`);
  console.log(`    → Ollama:    ${config.OLLAMA_BASE_URL} (model: ${config.OLLAMA_MODEL})\n`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received — closing DB connection …");
  await prisma.$disconnect();
  await auditPrisma.$disconnect();
  process.exit(0);
});

