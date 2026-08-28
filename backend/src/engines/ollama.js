/**
 * ollama.js — Ollama LLM client + rule-based fallback
 *
 * Tries to call the local Ollama service to generate a compliance recommendation.
 * If Ollama is unreachable / model not ready, produces a structured fallback.
 */

"use strict";

const axios  = require("axios");
const config = require("../config");

// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildPrompt(bidder, checks) {
  const checkLines = checks
    .map(c => `  • [${c.state.toUpperCase()}] ${c.label} — ${c.note}`)
    .join("\n");

  return `You are a senior procurement compliance officer reviewing a GeM (Government e-Marketplace) bid.

BIDDER PROFILE
--------------
Company  : ${bidder.name}
GSTIN    : ${bidder.gstin}
PAN      : ${bidder.pan}
Udyam    : ${bidder.udyam}
Tender   : ${bidder.tenderName} (${bidder.tenderId})
Score    : ${bidder.score}/100
Risk     : ${bidder.risk.toUpperCase()}
Hard Gate: ${bidder.hardGated ? "YES — DEBARRED" : "No"}

COMPLIANCE CHECKS (10 total)
-----------------------------
${checkLines}

TASK
----
Write a concise 2–3 paragraph procurement recommendation for this bidder.
Paragraph 1: Summarise the compliance picture (highlight critical pass/fail points).
Paragraph 2: Call out any specific risks or concerns the procurement committee should note.
Paragraph 3: State a clear recommendation: APPROVE, FLAG FOR REVIEW, or REJECT — and give one-line justification.
Do not include headers. Use plain text only. Be direct and professional.`;
}

// ─── Rule-based fallback ─────────────────────────────────────────────────────

function buildFallbackRecommendation(bidder, checks) {
  const failChecks    = checks.filter(c => c.state === "fail");
  const warnChecks    = checks.filter(c => c.state === "warn");
  const missingChecks = checks.filter(c => c.state === "missing");

  if (bidder.hardGated || failChecks.some(c => c.label === "Blacklisting / debarment")) {
    return `${bidder.name} has triggered a hard-gate condition due to an active debarment or blacklisting entry on the CVC/GeM registry. This is a disqualifying criterion and no further processing of this bid is permissible under GeM procurement rules.

The following checks also returned critical failures: ${failChecks.map(c => c.label).join("; ") || "blacklisting (see above)"}. The combined compliance score of ${bidder.score}/100 reflects severe statutory non-compliance across multiple parameters.

RECOMMENDATION: REJECT — Hard gate triggered by CVC debarment order. Bid must be auto-rejected with escalation to the GeM grievance cell. No exceptions applicable.`;
  }

  if (bidder.score >= 75) {
    return `${bidder.name} has demonstrated strong compliance across all statutory and tender-specific parameters. All live checks returned satisfactory results, and the overall compliance score of ${bidder.score}/100 places this bidder in the low-risk category.

${warnChecks.length > 0 ? `Minor advisory items were noted: ${warnChecks.map(c => c.label).join("; ")}. These do not constitute disqualifying conditions but should be monitored in subsequent tender cycles.` : "No advisory items or warnings were raised. The bidder's statutory filings, registrations, and eligibility documents are all in order."}

RECOMMENDATION: APPROVE — Bidder meets all mandatory compliance thresholds. Forward to procurement committee for final award decision.`;
  }

  if (bidder.score >= 50) {
    const concerns = [...warnChecks, ...missingChecks].map(c => c.label).join("; ");
    return `${bidder.name} presents a mixed compliance profile with a score of ${bidder.score}/100, classifying it as medium risk. While core statutory registrations (GST, PAN) are in order, several checks returned warnings or missing documents that require resolution before award.

Key concerns include: ${concerns || "minor documentation gaps"}. ${missingChecks.length > 0 ? `Missing documents must be submitted within 7 working days or the bid will be ineligible.` : "Existing warnings should be clarified with supporting documentation."} The procurement officer should verify rectification before proceeding.

RECOMMENDATION: FLAG FOR REVIEW — Bidder is conditionally eligible pending submission of outstanding documents and resolution of flagged items. Set a 7-day cure window.`;
  }

  const criticalFails = failChecks.map(c => c.label).join("; ") || "multiple parameters";
  return `${bidder.name} has failed to meet minimum compliance thresholds with a score of ${bidder.score}/100, placing it in the high-risk category. Critical failures were recorded across: ${criticalFails}. These failures indicate significant statutory non-compliance that cannot be remedied within a normal bid processing timeline.

Additional concerns include ${warnChecks.length} warning-level findings and ${missingChecks.length} missing documents. The overall compliance posture suggests systemic deficiencies in the bidder's regulatory standing rather than isolated procedural lapses.

RECOMMENDATION: REJECT — Bidder falls below the minimum compliance score and has critical check failures. Rejection should be communicated with a detailed non-compliance notice citing the specific statutory failures.`;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * @param {object} bidder  — Bidder DB row (with score, risk, hardGated populated)
 * @param {Array}  checks  — Check DB rows for this bidder
 * @returns {Promise<string>} recommendation text
 */
async function generateRecommendation(bidder, checks) {
  const prompt = buildPrompt(bidder, checks);

  try {
    const response = await axios.post(
      `${config.OLLAMA_BASE_URL}/api/generate`,
      {
        model:  config.OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,  // deterministic, professional tone
          num_predict: 400,
        },
      },
      { timeout: config.OLLAMA_TIMEOUT }
    );

    const text = (response.data?.response || "").trim();
    if (!text) throw new Error("Empty response from Ollama");
    return text;

  } catch (err) {
    console.warn(`[Ollama] Unreachable or error — using fallback. Reason: ${err.message}`);
    return buildFallbackRecommendation(bidder, checks);
  }
}

/**
 * Health-check: can we reach Ollama and is the model listed?
 * @returns {Promise<boolean>}
 */
async function isOllamaReady() {
  try {
    const res = await axios.get(`${config.OLLAMA_BASE_URL}/api/tags`, { timeout: 3000 });
    const models = res.data?.models || [];
    return models.some(m => m.name.startsWith(config.OLLAMA_MODEL.split(":")[0]));
  } catch {
    return false;
  }
}

module.exports = { generateRecommendation, isOllamaReady };
