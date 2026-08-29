/**
 * bidders.js — All /api/bidders/* endpoints
 *
 * Routes (all require JWT Bearer auth):
 *   GET    /api/bidders              — list all bidders (paginated, filterable)
 *   GET    /api/bidders/:id          — full detail: checks, documents, logs
 *   POST   /api/bidders              — create bidder ONLY (no auto-pipeline)
 *   PUT    /api/bidders/:id          — edit bidder (name, tender info)
 *   DELETE /api/bidders/:id          — delete bidder + all related records
 *   POST   /api/bidders/:id/verify   — run OCR + connectors + score (on demand)
 *   POST   /api/bidders/:id/recommend— generate Ollama recommendation (on demand)
 *   POST   /api/bidders/:id/decision — officer approve | reject
 *   GET    /api/bidders/:id/audit    — audit trail for one bidder
 *   GET    /api/bidders/:id/report   — download PDF compliance report
 */

"use strict";

const fs      = require("fs");
const path    = require("path");
const express = require("express");
const multer  = require("multer");
const { PrismaClient } = require("@prisma/client");

const requireAuth  = require("../middleware/auth");
const config       = require("../config");
const { validatePAN, validateGSTIN, validateUdyam } = require("../validators");
const { extractDocumentFields } = require("../ocr");
const { runAllConnectors } = require("../connectors");
const { computeScore }     = require("../engines/scoring");
const { generateRecommendation } = require("../engines/ollama");

const router = express.Router();
const prisma = new PrismaClient();

// ─── Multer ───────────────────────────────────────────────────────────────────

const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/jpg", "image/png"]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const tmpDir = path.join(config.UPLOADS_DIR, "tmp");
      fs.mkdirSync(tmpDir, { recursive: true });
      cb(null, tmpDir);
    },
    filename: (_req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase() || ".bin";
      cb(null, Date.now() + "_" + Math.random().toString(36).slice(2) + ext);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    ALLOWED_MIME.has(file.mimetype) ? cb(null, true) : cb(new Error("Only PDF, JPG, and PNG accepted."));
  },
});

const uploadFields = upload.fields([
  { name: "pan_file",   maxCount: 1 },
  { name: "gst_file",   maxCount: 1 },
  { name: "udyam_file", maxCount: 1 },
]);

// ─── Check definitions ────────────────────────────────────────────────────────

