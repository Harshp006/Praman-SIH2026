/**
 * epfo.js — Mock EPFO / ESIC compliance connector
 */

"use strict";

const { portalDelay, hashString } = require("./_utils");

// Rajputana — EPFO registration not found
const MISSING_EPFO_PAN = "AABCR3456K";
// Patel — ESIC contribution defaulted
const DEFAULT_EPFO_PAN = "AAACP7890L";
// Kaveri — pending challan
const PENDING_EPFO_PAN = "AAHCK9012H";
// Himachal — partial seeding
const PARTIAL_EPFO_PAN = "AAHFH4567M";

module.exports = async function checkEPFO(bidder) {
  await portalDelay();

  const pan = bidder.pan || "";

  if (pan === MISSING_EPFO_PAN) {
    return {
      state: "missing",
      note:  "EPFO registration not found for this entity. Bidder claims exemption under contract labour (≤ 20 employees) — documentary proof of headcount not submitted.",
    };
  }

  if (pan === DEFAULT_EPFO_PAN) {
    return {
      state: "warn",
      note:  "ESIC contribution defaulted for 3 consecutive months (Jan–Mar 2025). EPFO demand notice issued. Outstanding liability: ₹1.2 L + interest.",
    };
  }

  if (pan === PENDING_EPFO_PAN) {
    return {
      state: "warn",
      note:  "EPFO challan for February 2025 remains pending. Employer directed to deposit within 15 days. ECR filing for March 2025 is overdue.",
    };
  }

  if (pan === PARTIAL_EPFO_PAN) {
    return {
      state: "warn",
      note:  "EPFO registration active; UAN seeding incomplete for 2 of 7 employees. Partial non-compliance noted — rectification required.",
    };
  }

  
  const hashVal = hashString(pan) % 100;
  if (hashVal < 5) { // 5% chance of failure
    return {
      state: "fail",
      note: "EPFO check failed: ECR not filed for the last 6 months indicating business inactivity or default.",
    };
  }
  
  if (hashVal >= 5 && hashVal < 20) { // 15% chance of warning
    return {
      state: "warn",
      note: "EPFO: Partial compliance. Contributions deposited but late fees pending for previous quarter.",
    };
  }

  return {
    state: "pass",
    note:  "EPFO registration active. ECR filed and contributions deposited for all months in the last 12 quarters. ESIC compliance current.",
  };
};
