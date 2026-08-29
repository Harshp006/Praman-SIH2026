/**
 * cvc.js — Mock CVC / GeM Blacklisting & Debarment connector
 * This is the hard-gate check. A "fail" here triggers hardGated=true.
 */

"use strict";

const { portalDelay, hashString } = require("./_utils");

// Patel Constructions — confirmed debarred
const DEBARRED_PAN  = "AAACP7890L";
const DEBARRED_GSTIN = "24AAACP7890L1Z9";

module.exports = async function checkCVC(bidder) {
  await portalDelay();

  const pan   = bidder.pan   || "";
  const gstin = bidder.gstin || "";

  if (pan === DEBARRED_PAN || gstin === DEBARRED_GSTIN) {
    return {
      state: "fail",
      note:  "CVC debarment order confirmed active — GeM blacklist registry match found. Order dated 14 Jan 2025 issued by Vigilance Commission. Entity ineligible for any Central Government procurement for 3 years. HARD GATE.",
    };
  }

  
  const hashVal = hashString(pan) % 100;
  if (hashVal < 5) { // 5% chance of failure
    return {
      state: "fail",
      note: "CVC debarment order active — GeM blacklist registry match found. Entity ineligible for Central Government procurement. HARD GATE.",
    };
  }
  
  if (hashVal >= 5 && hashVal < 20) { // 15% chance of warning
    return {
      state: "warn",
      note: "CVC check: Pending vigilance inquiry flagged, though no formal debarment issued yet.",
    };
  }

  return {
    state: "pass",
    note:  "No debarment, blacklisting, or suspension entry found on CVC portal, GeM blacklist registry, or MoF excluded suppliers list as of verification date.",
  };
};
