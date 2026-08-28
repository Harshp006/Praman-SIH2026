/**
 * udyam.js — Mock Udyam / MSME portal connector
 */

"use strict";

const { portalDelay } = require("./_utils");

// Udyam format: UDYAM-XX-YY-XXXXXXX
const UDYAM_RE = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;

// Expired certificate — Rajputana Infra
const EXPIRED_UDYAM = "UDYAM-RJ-05-0034567";
// Reclassification pending — Himachal Green
const RECLASSIFY_UDYAM = "UDYAM-HP-01-0067890";

module.exports = async function checkUdyam(bidder) {
  await portalDelay();

  const udyam = bidder.udyam || "";

  if (!UDYAM_RE.test(udyam)) {
    return {
      state: "fail",
      note:  `Udyam registration number ${udyam} format invalid — not recognised by Udyam portal.`,
    };
  }

  if (udyam === EXPIRED_UDYAM) {
    return {
      state: "missing",
      note:  `Udyam certificate ${udyam} has expired. Renewal application (UAM-to-Udyam migration) filed but MoMSME approval pending. Certificate not currently valid.`,
    };
  }

  if (udyam === RECLASSIFY_UDYAM) {
    return {
      state: "warn",
      note:  `Udyam ${udyam}: reclassification from small to medium enterprise is under review following updated turnover declaration. Current classification may be superseded.`,
    };
  }

  return {
    state: "pass",
    note:  `Udyam ${udyam} is active and verified. Classification confirmed. NIC code matches tender category.`,
  };
};
