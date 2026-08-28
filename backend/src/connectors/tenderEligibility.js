/**
 * tenderEligibility.js — Mock Tender-Specific Eligibility connector
 * Checks prior order experience value against tender's minimum threshold.
 */

"use strict";

const { portalDelay } = require("./_utils");

// Experience shortfalls mapped by PAN
const PROFILES = {
  "AAHCK9012H": { // Kaveri — ₹80 L vs ₹1 Cr required
    state: "warn",
    note:  "Prior order experience certificate covers ₹80 L; tender clause 4.2 requires minimum ₹1 Cr cumulative order value in similar category. Shortfall of ₹20 L. Bidder may submit additional experience letters within cure window.",
  },
  "AABCR3456K": { // Rajputana — completion cert not attested
    state: "warn",
    note:  "Completion certificate for previous solar order (₹1.2 Cr) is not attested by the client's competent authority. Unattested certificates are not admissible per tender clause 4.3.",
  },
  "AAACP7890L": { // Patel — turnover misrepresentation
    state: "fail",
    note:  "Bid document declares turnover of ₹12 Cr; MCA21 annual filings show turnover of ₹3.2 Cr. Misrepresentation of financial eligibility — bid liable for summary rejection under fraud clause.",
  },
  "AAHFH4567M": { // Himachal — experience shortfall
    state: "warn",
    note:  "Previous order value of ₹55 L against minimum required ₹75 L per tender eligibility matrix. Shortfall of ₹20 L. Bidder requested relaxation citing MSME status.",
  },
};

module.exports = async function checkTenderEligibility(bidder) {
  await portalDelay();

  const pan = bidder.pan || "";

  if (PROFILES[pan]) {
    return PROFILES[pan];
  }

  return {
    state: "pass",
    note:  "Tender-specific eligibility criteria verified: prior order experience, financial turnover, and sector-specific qualifications all meet or exceed the tender's minimum thresholds.",
  };
};