const CHECK_DEFS = [
  { label: "GST registration & return filing",          category: "statutory",       live: true,  weight: 20 },
  { label: "PAN & Income Tax compliance",               category: "statutory",       live: true,  weight: 20 },
  { label: "Udyam / MSME registration",                category: "statutory",       live: true,  weight: 15 },
  { label: "Blacklisting / debarment",                  category: "statutory",       live: false, weight: 15 },
  { label: "Tender-specific eligibility clause",        category: "tender_specific", live: true,  weight: 10 },
  { label: "MCA21 company status",                      category: "statutory",       live: false, weight: 6 },
  { label: "EPFO / ESIC compliance",                   category: "statutory",       live: false, weight: 5 },
  { label: "Make in India / local content",             category: "tender_specific", live: false, weight: 5 },
  { label: "Startup India / NSIC / OEM authorization", category: "tender_specific", live: false, weight: 2 },
  { label: "DigiLocker document verification",          category: "statutory",       live: false, weight: 2 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function notFound(res, id) {
  return res.status(404).json({ error: `Bidder '${id}' not found.` });
}

function moveUploadedFile(tmpPath, bidderId, originalName) {
  const bidderDir = path.join(config.UPLOADS_DIR, bidderId);
  fs.mkdirSync(bidderDir, { recursive: true });
  const ext     = path.extname(originalName).toLowerCase() || ".bin";
  const safe    = path.basename(tmpPath, path.extname(tmpPath)) + ext;
  const newPath = path.join(bidderDir, safe);
  fs.renameSync(tmpPath, newPath);
  return newPath;
}

function runDocumentValidations(pan, gstin, udyam, ocrResults) {
  const ePAN   = (ocrResults.pan   || pan   || "").toUpperCase().trim();
  const eGSTIN = (ocrResults.gstin || gstin || "").toUpperCase().trim();
  const eUdyam = (ocrResults.udyam || udyam || "").toUpperCase().trim();

  const panR   = ePAN   ? { ...(require("../validators").validatePAN(ePAN)),   src: ocrResults.pan   ? "OCR" : "Form" } : { valid: false, reason: "PAN not provided",   src: "" };
  const gstinR = eGSTIN ? { ...(require("../validators").validateGSTIN(eGSTIN)), src: ocrResults.gstin ? "OCR" : "Form" } : { valid: false, reason: "GSTIN not provided", src: "" };
  const udyamR = eUdyam ? { ...(require("../validators").validateUdyam(eUdyam)), src: ocrResults.udyam ? "OCR" : "Form" } : { valid: false, reason: "Udyam not provided", src: "" };

  return {
    panState:   !ePAN   ? "missing" : (panR.valid   ? "pass" : "fail"),
    panNote:    panR.reason + (ePAN   ? ` [${panR.src}]`   : ""),
    gstinState: !eGSTIN ? "missing" : (gstinR.valid ? "pass" : "fail"),
    gstinNote:  gstinR.reason + (eGSTIN ? ` [${gstinR.src}]` : ""),
    udyamState: !eUdyam ? "missing" : (udyamR.valid ? "pass" : "fail"),
    udyamNote:  udyamR.reason + (eUdyam ? ` [${udyamR.src}]` : ""),
  };
}

// ─── GET /api/bidders ─────────────────────────────────────────────────────────

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { status, risk, q } = req.query;
    const page     = Math.max(1,   parseInt(req.query.page     || "1",  10));
    const pageSize = Math.min(200, parseInt(req.query.pageSize || "50", 10));

    const where = {
      ...(status ? { status } : {}),
      ...(risk   ? { risk }   : {}),
      ...(q ? { OR: [
        { name:       { contains: q, mode: "insensitive" } },
        { gstin:      { contains: q, mode: "insensitive" } },
        { pan:        { contains: q, mode: "insensitive" } },
        { tenderName: { contains: q, mode: "insensitive" } },
        { tenderId:   { contains: q, mode: "insensitive" } },
      ]} : {}),
    };

    const [total, bidders] = await Promise.all([
      prisma.bidder.count({ where }),
      prisma.bidder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, name: true, gstin: true, pan: true, udyam: true,
          tenderId: true, tenderName: true, score: true, risk: true,
          status: true, recommendation: true, createdAt: true, updatedAt: true,
          _count: { select: { checks: true, documents: true } },
        },
      }),
    ]);

    res.json({ bidders, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err) { next(err); }
});

// ─── GET /api/bidders/:id ─────────────────────────────────────────────────────

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const bidder = await prisma.bidder.findUnique({
      where: { id: req.params.id },
      include: {
        checks:    { orderBy: { createdAt: "asc" } },
        documents: true,
        auditLogs: {
          orderBy: { timestamp: "desc" },
          include: { officer: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!bidder) return notFound(res, req.params.id);
    res.json(bidder);
  } catch (err) { next(err); }
});

// ─── POST /api/bidders ────────────────────────────────────────────────────────
// Creates bidder + saves files only. NO auto-verification. Officer clicks verify.

router.post("/", requireAuth, (req, res, next) => {
  uploadFields(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ error: uploadErr.message });

    try {
      const { name, gstin, pan, udyam, tenderId } = req.body;
      const missing = ["name","gstin","pan","udyam","tenderId"].filter(f => !req.body[f]);
      if (missing.length) return res.status(400).json({ error: "Missing fields: " + missing.join(", ") });

      // Ensure tender exists
      const tender = await prisma.tender.findUnique({ where: { tenderId } });
      if (!tender) return res.status(400).json({ error: "Tender ID not found." });

      const bidder = await prisma.bidder.create({
        data: {
          name: name.trim(),
          gstin: gstin.trim().toUpperCase(),
          pan:   pan.trim().toUpperCase(),
          udyam: udyam.trim().toUpperCase(),
          tenderId: tender.tenderId,
          tenderName: tender.name,
          status: "pending_review",
          createdById: req.officer.id,
        },
      });

      // Save uploaded files
      const files = req.files || {};
      for (const { file, type } of [
        { file: (files.pan_file   || [])[0], type: "PAN"   },
        { file: (files.gst_file   || [])[0], type: "GST"   },
        { file: (files.udyam_file || [])[0], type: "UDYAM" },
      ]) {
        if (!file) continue;
        const newPath = moveUploadedFile(file.path, bidder.id, file.originalname);
        await prisma.document.create({
          data: { bidderId: bidder.id, type, fileName: file.originalname, filePath: newPath },
        });
      }

      await prisma.auditLog.create({
        data: {
          bidderId:  bidder.id,
          officerId: req.officer.id,
          actor:     req.officer.name,
          action:    `Bidder registered by ${req.officer.name}. Documents uploaded. Awaiting officer-initiated verification.`,
        },
      });

      const full = await prisma.bidder.findUnique({
        where: { id: bidder.id },
        include: { checks: true, documents: true, auditLogs: { orderBy: { timestamp: "desc" } } },
      });
      res.status(201).json(full);
    } catch (err) { next(err); }
  });
});

