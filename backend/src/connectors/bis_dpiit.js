/**
 * bis_dpiit.js — Mock BIS (Bureau of Indian Standards) / DPIIT (Dept. for
 * Promotion of Industry and Internal Trade) connector.
 *
 * Checks:
 *   1. BIS product certification (IS mark / CRS registration)
 *   2. DPIIT-recognised IP filing / patent status
 *
 * Portal: bis.gov.in / dpiit.gov.in
 */

"use strict";

const { portalDelay, hashString } = require("./_utils");

module.exports = async function checkBISDPIIT(bidder) {
  await portalDelay();

  const pan   = bidder.pan   || "";
  const gstin = bidder.gstin || "";
  const h     = hashString(pan + gstin) % 100;

  // Bidders dealing in goods that require BIS certification must have CRS
  // For services/civil tenders, this check is N/A
  const tenderName = (bidder.tenderName || "").toLowerCase();
  const isGoods = tenderName.includes("supply") || tenderName.includes("equipment") ||
                  tenderName.includes("hardware") || tenderName.includes("material");

  if (!isGoods && h > 30) {
    return {
      state: "na",
      note:  "BIS/DPIIT certification not applicable for service-only or civil construction tenders. Requirement waived as per GeM category guidelines.",
    };
  }

  // Deterministic outcome per bidder
  if (h < 8) {
    return {
      state: "fail",
      note:  "BIS CRS registration not found or expired. Compulsory Registration Scheme (CRS) certificate required for specified electronic/IT goods under this tender. Bidder is non-compliant.",
    };
  }

  if (h >= 8 && h < 18) {
    return {
      state: "warn",
      note:  "BIS IS Mark certificate uploaded. Certificate validity approaching expiry within 90 days. Renewal advised before tender award. DPIIT patent status — no filings found (N/A for this bid scope).",
    };
  }

  if (h >= 18 && h < 30) {
    return {
      state: "pass",
      note:  "DPIIT recognised startup with at least one accepted patent application. BIS certification requirement waived under Startup India relaxation scheme for this product category.",
    };
  }

  return {
    state: "pass",
    note:  `BIS CRS/IS Mark registration verified and valid. DPIIT GSTIN-linked manufacturer profile active. Product category certified under IS ${10000 + h} aligns with tender specifications.`,
  };
};
