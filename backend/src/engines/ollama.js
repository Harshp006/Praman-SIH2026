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
Risk     : ${(bidder.risk || 'unknown').toUpperCase()}

COMPLIANCE CHECKS (${checks.length} total)
-----------------------------
${checkLines}

TASK
----
Write a deep, comprehensive 8-12 line summarization and explanation of this bidder's compliance profile.
Analyze the specific failed or warned checks in detail and explain the potential risks or implications of their current status.
CRITICAL INSTRUCTION: Extract the state code from the Udyam number (e.g., 'DL' in 'UDYAM-DL-...') and the state code from the GSTIN (the first two digits, e.g., '07'). Cross-check if they correspond to the same state. Explicitly flag in your summary if they do not match or seem inconsistent.
Based on your deep analysis, make it extremely clear whether the officer should ACCEPT, REJECT, or FLAG FOR REVIEW.
Close the summary with exactly this line on a new line at the very end: "AI RECOMMENDS - [APPROVE / FLAG FOR REVIEW / REJECT]". Do not add any text after this line.
Do not include headers. Use plain text only. Be professional and thorough.`;
}

// ─── Rule-based fallback ─────────────────────────────────────────────────────

function buildFallbackRecommendation(bidder, checks) {
  const failChecks    = checks.filter(c => c.state === "fail");
  const warnChecks    = checks.filter(c => c.state === "warn");
  const missingChecks = checks.filter(c => c.state === "missing");
  const score = bidder.score || 0;
  const risk  = bidder.risk  || "unknown";

  // Blacklisted — regardless of score the officer gets a clear REJECT recommendation
  if (failChecks.some(c => c.label === "Blacklisting / debarment")) {
    const otherFails = failChecks.filter(c => c.label !== "Blacklisting / debarment")
                                  .map(c => c.label).join("; ");
    return `Score: ${score}/100 (${risk} risk). ${bidder.name} is confirmed on the CVC/GeM blacklist registry ` +
           `— this is a disqualifying condition under GeM procurement rules.` +
           (otherFails ? ` Additional critical failures: ${otherFails}.` : "") +
           ` Recommend REJECT.`;
  }

  const flagged = [...failChecks, ...warnChecks, ...missingChecks].map(c => c.label).join("; ");

  if (score >= 80) {
    return `Score: ${score}/100 (${risk} risk). ${bidder.name} meets all mandatory compliance thresholds.` +
           (warnChecks.length
             ? ` Minor advisory items noted: ${warnChecks.map(c => c.label).join("; ")}.`
             : " No warnings or failures recorded.") +
           ` Recommend APPROVE.`;
  }

  if (score >= 50) {
    return `Score: ${score}/100 (${risk} risk). ${bidder.name} presents a mixed compliance profile. ` +
           `Flagged checks: ${flagged || "none"}. ` +
           `Outstanding documentation or warnings must be resolved before award. ` +
           `Recommend FLAG FOR REVIEW.`;
  }

  return `Score: ${score}/100 (${risk} risk). ${bidder.name} falls below minimum compliance thresholds. ` +
         `Flagged: ${flagged || "multiple parameters"}. Recommend REJECT.`;
}


/**
 * Resolves an active Ollama base URL by testing candidates:
 * 1. config.OLLAMA_BASE_URL
 * 2. http://localhost:11434
 * 3. http://127.0.0.1:11434
 * 4. http://host.docker.internal:11434
 */
async function resolveOllamaBaseUrl() {
  const candidates = [
    config.OLLAMA_BASE_URL,
    "http://localhost:11434",
    "http://127.0.0.1:11434",
    "http://host.docker.internal:11434",
  ];
  const uniqueUrls = [...new Set(candidates.filter(Boolean))];

  for (const url of uniqueUrls) {
    try {
      const res = await axios.get(`${url}/api/tags`, { timeout: 2500 });
      if (res.status === 200 && Array.isArray(res.data?.models)) {
        return url;
      }
    } catch (_e) {
      // try next candidate
    }
  }
  return config.OLLAMA_BASE_URL || "http://localhost:11434";
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * @param {object} bidder  — Bidder DB row (with score, risk populated)
 * @param {Array}  checks  — Check DB rows for this bidder
 * @returns {Promise<string>} recommendation text
 */
async function generateRecommendation(bidder, checks) {
  const prompt = buildPrompt(bidder, checks);
  const baseUrl = await resolveOllamaBaseUrl();

  console.log("\n=======================================================");
  console.log(`🧠 [Ollama AI] INITIATING COMPLIANCE ANALYSIS`);
  console.log(`👤 Target: ${bidder.name} | Score: ${bidder.score}/100`);
  console.log(`🌐 Ollama Endpoint: ${baseUrl}`);
  console.log("=======================================================");
  console.log(`[PROMPT SENT TO LOCAL LLM (${config.OLLAMA_MODEL})]:\n`);
  console.log(prompt);
  console.log("\n=======================================================");
  console.log("⏳ Awaiting response from local neural network...");

  try {
    const startTime = Date.now();
    const response = await axios.post(
      `${baseUrl}/api/generate`,
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
    
    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ [Ollama AI] RESPONSE RECEIVED in ${timeTaken}s`);
    console.log("=======================================================");
    console.log(text);
    console.log("=======================================================\n");

    return text;

  } catch (err) {
    console.warn(`\n⚠️ [Ollama AI] Unreachable or error — using fallback. Reason: ${err.message}`);
    return buildFallbackRecommendation(bidder, checks);
  }
}

/**
 * Health-check: can we reach Ollama and is the model listed?
 * @returns {Promise<boolean>}
 */
async function isOllamaReady() {
  try {
    const baseUrl = await resolveOllamaBaseUrl();
    const res = await axios.get(`${baseUrl}/api/tags`, { timeout: 3000 });
    const models = res.data?.models || [];
    const modelPrefix = config.OLLAMA_MODEL.split(":")[0];
    return models.some(m => m.name === config.OLLAMA_MODEL || m.name.startsWith(modelPrefix) || m.model === config.OLLAMA_MODEL);
  } catch {
    return false;
  }
}

module.exports = { generateRecommendation, isOllamaReady };
