/**
 * makeInIndia.js — Mock Make in India / Local Content portal connector
 */

"use strict";

const { portalDelay } = require("./_utils");

// No MII cert uploaded for Kaveri Systems
const MISSING_MII_PAN = "AAHCK9012H";
// MII applicable but not notarised — Himachal Green
const NOTARISATION_PAN = "AAHFH4567M";
// Civil works — MII not applicable
const CIVIL_WORKS_PAN = "AAACP7890L";

module.exports = async function checkMakeInIndia(bidder) {
  await portalDelay();

  const pan = bidder.pan || "";

  if (pan === CIVIL_WORKS_PAN) {
    return {
      state: "na",
      note:  "Make in India / BIS local content certificate not applicable for civil works and structural repair category tenders.",
    };
  }

  if (pan === MISSING_MII_PAN) {
    return {
      state: "missing",
      note:  "BIS/Make-in-India certificate not uploaded to GeM portal. Local content declaration (50% threshold) cannot be verified. Document required.",
    };
  }

  if (pan === NOTARISATION_PAN) {
    return {
      state: "warn",
      note:  "Local content declaration submitted but notarisation by a gazetted officer is absent. Re-submission required with notarised copy.",
    };
  }

  return {
    state: "pass",
    note:  "BIS certification present and valid. Self-declared local content ≥ 50% — consistent with Class II supplier classification under Make in India order.",
  };
};
