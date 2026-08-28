/**
 * validators.js — Pure document validators for Praman
 *
 * All functions are synchronous pure functions — no DB access, no I/O.
 * Each returns { valid: boolean, reason: string }.
 */

'use strict';

// ─── PAN ─────────────────────────────────────────────────────────────────────
// Format: [A-Z]{5}[0-9]{4}[A-Z]
// 4th character (index 3, 0-based) must be a valid entity-type letter.
//
// Entity type codes:
//   C = Company, P = Person/Individual, H = Hindu Undivided Family,
//   F = Firm, A = Association of Persons, T = Trust,
//   B = Body of Individuals, L = Local Authority,
//   J = Artificial Juridical Person, G = Government

const PAN_REGEX        = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const PAN_ENTITY_CHARS = new Set(['C','P','H','F','A','T','B','L','J','G']);

/**
 * Validates a PAN number structurally.
 * @param {string} pan
 * @returns {{ valid: boolean, reason: string }}
 */
function validatePAN(pan) {
  if (!pan || typeof pan !== 'string') {
    return { valid: false, reason: 'PAN is required.' };
  }
  const upper = pan.toUpperCase().trim();
  if (!PAN_REGEX.test(upper)) {
    return { valid: false, reason: 'PAN ' + pan + ' does not match the required format XXXXX0000X (5 letters, 4 digits, 1 letter).' };
  }
  const entityChar = upper[3];
  if (!PAN_ENTITY_CHARS.has(entityChar)) {
    return {
      valid:  false,
      reason: 'PAN ' + pan + ' has an invalid entity-type character \'' + entityChar + '\' at position 4.' +
              ' Valid entity codes are: ' + [...PAN_ENTITY_CHARS].join(', ') + '.',
    };
  }
  return { valid: true, reason: 'PAN ' + upper + ' is structurally valid (entity type: \'' + entityChar + '\').' };
}

// ─── GSTIN ───────────────────────────────────────────────────────────────────
// Format: [0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]
// State codes 01-38 are valid (38 = Ladakh, added 2020).
// 15th character is a checksum using the official GSTIN algorithm.

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const VALID_STATE_CODES = new Set([
  '01','02','03','04','05','06','07','08','09','10',
  '11','12','13','14','15','16','17','18','19','20',
  '21','22','23','24','25','26','27','28','29','30',
  '31','32','33','34','35','36','37','38',
]);

/**
 * Compute the GSTIN checksum digit using the official Indian GSTIN algorithm.
 * Maps each character to a position in the CHARSET (0-9, A-Z = 36 values).
 * Applies alternating factor 1/2, sums digit-by-digit in base-36, then
 * derives the check digit as (36 - sum%36) % 36.
 *
 * @param {string} gstin15 — full 15-char GSTIN (last char is the checksum to verify)
 * @returns {string} — expected checksum character
 */
function computeGSTINChecksum(gstin15) {
  const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const code    = CHARSET.indexOf(gstin15[i]);
    const factor  = (i % 2 === 0) ? 1 : 2;
    const product = code * factor;
    sum += Math.floor(product / 36) + (product % 36);
  }
  const checkIndex = (36 - (sum % 36)) % 36;
  return CHARSET[checkIndex];
}

/**
 * Validates a GSTIN.
 * @param {string} gstin
 * @returns {{ valid: boolean, reason: string }}
 */
function validateGSTIN(gstin) {
  if (!gstin || typeof gstin !== 'string') {
    return { valid: false, reason: 'GSTIN is required.' };
  }
  const upper = gstin.toUpperCase().trim();
  if (upper.length !== 15) {
    return { valid: false, reason: 'GSTIN must be exactly 15 characters; got ' + upper.length + '.' };
  }
  if (!GSTIN_REGEX.test(upper)) {
    return { valid: false, reason: 'GSTIN ' + gstin + ' does not match the required structural format (2 digits + 10-char PAN + 1 entity + Z + checksum).' };
  }
  const stateCode = upper.substring(0, 2);
  if (!VALID_STATE_CODES.has(stateCode)) {
    return { valid: false, reason: 'GSTIN state code ' + stateCode + ' is not a valid Indian state/UT code (01-38).' };
  }
  const expectedCheck = computeGSTINChecksum(upper);
  const actualCheck   = upper[14];
  if (actualCheck !== expectedCheck) {
    return {
      valid:  false,
      reason: 'GSTIN checksum digit \'' + actualCheck + '\' is invalid (expected \'' + expectedCheck + '\'). The GSTIN may be incorrect or fabricated.',
    };
  }
  return { valid: true, reason: 'GSTIN ' + upper + ' passes structural and checksum validation (state: ' + stateCode + ').' };
}

// ─── Udyam ───────────────────────────────────────────────────────────────────
// Format: UDYAM-XX-00-0000000
// XX = 2-letter state abbreviation  |  00 = 2-digit district  |  0000000 = 7-digit serial

const UDYAM_REGEX = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;

/**
 * Validates a Udyam registration number.
 * @param {string} udyam
 * @returns {{ valid: boolean, reason: string }}
 */
function validateUdyam(udyam) {
  if (!udyam || typeof udyam !== 'string') {
    return { valid: false, reason: 'Udyam registration number is required.' };
  }
  const upper = udyam.toUpperCase().trim();
  if (!UDYAM_REGEX.test(upper)) {
    return {
      valid:  false,
      reason: 'Udyam number ' + udyam + ' does not match the required format UDYAM-XX-00-0000000 (e.g. UDYAM-MH-07-0012345).',
    };
  }
  return { valid: true, reason: 'Udyam registration number ' + upper + ' is structurally valid.' };
}

module.exports = { validatePAN, validateGSTIN, validateUdyam };
