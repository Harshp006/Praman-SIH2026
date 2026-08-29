/**
 * mca21.js — Mock MCA21 Company Status connector
 */

"use strict";

const { portalDelay, hashString } = require("./_utils");

// Patel — STRIKE-OFF
const STRIKE_OFF_PAN = "AAACP7890L";
// Himachal (LLP) — director KYC issue
const DIR_KYC_PAN = "AABCR3456K";

module.exports = async function checkMCA21(bidder) {
  await portalDelay();

  const pan = bidder.pan || "";

  if (pan === STRIKE_OFF_PAN) {
    return {
      state: "fail",
      note:  "MCA21: Company marked STRIKE-OFF by Registrar of Companies (RoC) order dated 02 Feb 2025 under Section 248 of Companies Act. Entity has no legal standing to enter into contracts.",
    };
  }

  if (pan === DIR_KYC_PAN) {
    return {
      state: "warn",
      note:  "MCA21: DIN of one director flagged for non-filing of DIR-3 KYC for FY 2024-25. Director's DIN is deactivated; restoration application required.",
    };
  }

  
  const hashVal = hashString(pan) % 100;
  if (hashVal < 5) { // 5% chance of failure
    return {
      state: "fail",
      note: "MCA21: Company marked STRIKE-OFF by Registrar of Companies (RoC). Entity has no legal standing to enter into contracts.",
    };
  }
  
  if (hashVal >= 5 && hashVal < 20) { // 15% chance of warning
    return {
      state: "warn",
      note: "MCA21: DIN of one director flagged for non-filing of DIR-3 KYC. Director's DIN is deactivated; restoration application required.",
    };
  }

  return {
    state: "pass",
    note:  "MCA21: Company/LLP status is ACTIVE. Annual filings (MGT-7/AOC-4 or LLP Form 11/8) are up to date. No strike-off proceedings or disqualified directors on record.",
  };
};
