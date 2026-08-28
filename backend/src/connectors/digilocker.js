/**
 * digilocker.js — Mock DigiLocker document verification connector
 */

"use strict";

const { portalDelay } = require("./_utils");

// Forged CIN — Patel (hardGated)
const FORGED_PAN  = "AAACP7890L";
// PAN mismatch — Kaveri Systems
const MISMATCH_PAN = "AAHCK9012H";
// Udyam not linked to GSTIN — Himachal Green
const UNLINKED_PAN = "AAHFH4567M";

module.exports = async function checkDigiLocker(bidder) {
  await portalDelay();

  const pan = bidder.pan || "";

  if (pan === FORGED_PAN) {
    return {
      state: "fail",
      note:  "DigiLocker pull for company registration certificate FAILED — CIN does not match MCA21 records. Document appears to be fabricated. Flagged for NIC forensic review.",
    };
  }

  if (pan === MISMATCH_PAN) {
    return {
      state: "warn",
      note:  "DigiLocker: PAN document fetch returned a name mismatch between the registered PAN holder and GeM seller profile. Re-verification required before bid processing continues.",
    };
  }

  if (pan === UNLINKED_PAN) {
    return {
      state: "warn",
      note:  "DigiLocker: Udyam registration certificate not linked to the GSTIN registered on GeM. Linking required to enable automated verification in future cycles.",
    };
  }

  return {
    state: "pass",
    note:  "DigiLocker verification successful for all 3 documents (GST certificate, PAN card, Udyam registration). Document hashes match issuing authority records.",
  };
};