// ─── POST /api/bidders/:id/verify ────────────────────────────────────────────
// Officer-triggered: OCR + connectors + score. Does NOT generate recommendation.

router.post("/:id/verify", requireAuth, async (req, res, next) => {
  try {
    const bidder = await prisma.bidder.findUnique({
      where: { id: req.params.id },
      include: { documents: true },
    });
    if (!bidder) return notFound(res, req.params.id);

    console.log(`[Verify] Starting for ${bidder.name} (${bidder.id})`);

    // OCR all uploaded documents
    let ocrPAN = null, ocrGSTIN = null, ocrUdyam = null;
    for (const doc of bidder.documents) {
      console.log(`[OCR] Processing ${doc.type} — ${doc.fileName}`);
      try {
        const extracted = await extractDocumentFields(doc.filePath, doc.type);
        if (!ocrPAN   && extracted.pan)   ocrPAN   = extracted.pan;
        if (!ocrGSTIN && extracted.gstin) ocrGSTIN = extracted.gstin;
        if (!ocrUdyam && extracted.udyam) ocrUdyam = extracted.udyam;
      } catch (e) {
        console.warn(`[OCR] Failed for ${doc.type}: ${e.message}`);
      }
    }

    const ocrResults = { pan: ocrPAN, gstin: ocrGSTIN, udyam: ocrUdyam };
    const docVal = runDocumentValidations(bidder.pan, bidder.gstin, bidder.udyam, ocrResults);

    // Run portal connectors
    console.log(`[Connectors] Running 10 checks for ${bidder.name}`);
    const connectorResults = await runAllConnectors(bidder);

    // Build check rows
    const checkData = [];
    for (let i = 0; i < CHECK_DEFS.length; i++) {
      const def = CHECK_DEFS[i];
      let state, note;

      if (i === 0) {
        const r = connectorResults.get(def.label);
        state = r?.state || docVal.gstinState;
        note  = r?.note  || docVal.gstinNote;
        if (docVal.gstinState === "fail") { state = "fail"; note = docVal.gstinNote; }
      } else if (i === 1) {
        const r = connectorResults.get(def.label);
        state = r?.state || docVal.panState;
        note  = r?.note  || docVal.panNote;
        if (docVal.panState === "fail") { state = "fail"; note = docVal.panNote; }
      } else if (i === 2) {
        const r = connectorResults.get(def.label);
        state = r?.state || docVal.udyamState;
        note  = r?.note  || docVal.udyamNote;
        if (docVal.udyamState === "fail") { state = "fail"; note = docVal.udyamNote; }
      } else {
        const r = connectorResults.get(def.label);
        state = r?.state || "missing";
        note  = r?.note  || "Portal check did not return a result.";
      }
      checkData.push({ ...def, bidderId: bidder.id, state, note });
    }

    // Delete old checks and create fresh
    await prisma.check.deleteMany({ where: { bidderId: bidder.id } });
    await prisma.check.createMany({ data: checkData });

    const checks = await prisma.check.findMany({
      where: { bidderId: bidder.id }, orderBy: { createdAt: "asc" },
    });

    const { score, risk } = computeScore(checks);
    console.log(`[Score] ${bidder.name}: ${score}/100 (${risk})`);

    // Generate recommendation instantly
    bidder.score = score;
    bidder.risk = risk;
    console.log(`[Ollama] Generating recommendation for ${bidder.name}…`);
    const recommendation = await generateRecommendation(bidder, checks);

    await prisma.bidder.update({
      where: { id: bidder.id },
      data:  { score, risk, recommendation },
    });

    await prisma.auditLog.create({
      data: {
        bidderId:  bidder.id,
        officerId: req.officer.id,
        actor:     req.officer.name,
        action:    `Verification run by ${req.officer.name}. ${checks.length} checks completed. Score: ${score}/100 (${risk} risk). AI Recommendation generated.`,
      },
    });

    const full = await prisma.bidder.findUnique({
      where: { id: bidder.id },
      include: {
        checks:    { orderBy: { createdAt: "asc" } },
        documents: true,
        auditLogs: { orderBy: { timestamp: "desc" }, include: { officer: { select: { id: true, name: true, email: true } } } },
      },
    });
    res.json(full);
  } catch (err) { next(err); }
});

