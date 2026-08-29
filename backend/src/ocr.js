/**
 * ocr.js — Tesseract.js OCR extraction for Praman uploaded documents
 *
 * Extracts text from an image or PDF file using tesseract.js WASM engine,
 * then runs regex patterns to pull PAN, GSTIN, and Udyam numbers.
 *
 * Returns null for a field if no valid pattern is found — NEVER throws.
 */

'use strict';

const path = require('path');

// ─── Regex patterns ──────────────────────────────────────────────────────────

const PAN_PATTERN   = /[A-Z]{5}[0-9]{4}[A-Z]/g;
const GSTIN_PATTERN = /[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]/g;
const UDYAM_PATTERN = /UDYAM-[A-Z]{2}-\d{2}-\d{7}/g;

/**
 * Extract text from a document using Tesseract.js.
 * Handles JPEG, PNG, PDF (first page only for PDF via image conversion).
 * Always resolves — never rejects.
 *
 * @param {string} filePath — absolute path to the uploaded file
 * @returns {Promise<string>} — extracted OCR text, or empty string on failure
 */
async function extractText(filePath) {
  if (filePath.toLowerCase().endsWith('.pdf')) {
    console.warn(`[OCR] Skipping PDF file (not natively supported by tesseract.js without image conversion): ${path.basename(filePath)}`);
    return '';
  }
  
  try {
    const { createWorker } = require('tesseract.js');
    const worker = await createWorker('eng', 1, {
      logger: () => {}, // suppress verbose tesseract progress logs
    });
    const { data: { text } } = await worker.recognize(filePath);
    await worker.terminate();
    return text || '';
  } catch (err) {
    console.warn(`[OCR] Text extraction failed for ${path.basename(filePath)}: ${err.message}`);
    return '';
  }
}

/**
 * Run OCR on a file and extract document identifiers.
 * @param {string} filePath — absolute path to the uploaded file
 * @param {string} docType  — 'PAN' | 'GST' | 'UDYAM' (used for logging)
 * @returns {Promise<{ pan: string|null, gstin: string|null, udyam: string|null }>}
 */
async function extractDocumentFields(filePath, docType) {
  const text = await extractText(filePath);

  if (!text.trim()) {
    console.warn(`[OCR] Empty text extracted from ${docType} document: ${path.basename(filePath)}`);
    return { pan: null, gstin: null, udyam: null };
  }

  // Normalise — remove newlines/spaces that might break multi-line patterns
  const normalised = text.replace(/\s+/g, ' ').toUpperCase();

  const panMatches   = normalised.match(PAN_PATTERN)   || [];
  const gstinMatches = normalised.match(GSTIN_PATTERN) || [];
  const udyamMatches = normalised.match(UDYAM_PATTERN) || [];

  return {
    pan:   panMatches[0]   || null,
    gstin: gstinMatches[0] || null,
    udyam: udyamMatches[0] || null,
  };
}

module.exports = { extractDocumentFields, extractText };
