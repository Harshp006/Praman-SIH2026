"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");

const config = require("../config");
const apiKeyAuth = require("../middleware/apiKeyAuth");
const { extractDocumentFields } = require("../ocr");
const { runAllConnectors } = require("../connectors");
const { computeScore } = require("../engines/scoring");
const { generateRecommendation } = require("../engines/ollama");
const { validatePAN, validateGSTIN, validateUdyam } = require("../validators");

const router = express.Router();
const prisma = new PrismaClient();

// ─── Rate Limiter ────────────────────────────────────────────────────────────

const gemRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  // Key by API key only — avoids express-rate-limit IPv6 validation warning
  validate: { ip: false },
  keyGenerator: (req) => req.header("X-API-Key") || "anonymous",
  handler: (req, res) => {
    console.warn(`[GeM API] Rate limit exceeded for key: ${req.header("X-API-Key") || "anonymous"}`);
    res.status(429).json({ error: "Rate limit exceeded, try again shortly" });
  },
});

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const bidderSchema = z.object({
  name: z.string().min(2).max(200),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format"),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format"),
  udyam: z.string().regex(/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/, "Invalid Udyam format"),
  tenderId: z.string().min(1).max(100),
  tenderName: z.string().min(1).max(200),
  documents: z.array(z.object({
    type: z.enum(["PAN", "GST", "UDYAM"]),
    base64: z.string().max(7 * 1024 * 1024) // Rough max length for ~5MB decoded (base64 is ~33% larger)
  })).max(3),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GST_TO_UDYAM_STATE = {
  "01": "JK", "02": "HP", "03": "PB", "04": "CH", "05": "UK",
  "06": "HR", "07": "DL", "08": "RJ", "09": "UP", "10": "BR",
  "11": "SK", "12": "AR", "13": "NL", "14": "MN", "15": "MZ",
  "16": "TR", "17": "ML", "18": "AS", "19": "WB", "20": "JH",
  "21": "OR", "22": "CG", "23": "MP", "24": "GJ", "25": "DD", "26": "DN", 
  "27": "MH", "28": "AP", "29": "KA", "30": "GA", "31": "LD",
  "32": "KL", "33": "TN", "34": "PY", "35": "AN", "36": "TS",
  "37": "AD", "38": "LA"
};

function runDocumentValidations(pan, gstin, udyam, ocrResults) {
  const ePAN   = (ocrResults.pan   || pan   || "").toUpperCase().trim();
  const eGSTIN = (ocrResults.gstin || gstin || "").toUpperCase().trim();
  const eUdyam = (ocrResults.udyam || udyam || "").toUpperCase().trim();

  const panR   = ePAN   ? { ...(validatePAN(ePAN)),   src: ocrResults.pan   ? "OCR" : "Form" } : { valid: false, reason: "PAN not provided",   src: "" };
  const gstinR = eGSTIN ? { ...(validateGSTIN(eGSTIN)), src: ocrResults.gstin ? "OCR" : "Form" } : { valid: false, reason: "GSTIN not provided", src: "" };
  const udyamR = eUdyam ? { ...(validateUdyam(eUdyam)), src: ocrResults.udyam ? "OCR" : "Form" } : { valid: false, reason: "Udyam not provided", src: "" };

  let panState   = !ePAN   ? "missing" : (panR.valid   ? "pass" : "fail");
  let panNote    = panR.reason + (ePAN   ? ` [${panR.src}]`   : "");
  let gstinState = !eGSTIN ? "missing" : (gstinR.valid ? "pass" : "fail");
  let gstinNote  = gstinR.reason + (eGSTIN ? ` [${gstinR.src}]` : "");
  let udyamState = !eUdyam ? "missing" : (udyamR.valid ? "pass" : "fail");
  let udyamNote  = udyamR.reason + (eUdyam ? ` [${udyamR.src}]` : "");

  if (gstinState === "pass" && udyamState === "pass" && eGSTIN && eUdyam) {
    const gstStateNum = eGSTIN.substring(0, 2);
    const udyamStateStr = eUdyam.split("-")[1];
    
    if (udyamStateStr && GST_TO_UDYAM_STATE[gstStateNum]) {
      if (GST_TO_UDYAM_STATE[gstStateNum] !== udyamStateStr) {
        gstinState = "warn";
        udyamState = "warn";
        const mismatchMsg = ` State code mismatch: GSTIN denotes ${GST_TO_UDYAM_STATE[gstStateNum]} (${gstStateNum}) but Udyam denotes ${udyamStateStr}. Required to be identical.`;
        gstinNote += mismatchMsg;
        udyamNote += mismatchMsg;
      }
    }
  }

  return { panState, panNote, gstinState, gstinNote, udyamState, udyamNote };
}

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

function serializeBidderForGem(bidder) {
  return {
    bidderId: bidder.id,
    status: bidder.status,
    score: bidder.score,
    risk: bidder.risk,
    createdAt: bidder.createdAt
  };
}

function sanitizeString(str) {
  if (!str) return str;
  return str.replace(/<[^>]*>?/gm, ''); // simple html tag stripper
}

// ─── Middleware applied to all /api/v1/gem routes ────────────────────────────

// Use the limit specifically on this router before the routes are hit
router.use(express.json({ limit: '10mb' }));

// Health check does not need auth/rate limit, so we put it before the middlewares
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use(apiKeyAuth);
router.use(gemRateLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────

router.post("/bidders", async (req, res) => {
  try {
    const validated = bidderSchema.safeParse(req.body);
    if (!validated.success) {
      // Log validation failure
      await prisma.auditLog.create({
        data: {
          bidderId: "unknown",
          actor: "GeM Integration",
          action: "Validation failed for incoming POST request"
        }
      });
      return res.status(400).json({ error: "Validation failed", details: validated.error.format() });
    }

    const data = validated.data;
    const name = sanitizeString(data.name).trim();
    const gstin = sanitizeString(data.gstin).trim().toUpperCase();
    const pan = sanitizeString(data.pan).trim().toUpperCase();
    const udyam = sanitizeString(data.udyam).trim().toUpperCase();
    const tenderId = sanitizeString(data.tenderId).trim();
    const tenderName = sanitizeString(data.tenderName).trim();

    // Ensure tender exists (if not, we could create it, but let's assume it should exist or just create a dummy one)
    let tender = await prisma.tender.findUnique({ where: { tenderId } });
    if (!tender) {
      tender = await prisma.tender.create({
        data: { tenderId, name: tenderName, description: "Created via GeM API" }
      });
    }

    // Get a dummy officer id for "System" if needed, but schema says createdById is an Officer FK. 
    // We must find an existing officer or create a system one.
    // Let's use the first officer or create one.
    let officer = await prisma.officer.findFirst();
    if (!officer) {
      officer = await prisma.officer.create({
        data: { email: "system@praman.gov.in", passwordHash: "dummy", name: "System" }
      });
    }

    const bidder = await prisma.bidder.create({
      data: {
        name, gstin, pan, udyam, tenderId: tender.tenderId, tenderName: tender.name,
        status: "pending_review", createdById: officer.id
      },
    });

    // Save documents
    const savedDocs = [];
    if (data.documents && data.documents.length > 0) {
      const bidderDir = path.join(config.UPLOADS_DIR, bidder.id);
      fs.mkdirSync(bidderDir, { recursive: true });

      for (const doc of data.documents) {
        const decoded = Buffer.from(doc.base64, 'base64');
        if (decoded.length > 5 * 1024 * 1024) {
           return res.status(400).json({ error: `Document ${doc.type} exceeds 5MB size limit.` });
        }
        
        // guess extension based on magic bytes (simple)
        let ext = ".bin";
        if (decoded[0] === 0x25 && decoded[1] === 0x50 && decoded[2] === 0x44 && decoded[3] === 0x46) {
          ext = ".pdf";
        } else if (decoded[0] === 0xFF && decoded[1] === 0xD8) {
          ext = ".jpg";
        } else if (decoded[0] === 0x89 && decoded[1] === 0x50 && decoded[2] === 0x4E && decoded[3] === 0x47) {
          ext = ".png";
        }
        
        const fileName = `${doc.type}_${Date.now()}${ext}`;
        const filePath = path.join(bidderDir, fileName);
        fs.writeFileSync(filePath, decoded);

        const savedDoc = await prisma.document.create({
          data: { bidderId: bidder.id, type: doc.type, fileName, filePath }
        });
        savedDocs.push(savedDoc);
      }
    }

    // Write initial AuditLog with actor "GeM Integration" - this helps us identify external bidders
    await prisma.auditLog.create({
      data: {
        bidderId: bidder.id,
        actor: "GeM Integration",
        action: "Bidder received via external API",
      },
    });

    // ─── Verification Pipeline ───

    let ocrPAN = null, ocrGSTIN = null, ocrUdyam = null;
    for (const doc of savedDocs) {
      try {
        const extracted = await extractDocumentFields(doc.filePath, doc.type);
        if (!ocrPAN   && extracted.pan)   ocrPAN   = extracted.pan;
        if (!ocrGSTIN && extracted.gstin) ocrGSTIN = extracted.gstin;
        if (!ocrUdyam && extracted.udyam) ocrUdyam = extracted.udyam;
      } catch (e) {
        console.warn(`[GeM API OCR] Failed for ${doc.type}: ${e.message}`);
      }
    }

    const ocrResults = { pan: ocrPAN, gstin: ocrGSTIN, udyam: ocrUdyam };
    const docVal = runDocumentValidations(bidder.pan, bidder.gstin, bidder.udyam, ocrResults);

    const connectorResults = await runAllConnectors(bidder);

    const checkData = [];
    for (let i = 0; i < CHECK_DEFS.length; i++) {
      const def = CHECK_DEFS[i];
      let state, note;

      if (i === 0) {
        const r = connectorResults.get(def.label);
        state = r?.state || docVal.gstinState;
        note  = r?.note  || docVal.gstinNote;
        if (docVal.gstinState !== "pass") { state = docVal.gstinState; note = docVal.gstinNote; }
      } else if (i === 1) {
        const r = connectorResults.get(def.label);
        state = r?.state || docVal.panState;
        note  = r?.note  || docVal.panNote;
        if (docVal.panState !== "pass") { state = docVal.panState; note = docVal.panNote; }
      } else if (i === 2) {
        const r = connectorResults.get(def.label);
        state = r?.state || docVal.udyamState;
        note  = r?.note  || docVal.udyamNote;
        if (docVal.udyamState !== "pass") { state = docVal.udyamState; note = docVal.udyamNote; }
      } else {
        const r = connectorResults.get(def.label);
        state = r?.state || "missing";
        note  = r?.note  || "Portal check did not return a result.";
        
        if (def.label === "DigiLocker document verification") {
          if (state === "pass" && (docVal.gstinState === "fail" || docVal.panState === "fail" || docVal.udyamState === "fail")) {
            state = "fail";
            note = "DigiLocker verification failed due to inconsistencies in source documents (GST/PAN/Udyam). Could not retrieve matching verified hashes.";
          }
        }
      }
      checkData.push({ ...def, bidderId: bidder.id, state, note });
    }

    await prisma.check.createMany({ data: checkData });

    const checks = await prisma.check.findMany({
      where: { bidderId: bidder.id }, orderBy: { createdAt: "asc" },
    });

    const { score, risk } = computeScore(checks);
    let recommendation = null;
    try {
      recommendation = await generateRecommendation({ ...bidder, score, risk }, checks);
    } catch (e) {
       console.warn(`[GeM API Ollama] Failed to generate recommendation: ${e.message}`);
    }

    const updatedBidder = await prisma.bidder.update({
      where: { id: bidder.id },
      data:  { score, risk, recommendation },
    });

    // Write final AuditLog
    await prisma.auditLog.create({
      data: {
        bidderId: bidder.id,
        actor: "GeM Integration",
        action: `External API pipeline completed. Score: ${score}/100 (${risk} risk).`,
      },
    });

    res.status(201).json(serializeBidderForGem(updatedBidder));
  } catch (err) {
    console.error("[GeM API Error]", err);
    res.status(500).json({ error: "Internal processing error" });
  }
});

router.get("/bidders/:id/status", async (req, res) => {
  try {
    const bidder = await prisma.bidder.findUnique({
      where: { id: req.params.id },
    });

    if (!bidder) {
      return res.status(404).json({ error: "Bidder not found" });
    }

    // Check if bidder was created by GeM Integration
    const firstLog = await prisma.auditLog.findFirst({
      where: { bidderId: bidder.id, actor: "GeM Integration", action: "Bidder received via external API" },
    });

    if (!firstLog) {
      return res.status(404).json({ error: "Bidder not found" }); // Do not leak that it exists internally
    }

    // Log the access
    await prisma.auditLog.create({
      data: {
        bidderId: bidder.id,
        actor: "GeM Integration",
        action: "Checked bidder status via API",
      },
    });

    res.json(serializeBidderForGem(bidder));
  } catch (err) {
    console.error("[GeM API Error]", err);
    res.status(500).json({ error: "Internal processing error" });
  }
});

module.exports = router;