// ─── POST /api/bidders/:id/recommend ─────────────────────────────────────────
// Officer-triggered: calls Ollama and stores the recommendation.

router.post("/:id/recommend", requireAuth, async (req, res, next) => {
  try {
    const bidder = await prisma.bidder.findUnique({
      where: { id: req.params.id },
      include: { checks: { orderBy: { createdAt: "asc" } } },
    });
    if (!bidder) return notFound(res, req.params.id);

    if (!bidder.checks || bidder.checks.length === 0) {
      return res.status(400).json({ error: "Run verification first before generating a recommendation." });
    }

    console.log(`[Ollama] Generating recommendation for ${bidder.name}…`);
    const recommendation = await generateRecommendation(bidder, bidder.checks);

    await prisma.bidder.update({
      where: { id: bidder.id },
      data:  { recommendation },
    });

    await prisma.auditLog.create({
      data: {
        bidderId:  bidder.id,
        officerId: req.officer.id,
        actor:     req.officer.name,
        action:    `AI compliance recommendation generated via Ollama (${config.OLLAMA_MODEL}) by ${req.officer.name}.`,
      },
    });

    res.json({ recommendation, bidderId: bidder.id });
  } catch (err) { next(err); }
});

// ─── PUT /api/bidders/:id ─────────────────────────────────────────────────────

router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const bidder = await prisma.bidder.findUnique({ where: { id: req.params.id } });
    if (!bidder) return notFound(res, req.params.id);

    const { name, tenderId } = req.body;
    if (!name || !tenderId)
      return res.status(400).json({ error: "name and tenderId are required." });

    const tender = await prisma.tender.findUnique({ where: { tenderId } });
    if (!tender) return res.status(400).json({ error: "Tender ID not found." });

    const updated = await prisma.bidder.update({
      where: { id: req.params.id },
      data:  { name: name.trim(), tenderId: tender.tenderId, tenderName: tender.name },
      include: {
        checks:    { orderBy: { createdAt: "asc" } },
        documents: true,
        auditLogs: { orderBy: { timestamp: "desc" } },
      },
    });

    await prisma.auditLog.create({
      data: {
        bidderId:  bidder.id,
        officerId: req.officer.id,
        actor:     req.officer.name,
        action:    `Profile updated by ${req.officer.name}: name="${name.trim()}", tenderId="${tender.tenderId}"`,
      },
    });

    res.json(updated);
  } catch (err) { next(err); }
});

