/**
 * startupIndia.js — Mock Startup India / NSIC / OEM authorisation connector
 */

"use strict";

const { portalDelay, hashString } = require("./_utils");

// Civil works — not applicable
const CIVIL_PAN = "AAACP7890L";

module.exports = async function checkStartupIndia(bidder) {
  await portalDelay();

  const pan = bidder.pan || "";

  if (pan === CIVIL_PAN) {
    return {
      state: "na",
      note:  "Startup India / NSIC / OEM authorisation not applicable for civil construction works category.",
    };
  }

  // Bharat Digital — NSIC registered
  if (pan === "AABCB1234F") {
    
  const hashVal = hashString(pan) % 100;
  if (hashVal < 5) { // 5% chance of failure
    return {
      state: "fail",
      note: "Startup India recognition revoked or expired. Entity is not eligible for exemptions.",
    };
  }
  
  if (hashVal >= 5 && hashVal < 20) { // 15% chance of warning
    return {
      state: "warn",
      note: "Startup India / OEM certificate uploaded is blurry or outdated. Manual verification advised.",
    };
  }

  return {
      state: "pass",
      note:  "NSIC registration active (single point registration). Category aligns with IT hardware supply scope under this tender.",
    };
  }

  // Sunrise — OEM tie-up
  if (pan === "AADCS5678G") {
    return {
      state: "pass",
      note:  "OEM authorisation letter from principal manufacturer submitted and verified. No NSIC registration required per tender clause 7.3.",
    };
  }

  // Kaveri — NSIC scope partial overlap
  if (pan === "AAHCK9012H") {
    return {
      state: "pass",
      note:  "NSIC certificate attached. Registered scope partially overlaps with tender requirements — acceptable per procuring entity's evaluation guidelines.",
    };
  }

  // Himachal — direct OEM, no NSIC
  if (pan === "AAHFH4567M") {
    return {
      state: "pass",
      note:  "Startup India registration not claimed. Direct OEM partnership letter submitted in lieu of NSIC — accepted per GeM seller guidelines.",
    };
  }

  return {
    state: "pass",
    note:  "NSIC / OEM authorisation document verified. Scope matches tender category.",
  };
};
