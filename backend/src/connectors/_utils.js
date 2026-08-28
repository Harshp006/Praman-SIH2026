/**
 * Shared utility for all connectors
 */
"use strict";

/** Simulate portal network latency */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/** Randomised delay within a realistic range */
const portalDelay = () => delay(200 + Math.random() * 600);

/**
 * Simple deterministic integer from a string (djb2 hash, unsigned).
 * Used to make connector outcomes stable for the same bidder across restarts.
 */
function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0; // force unsigned 32-bit
  }
  return h;
}

module.exports = { delay, portalDelay, hashString };
