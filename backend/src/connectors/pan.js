/**
 * pan.js — Mock Income Tax / PAN portal connector
 * Checks PAN validity and ITR filing status.
 */

"use strict";

const { portalDelay, hashString } = require("./_utils");

// PAN format: AAAAA9999A
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

// Blacklisted bidder's PAN
const BLACKLISTED_PAN = "AAACP7890L";
// Bidder with late filing (Kaveri Systems)
const LATE_FILING_PAN = "AAHCK9012H";
// Borderline bidder (Himachal Green)
const PENDING_LINK_PAN = "AAHFH4567M";

module.exports = async function checkPAN(bidder) {
  await portalDelay();

  const pan = bidder.pan || "";

  if (!PAN_RE.test(pan)) {
    return {
      state: "fail",
      note:  `PAN ${pan} is malformed — not found in NSDL/ITD database.`,
    };
  }

  if (pan === BLACKLISTED_PAN) {
    return {
      state: "warn",
      note:  `PAN ${pan}: income tax demand of ₹18 L outstanding for AY 2022-23. Assessees under scrutiny. Advance tax payment defaulted.`,
    };
  }

  if (pan === LATE_FILING_PAN) {
    return {
      state: "warn",
      note:  `PAN ${pan}: ITR for AY 2023-24 filed with a delay (penalty ₹5,000 levied under Sec 234F). No current default on record.`,
    };
  }

  if (pan === PENDING_LINK_PAN) {
    return {
      state: "warn",
      note:  `PAN ${pan}: PAN-Aadhaar linking for promoter (DIN holder) pending as of last check. May affect future compliance filings.`,
    };
  }

  const h = hashString(pan);
  if (h % 11 === 0) {
    return {
      state: "warn",
      note:  `PAN ${pan}: advance tax instalment for Q3 was 5 days late. No penalty raised; flagged for monitoring.`,
    };
  }

  return {
    state: "pass",
    note:  `PAN ${pan} verified with NSDL. ITR filed for AY 2022-23, 2023-24, 2024-25. No outstanding demand or scrutiny notice.`,
  };
};
