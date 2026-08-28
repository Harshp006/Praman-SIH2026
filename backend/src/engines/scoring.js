/**
 * scoring.js — Praman scoring engine
 *
 * Computes a bidder's compliance score, risk level, and hard-gate status
 * from their array of Check records. Pure function — no DB access.
 */

"use strict";

// How each check state contributes to the weighted score
const STATE_WEIGHTS = {
  pass:    1.0,
  warn:    0.6,
  missing: 0.3,
  fail:    0.0,
  na:      null, // excluded from both numerator and denominator
};

const BLACKLIST_LABEL = "Blacklisting / debarment";

/**
 * @param {Array<{ label: string, state: string, weight: number }>} checks
 * @returns {{ score: number, risk: string, hardGated: boolean }}
 */
function computeScore(checks) {
  let totalWeight    = 0;
  let weightedPoints = 0;
  let hardGated      = false;

  for (const check of checks) {
    const stateMultiplier = STATE_WEIGHTS[check.state];

    // Determine hard gate
    if (check.label === BLACKLIST_LABEL && check.state === "fail") {
      hardGated = true;
    }

    // Skip "na" checks — not applicable to this bidder/tender
    if (stateMultiplier === null) continue;

    totalWeight    += check.weight;
    weightedPoints += check.weight * stateMultiplier;
  }

  const score = totalWeight > 0
    ? Math.round((weightedPoints / totalWeight) * 100)
    : 0;

  const risk =
    score >= 75 ? "low"    :
    score >= 50 ? "medium" :
                  "high";

  return { score, risk, hardGated };
}

/**
 * Derive a human-readable status from score + hardGated flag.
 * Layer 2 uses this after verify; the officer still makes the final call.
 */
function deriveStatus(score, hardGated, currentStatus) {
  if (hardGated) return "rejected";
  // Don't downgrade an officer-approved bid automatically
  if (currentStatus === "approved" && score >= 75) return "approved";
  return "under_review";
}

module.exports = { computeScore, deriveStatus };
