/**
 * apiV1.js — PRAMAN External Integration API (v1)
 *
 * Exposes secure API endpoints for external procurement platforms (e.g. GeM)
 * to verify bidder compliance and retrieve standardized JSON verification results.
 *
 * Endpoint: POST /api/v1/verify-bidder
 * Auth: Authorization: Bearer <PRAMAN_API_KEY>
 */

"use strict";

const express = require("express");
const { PrismaClient } = require("@prisma/client");

const apiKeyAuth = require("../middleware/apiKeyAuth");
const { runAllConnectors } = require("../connectors");
const { computeScore } = require("../engines/scoring");
const { generateRecommendation } = require("../engines/ollama");
const { validatePAN, validateGSTIN, validateUdyam } = require("../validators");

const router = express.Router();
const prisma = new PrismaClient();

// All /api/v1 routes require valid PRAMAN API key
router.use(apiKeyAuth);

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

function runDocumentValidations(pan, gstin, udyam, ocrResults = {}) {
  const ePAN   = (ocrResults.pan   || pan   || "").toUpperCase().trim();
  const eGSTIN = (ocrResults.gstin || gstin || "").toUpperCase().trim();
  const eUdyam = (ocrResults.udyam || udyam || "").toUpperCase().trim();

  const panR   = ePAN   ? { ...validatePAN(ePAN),   src: ocrResults.pan   ? "OCR" : "API Payload" } : { valid: false, reason: "PAN not provided",   src: "" };
  const gstinR = eGSTIN ? { ...validateGSTIN(eGSTIN), src: ocrResults.gstin ? "OCR" : "API Payload" } : { valid: false, reason: "GSTIN not provided", src: "" };
  const udyamR = eUdyam ? { ...validateUdyam(eUdyam), src: ocrResults.udyam ? "OCR" : "API Payload" } : { valid: false, reason: "Udyam not provided", src: "" };

  return {
    panState:   !ePAN   ? "missing" : (panR.valid   ? "pass" : "fail"),
    panNote:    panR.reason + (ePAN   ? ` [${panR.src}]`   : ""),
    gstinState: !eGSTIN ? "missing" : (gstinR.valid ? "pass" : "fail"),
    gstinNote:  gstinR.reason + (eGSTIN ? ` [${gstinR.src}]` : ""),
    udyamState: !eUdyam ? "missing" : (udyamR.valid ? "pass" : "fail"),
    udyamNote:  udyamR.reason + (eUdyam ? ` [${udyamR.src}]` : ""),
  };
}

/**
 * GET /api/v1/info
 * Status & API version summary for external integration healthcheck
 */
router.get("/info", (req, res) => {
  res.json({
    success: true,
    service: "PRAMAN Integration API",
    version: "v1.0",
    status: "ACTIVE",
    endpoints: [
      { path: "/api/v1/verify-bidder", method: "POST", auth: "Bearer PRAMAN_API_KEY" },
    ],
  });
});

/**
 * POST /api/v1/verify-bidder
 *
 * Body payload structure:
 * {
 *   "company_name": "Company Name",   (or "name")
 *   "gstin": "07AAAAA0000A1Z5",
 *   "pan": "AAAAA0000A",
 *   "udyam": "UDYAM-DL-00-0000000",
 *   "tender_id": "GEM/2026/B/1000001", (optional)
 *   "bidder_id": "EXT-101"            (optional external ID)
 * }
 */
