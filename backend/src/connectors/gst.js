/**
 * gst.js — Mock GST Portal connector
 * Checks GSTIN format, registration status, and return filing compliance.
 */

"use strict";

const { portalDelay, hashString } = require("./_utils");

// Standard GSTIN regex (2-digit state + PAN + entity type + Z + checksum)
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

// State codes that the seed uses for the "suspended GST" bidder (Rajputana — code 08)
// and the blacklisted bidder (Patel — code 24, show-cause notice)
const SUSPENDED_STATE_CODES = new Set(["08"]);  // Rajputana Infra
const WARNING_PAN_PREFIX     = "AAACP";          // Patel Constructions

module.exports = async function checkGST(bidder) {
  await portalDelay();

  const gstin = bidder.gstin || "";

  if (!GSTIN_RE.test(gstin)) {
    return {
      state: "fail",
      note:  `GSTIN ${gstin} is malformed — rejected by GST portal validation API.`,
    };
  }

  const stateCode = gstin.substring(0, 2);
  const pan       = gstin.substring(2, 12);

  // Blacklisted bidder — show-cause notice, GSTIN mismatch
  if (pan.startsWith(WARNING_PAN_PREFIX)) {
    return {
      state: "warn",
      note:  `GSTIN ${gstin} is under scrutiny — show-cause notice issued by GSTN authority. Return filing for last quarter is overdue.`,
    };
  }

  // Bidder with a suspended/overdue state
  if (SUSPENDED_STATE_CODES.has(stateCode)) {
    return {
      state: "warn",
      note:  `GST return for GSTR-3B overdue for current quarter; GSTIN temporarily restricted. Bidder must file and clear dues to restore active status.`,
    };
  }

  // Use hash to give borderline bidder a minor warn
  const h = hashString(gstin);
  if (h % 7 === 0) {
    return {
      state: "warn",
      note:  `GSTIN ${gstin} active, but one quarter return was filed with a 4-day delay. No penalty outstanding. GST portal flags late filing.`,
    };
  }

  return {
    state: "pass",
    note:  `GSTIN ${gstin} active on GST portal. All GSTR-1/3B returns filed on time for the last 8 quarters. No outstanding dues or notices.`,
  };
};
