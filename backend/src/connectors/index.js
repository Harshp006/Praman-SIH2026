/**
 * connectors/index.js — Connector registry + runAllConnectors()
 *
 * Each connector is a pure async function:
 *   (bidder: BidderRow) => Promise<{ state: string, note: string }>
 *
 * The label keys MUST exactly match the Check.label values in the schema.
 */

"use strict";

const checkGST              = require("./gst");
const checkPAN              = require("./pan");
const checkUdyam            = require("./udyam");
const checkMakeInIndia      = require("./makeInIndia");
const checkEPFO             = require("./epfo");
const checkStartupIndia     = require("./startupIndia");
const checkDigiLocker       = require("./digilocker");
const checkCVC              = require("./cvc");
const checkMCA21            = require("./mca21");
const checkTenderEligibility = require("./tenderEligibility");

/**
 * Ordered list matching CHECK_DEFS in seed.js (index = Check order).
 * The label must match Check.label exactly so the verify route can find
 * the correct Check row to update.
 */
const CONNECTORS = [
  { label: "GST registration & return filing",         fn: checkGST              },
  { label: "PAN & Income Tax compliance",              fn: checkPAN              },
  { label: "Udyam / MSME registration",               fn: checkUdyam            },
  { label: "Make in India / local content",            fn: checkMakeInIndia      },
  { label: "EPFO / ESIC compliance",                  fn: checkEPFO             },
  { label: "Startup India / NSIC / OEM authorization", fn: checkStartupIndia    },
  { label: "DigiLocker document verification",         fn: checkDigiLocker       },
  { label: "Blacklisting / debarment",                 fn: checkCVC              },
  { label: "MCA21 company status",                     fn: checkMCA21            },
  { label: "Tender-specific eligibility clause",       fn: checkTenderEligibility },
];

/**
 * Run all 10 connectors in parallel.
 * Returns a Map<label → { state, note }>.
 * Never rejects — individual connector errors are caught and returned as "warn".
 */
async function runAllConnectors(bidder) {
  const results = new Map();

  await Promise.all(
    CONNECTORS.map(async ({ label, fn }) => {
      try {
        results.set(label, await fn(bidder));
      } catch (err) {
        console.warn(`[Connector] ${label} threw:`, err.message);
        results.set(label, {
          state: "warn",
          note:  `Portal check failed unexpectedly: ${err.message}. Manual verification required.`,
        });
      }
    })
  );

  return results;
}

module.exports = { CONNECTORS, runAllConnectors };