// ─── DELETE /api/bidders/:id ──────────────────────────────────────────────────

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const bidder = await prisma.bidder.findUnique({ where: { id: req.params.id } });
    if (!bidder) return notFound(res, req.params.id);

    const docs = await prisma.document.findMany({ where: { bidderId: req.params.id } });
    for (const doc of docs) {
      try { fs.unlinkSync(doc.filePath); } catch { /* ignore */ }
    }
    try { fs.rmdirSync(path.join(config.UPLOADS_DIR, req.params.id)); } catch { /* ignore */ }

    await prisma.check.deleteMany({ where: { bidderId: req.params.id } });
    await prisma.document.deleteMany({ where: { bidderId: req.params.id } });
    await prisma.auditLog.deleteMany({ where: { bidderId: req.params.id } });
    await prisma.bidder.delete({ where: { id: req.params.id } });

    res.json({ message: `Bidder '${bidder.name}' deleted.`, id: req.params.id });
  } catch (err) { next(err); }
});

// ─── POST /api/bidders/:id/decision ──────────────────────────────────────────

router.post("/:id/decision", requireAuth, async (req, res, next) => {
  try {
    const { action, note } = req.body;
    if (!action || !["approve", "reject"].includes(action))
      return res.status(400).json({ error: "action must be 'approve' or 'reject'." });

    const bidder = await prisma.bidder.findUnique({ where: { id: req.params.id } });
    if (!bidder) return notFound(res, req.params.id);

    const newStatus = action === "approve" ? "approved" : "rejected";

    await prisma.bidder.update({
      where: { id: bidder.id },
      data:  { status: newStatus },
    });

    const actionDesc = action === "approve"
      ? `APPROVED by Officer ${req.officer.name}. Bid forwarded to procurement committee.`
      : `REJECTED by Officer ${req.officer.name}. Bid rejected based on compliance review.`;

    await prisma.auditLog.create({
      data: {
        bidderId:  bidder.id,
        officerId: req.officer.id,
        actor:     req.officer.name,
        action:    actionDesc + (note ? ` Note: ${note}` : ""),
      },
    });

    // AUTO REJECT LOGIC
    if (action === "approve") {
      const otherBidders = await prisma.bidder.findMany({
        where: { tenderId: bidder.tenderId, status: "pending_review", id: { not: bidder.id } }
      });
      
      if (otherBidders.length > 0) {
        await prisma.bidder.updateMany({
          where: { tenderId: bidder.tenderId, status: "pending_review", id: { not: bidder.id } },
          data: { status: "rejected" }
        });

        const auditLogs = otherBidders.map(ob => ({
          bidderId: ob.id,
          officerId: req.officer.id,
          actor: "System",
          action: `Auto-rejected because bidder ${bidder.name} was approved for this tender.`
        }));

        await prisma.auditLog.createMany({ data: auditLogs });
      }
    }

    res.json({ message: `Bid ${action}d successfully.`, id: bidder.id, status: newStatus });
  } catch (err) { next(err); }
});

// ─── GET /api/bidders/:id/audit ───────────────────────────────────────────────

router.get("/:id/audit", requireAuth, async (req, res, next) => {
  try {
    const bidder = await prisma.bidder.findUnique({ where: { id: req.params.id } });
    if (!bidder) return notFound(res, req.params.id);

    const logs = await prisma.auditLog.findMany({
      where:   { bidderId: req.params.id },
      orderBy: { timestamp: "desc" },
      include: { officer: { select: { id: true, name: true, email: true } } },
    });
    res.json({ bidderId: req.params.id, bidderName: bidder.name, logs });
  } catch (err) { next(err); }
});

// ─── GET /api/bidders/:id/report  (PDF download) ─────────────────────────────

