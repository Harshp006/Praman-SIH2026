/**
 * scoring.js — Praman scoring engine
 *
 * Computes a bidder's compliance score and risk tier from their Check records.
 * Pure function — no DB access. Matches the spec exactly:
 *
 *   score = Σ(weight × multiplier) / Σ(applicable weights) × 100
 *   multiplier: pass=1.0, warn=0.5, missing/fail=0, na excluded from denominator
 *   risk: 80-100 → low  |  50-79 → medium  |  <50 → high
 */

"use strict";

// State → score multiplier (null = excluded from denominator)
const STATE_MULTIPLIER = {
  pass:    1.0,
  warn:    0.5,
  missing: 0.0,
  fail:    0.0,
  na:      null,
};

/**
 * @param {Array<{ label: string, state: string, weight: number }>} checks
 * @returns {{ score: number, risk: string }}
 */
function computeScore(checks) {
  let totalWeight    = 0;
  let weightedPoints = 0;

  for (const check of checks) {
    const multiplier = STATE_MULTIPLIER[check.state];

    // "na" checks are excluded from both numerator and denominator
    if (multiplier === null) continue;

    totalWeight    += check.weight;
    weightedPoints += check.weight * multiplier;
  }

  const score = totalWeight > 0
    ? Math.round((weightedPoints / totalWeight) * 100)
    : 0;

  // Risk tiers per spec: 80-100 low · 50-79 medium · <50 high
  const risk =
    score >= 80 ? "low"    :
    score >= 50 ? "medium" :
                  "high";

  return { score, risk };
}

module.exports = { computeScore };