router.post("/verify-bidder", async (req, res, next) => {
  try {
    const {
      company_name, name,
      gstin, pan, udyam,
      tender_id, tenderId,
      bidder_id, bidderId,
    } = req.body || {};

    const companyName = (company_name || name || "").trim();
    const cleanGSTIN  = (gstin || "").trim().toUpperCase();
    const cleanPAN    = (pan || "").trim().toUpperCase();
    const cleanUdyam  = (udyam || "").trim().toUpperCase();
    const reqTenderId = (tender_id || tenderId || "GEM/2026/B/1000001").trim();
    const extBidderId = (bidder_id || bidderId || null);

    // Validation
    const missing = [];
    if (!companyName) missing.push("company_name");
    if (!cleanGSTIN)  missing.push("gstin");
    if (!cleanPAN)    missing.push("pan");
    if (!cleanUdyam)  missing.push("udyam");

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Bad Request",
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    // Ensure officer reference exists for DB FK constraint
    let officer = await prisma.officer.findFirst();
    if (!officer) {
      officer = await prisma.officer.create({
        data: {
          email: "system.api@praman.local",
          passwordHash: "API_INTEGRATION",
          name: "GeM Integration API System",
        },
      });
    }

    // Ensure target Tender exists
    let tender = await prisma.tender.findUnique({ where: { tenderId: reqTenderId } });
    if (!tender) {
      tender = await prisma.tender.create({
        data: {
          tenderId: reqTenderId,
          name: `Procurement Tender ${reqTenderId}`,
          description: `Integration tender registered via PRAMAN API for ${companyName}`,
        },
      });
    }

    // Create or update Bidder record in PRAMAN DB
    let bidder = await prisma.bidder.findFirst({
      where: { gstin: cleanGSTIN, tenderId: tender.tenderId },
    });

    if (!bidder) {
      bidder = await prisma.bidder.create({
        data: {
          name: companyName,
          gstin: cleanGSTIN,
          pan: cleanPAN,
          udyam: cleanUdyam,
          tenderId: tender.tenderId,
          tenderName: tender.name,
          status: "pending_review",
          createdById: officer.id,
        },
      });
    } else {
      bidder = await prisma.bidder.update({
        where: { id: bidder.id },
        data: { name: companyName, pan: cleanPAN, udyam: cleanUdyam },
      });
    }

    console.log(`[API v1] Running verification workflow for '${bidder.name}' (${bidder.id})`);

    // Execute PRAMAN Verification Pipeline (Connectors + Document Validations)
    const docVal = runDocumentValidations(bidder.pan, bidder.gstin, bidder.udyam);
    const connectorResults = await runAllConnectors(bidder);

    // Build checks array
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
            note = "DigiLocker verification failed due to document data inconsistencies.";
          }
        }
      }
      checkData.push({ ...def, bidderId: bidder.id, state, note });
    }

    // Persist checks
    await prisma.check.deleteMany({ where: { bidderId: bidder.id } });
    await prisma.check.createMany({ data: checkData });

    const checks = await prisma.check.findMany({
      where: { bidderId: bidder.id },
      orderBy: { createdAt: "asc" },
    });

    // Score & Risk Level calculation
    const { score, risk } = computeScore(checks);

    // AI Recommendation (Ollama or rule fallback)
    bidder.score = score;
    bidder.risk = risk;
    const recommendation = await generateRecommendation(bidder, checks);

    // Update bidder record with results
    await prisma.bidder.update({
      where: { id: bidder.id },
      data: { score, risk, recommendation },
    });

    // Audit trail logging
    await prisma.auditLog.create({
      data: {
        bidderId: bidder.id,
        officerId: officer.id,
        actor: "External API (GeM Integration)",
        action: `External API verification completed. ${checks.length} compliance checks evaluated. Score: ${score}/100 (${risk} risk).`,
      },
    });

    // Format standardized JSON response
    const verificationId = `VRF-${bidder.id.slice(-8).toUpperCase()}`;
    const passedCount  = checks.filter((c) => c.state === "pass").length;
    const failedCount  = checks.filter((c) => c.state === "fail").length;
    const warningCount = checks.filter((c) => c.state === "warn").length;

    const observations = checks.map(
      (c) => `[${c.state.toUpperCase()}] ${c.label}: ${c.note}`
    );

    return res.json({
      success: true,
      verification_id: verificationId,
      status: "COMPLETED",
      timestamp: new Date().toISOString(),
      result: {
        bidder_id: bidder.id,
        external_bidder_id: extBidderId,
        company_name: bidder.name,
        gstin: bidder.gstin,
        pan: bidder.pan,
        udyam: bidder.udyam,
        tender_id: bidder.tenderId,
        tender_name: bidder.tenderName,
        compliance_score: score,
        risk_level: (risk || "HIGH").toUpperCase(),
        checks_passed: passedCount,
        checks_failed: failedCount,
        checks_warning: warningCount,
        recommendation: recommendation,
        observations: observations,
        checks: checks.map((c) => ({
          label: c.label,
          category: c.category,
          state: c.state,
          weight: c.weight,
          note: c.note,
        })),
      },
    });
  } catch (err) {
    console.error("[API v1 Error]", err);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: err.message || "An unexpected error occurred during bidder verification.",
    });
  }
});

module.exports = router;