router.get("/:id/report", requireAuth, async (req, res, next) => {
  try {
    const PDFDocument = require("pdfkit");
    const bidder = await prisma.bidder.findUnique({
      where: { id: req.params.id },
      include: {
        checks:    { orderBy: { createdAt: "asc" } },
        documents: true,
        auditLogs: { orderBy: { timestamp: "desc" }, include: { officer: { select: { name: true, email: true } } } },
      },
    });
    if (!bidder) return notFound(res, req.params.id);

    const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: true });
    const safeFilename = `Praman_Report_${bidder.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
    doc.pipe(res);

    const NAVY   = "#173A5C";
    const GOLD   = "#D4A017";
    const PASS   = "#1E7A34";
    const FAIL   = "#B3261E";
    const WARN   = "#B8860B";
    const MUTED  = "#5B6572";

    // ── Header bar ──
    doc.rect(0, 0, doc.page.width, 70).fill(NAVY);
    doc.fill("white").font("Helvetica-Bold").fontSize(20)
       .text("PRAMAN", 50, 15, { continued: true })
       .fill(GOLD).text("  |  GeM Compliance Verification System", { baseline: "top" });
    doc.fill("white").font("Helvetica").fontSize(9)
       .text("Government e-Marketplace — Official Compliance Report", 50, 42);
    doc.fill("white").font("Helvetica").fontSize(8)
       .text(`Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`, 50, 55);

    // ── Gold accent ──
    doc.rect(0, 70, doc.page.width, 4).fill(GOLD);

    let y = 95;

    // ── Section: Company Profile ──
    doc.rect(50, y, doc.page.width - 100, 22).fill(NAVY);
    doc.fill("white").font("Helvetica-Bold").fontSize(10).text("BIDDER PROFILE", 58, y + 6);
    y += 30;

    const profileFields = [
      ["Company Name",  bidder.name],
      ["GSTIN",         bidder.gstin],
      ["PAN",           bidder.pan],
      ["Udyam Number",  bidder.udyam],
      ["Tender ID",     bidder.tenderId],
      ["Tender Name",   bidder.tenderName],
      ["Status",        bidder.status.replace("_"," ").toUpperCase()],
      ["Registered On", new Date(bidder.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })],
    ];

    for (const [label, value] of profileFields) {
      doc.fill(MUTED).font("Helvetica-Bold").fontSize(8).text(label.toUpperCase(), 50, y);
      doc.fill("#1A1F27").font("Helvetica").fontSize(9).text(value || "—", 200, y);
      y += 16;
    }

    y += 10;

    // ── Score Box ──
    doc.rect(50, y, 200, 70).stroke(NAVY);
    doc.fill(NAVY).font("Helvetica-Bold").fontSize(8).text("COMPLIANCE SCORE", 58, y + 6);
    const scoreColor = (bidder.score ?? 0) >= 80 ? PASS : (bidder.score ?? 0) >= 50 ? WARN : FAIL;
    doc.fill(scoreColor).font("Helvetica-Bold").fontSize(36)
       .text(`${bidder.score ?? "N/A"}`, 58, y + 18, { continued: true });
    doc.fill(MUTED).fontSize(14).text("/100");
    doc.fill(MUTED).fontSize(9).font("Helvetica")
       .text(`Risk Level: ${(bidder.risk || "Unverified").toUpperCase()}`, 58, y + 56);

    // Score formula box
    doc.rect(265, y, doc.page.width - 315, 70).stroke(NAVY);
    doc.fill(NAVY).font("Helvetica-Bold").fontSize(8).text("SCORING METHODOLOGY", 273, y + 6);
    doc.fill(MUTED).font("Helvetica").fontSize(7).text(
      "Score = Σ(check_weight × points) / Σ(total_weights) × 100\n" +
      "Penalty: 1 critical fail = max 30 score | 2 = max 20 | 3 = max 10\n" +
      "Weight distribution: GST 20 | PAN 20 | Udyam 15 | Blacklisting 15 | Tender 10 |\n" +
      "MCA 6 | EPFO 5 | Local 5 | DigiLocker 2 | NSIC 2\n" +
      "Thresholds: ≥80 = Low Risk (APPROVE)  |  50–79 = Medium (REVIEW)  |  <50 = High (REJECT)",
      273, y + 18, { width: doc.page.width - 330 }
    );
    y += 90;

    // ── AI Recommendation ──
    if (bidder.recommendation) {
      doc.rect(50, y, doc.page.width - 100, 22).fill(GOLD);
      doc.fill(NAVY).font("Helvetica-Bold").fontSize(10).text("AI COMPLIANCE RECOMMENDATION (Ollama LLM)", 58, y + 6);
      y += 30;
      doc.rect(50, y, doc.page.width - 100, 1).fill(GOLD);
      y += 8;
      doc.fill("#1A1F27").font("Helvetica").fontSize(9)
         .text(bidder.recommendation, 50, y, { width: doc.page.width - 100, align: "justify" });
      y += doc.heightOfString(bidder.recommendation, { width: doc.page.width - 100 }) + 20;
    }

    // ── Compliance Checks ──
    if (y > 680) { doc.addPage(); y = 60; }

    doc.rect(50, y, doc.page.width - 100, 22).fill(NAVY);
    doc.fill("white").font("Helvetica-Bold").fontSize(10).text("COMPLIANCE CHECKS — DETAILED BREAKDOWN", 58, y + 6);
    y += 30;

    // Table header
    const colWidths = [30, 220, 50, 70, 145];
    const colX = [50, 80, 300, 350, 420];
    doc.fill(NAVY).rect(50, y, doc.page.width - 100, 18).fill("#DCE4EC");
    ["#", "CHECK", "WEIGHT", "RESULT", "NOTES"].forEach((h, i) => {
      doc.fill(NAVY).font("Helvetica-Bold").fontSize(7).text(h, colX[i], y + 5, { width: colWidths[i] });
    });
    y += 20;

    for (let i = 0; i < (bidder.checks || []).length; i++) {
      const c = bidder.checks[i];
      if (y > 750) { doc.addPage(); y = 60; }

      const stateColor = c.state === "pass" ? PASS : c.state === "fail" ? FAIL : c.state === "warn" ? WARN : MUTED;
      const rowBg = i % 2 === 0 ? "#FFFFFF" : "#F8F9FA";
      const rowH = Math.max(30, doc.heightOfString(c.note || "", { width: colWidths[4] - 5 }) + 10);

      doc.rect(50, y, doc.page.width - 100, rowH).fill(rowBg);
      doc.fill(MUTED).font("Helvetica").fontSize(7).text(`${i + 1}`, colX[0], y + 5, { width: colWidths[0] });
      doc.fill("#1A1F27").font("Helvetica-Bold").fontSize(7).text(c.label, colX[1], y + 5, { width: colWidths[1] - 5 });
      doc.fill(MUTED).font("Helvetica").fontSize(7).text(`${c.weight}pts`, colX[2], y + 5, { width: colWidths[2] });
      doc.fill(stateColor).font("Helvetica-Bold").fontSize(7).text(c.state.toUpperCase(), colX[3], y + 5, { width: colWidths[3] });
      doc.fill(MUTED).font("Helvetica").fontSize(6.5).text(c.note || "—", colX[4], y + 5, { width: colWidths[4] - 5 });
      y += rowH + 2;
    }

    // ── Audit Trail ──
    if (bidder.auditLogs && bidder.auditLogs.length > 0) {
      if (y > 650) { doc.addPage(); y = 60; }
      y += 15;
      doc.rect(50, y, doc.page.width - 100, 22).fill(NAVY);
      doc.fill("white").font("Helvetica-Bold").fontSize(10).text("AUDIT TRAIL", 58, y + 6);
      y += 30;

      for (const log of bidder.auditLogs.slice(0, 15)) {
        if (y > 750) { doc.addPage(); y = 60; }
        const ts = new Date(log.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
        doc.fill(NAVY).font("Helvetica-Bold").fontSize(7).text(`[${ts}] ${log.actor}`, 50, y);
        y += 12;
        doc.fill(MUTED).font("Helvetica").fontSize(7)
           .text(log.action, 60, y, { width: doc.page.width - 110 });
        y += doc.heightOfString(log.action, { width: doc.page.width - 110 }) + 8;
      }
    }

    // ── Footer on all pages ──
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.rect(0, doc.page.height - 35, doc.page.width, 35).fill(NAVY);
      doc.fill(GOLD).font("Helvetica-Bold").fontSize(8)
         .text("PRAMAN — GeM Compliance Verification System", 50, doc.page.height - 25);
      doc.fill("white").font("Helvetica").fontSize(7)
         .text(`CONFIDENTIAL | FOR OFFICIAL USE ONLY | Page ${i + 1} of ${pageCount}`,
               doc.page.width - 250, doc.page.height - 25);
    }

    doc.end();
  } catch (err) { next(err); }
});

module.exports = router;
