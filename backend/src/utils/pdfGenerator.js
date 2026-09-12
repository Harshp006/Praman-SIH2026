/**
 * pdfGenerator.js — Generates clean, professional PDF documents for PRAMAN compliance system.
 */

"use strict";

const PDFDocument = require("pdfkit");

function buildDemoPDF(docStream, docRecord, bidder) {
  const doc = new PDFDocument({ margin: 40, size: "A4", bufferPages: true });
  doc.pipe(docStream);

  const NAVY = "#173A5C";
  const GOLD = "#D4A017";
  const DARK = "#1A1F27";
  const MUTED = "#5B6572";
  const LIGHT_BG = "#F8F9FA";

  // Top header bar
  doc.rect(0, 0, doc.page.width, 65).fill(NAVY);
  doc.fill("white").font("Helvetica-Bold").fontSize(18)
     .text("PRAMAN", 40, 16, { continued: true })
     .fill(GOLD).text("  |  OFFICIAL COMPLIANCE DOCUMENT", { baseline: "top" });
  doc.fill("#CBD5E1").font("Helvetica").fontSize(8)
     .text("Government e-Marketplace (GeM) Verification Portal — Official Record", 40, 42);

  // Gold accent rule
  doc.rect(0, 65, doc.page.width, 4).fill(GOLD);

  let y = 85;

  // Title Box
  const docTypeStr = docRecord.type || "Document";
  const titleText = docTypeStr.toUpperCase().includes("CERTIFICATE") ||
                    docTypeStr.toUpperCase().includes("UNDERTAKING") ||
                    docTypeStr.toUpperCase().includes("DECLARATION") ||
                    docTypeStr.toUpperCase().includes("CARD") ||
                    docTypeStr.toUpperCase().includes("LETTER")
                    ? docTypeStr.toUpperCase()
                    : `${docTypeStr.toUpperCase()} CERTIFICATE`;

  doc.rect(40, y, doc.page.width - 80, 32).fill(LIGHT_BG).stroke(NAVY);
  doc.fill(NAVY).font("Helvetica-Bold").fontSize(13)
     .text(titleText, 50, y + 9, { characterSpacing: 0.5 });
  y += 45;

  // Bidder Metadata Table
  doc.rect(40, y, doc.page.width - 80, 110).stroke("#DCE4EC");
  doc.rect(40, y, doc.page.width - 80, 20).fill(NAVY);
  doc.fill("white").font("Helvetica-Bold").fontSize(9)
     .text("DOCUMENT & BIDDER METADATA", 48, y + 5);
  y += 26;

  const metadata = [
    ["Bidder Name", bidder?.name || "N/A"],
    ["GSTIN", bidder?.gstin || "N/A"],
    ["PAN", bidder?.pan || "N/A"],
    ["Udyam Reg. No.", bidder?.udyam || "N/A"],
    ["Tender Ref. ID", bidder?.tenderId || "N/A"],
    ["Document Type", docRecord.type || "Official Compliance Document"],
    ["File Name", docRecord.fileName || "Document.pdf"],
    ["Verification Status", "VERIFIED & ARCHIVED"],
  ];

  for (let i = 0; i < metadata.length; i += 2) {
    const [l1, v1] = metadata[i];
    const [l2, v2] = metadata[i + 1] || [];

    doc.fill(MUTED).font("Helvetica-Bold").fontSize(8).text(l1.toUpperCase(), 50, y);
    doc.fill(DARK).font("Helvetica").fontSize(8.5).text(v1, 140, y, { width: 140 });

    if (l2) {
      doc.fill(MUTED).font("Helvetica-Bold").fontSize(8).text(l2.toUpperCase(), 300, y);
      doc.fill(DARK).font("Helvetica").fontSize(8.5).text(v2, 400, y, { width: 140 });
    }
    y += 18;
  }

  y += 20;

  // Document Content Section
  doc.rect(40, y, doc.page.width - 80, 20).fill(NAVY);
  doc.fill("white").font("Helvetica-Bold").fontSize(9)
     .text("COMPLIANCE VERIFICATION & STATEMENT", 48, y + 5);
  y += 26;

  // Custom text per document type
  let statementText = "";
  const typeLower = (docRecord.type || "").toLowerCase();

  if (typeLower.includes("gst")) {
    statementText =
      `This document certifies that ${bidder?.name || "the bidder"} holds a valid and active Goods and Services Tax Identification ` +
      `Number (${bidder?.gstin || "N/A"}). All statutory GSTR-1 and GSTR-3B filings are verified as up to date on the Goods and Services Tax Network (GSTN) portal. ` +
      `No pending tax arrears or suspension notices are recorded for the current assessment period.`;
  } else if (typeLower.includes("pan")) {
    statementText =
      `Official Verification Certificate for Permanent Account Number (${bidder?.pan || "N/A"}) issued by the Income Tax Department, Government of India. ` +
      `The PAN is linked with Aadhaar/corporate filing records for ${bidder?.name || "the bidder"}. Entity status is confirmed as ACTIVE and in good standing.`;
  } else if (typeLower.includes("udyam") || typeLower.includes("msme")) {
    statementText =
      `Udyam Registration Certificate (${bidder?.udyam || "N/A"}) issued by the Ministry of Micro, Small and Medium Enterprises. ` +
      `${bidder?.name || "The bidder"} is duly classified under MSME Enterprise regulations, qualifying for statutory procurement benefits and exemptions under Public Procurement Policy for MSEs.`;
  } else if (typeLower.includes("itr") || typeLower.includes("tax")) {
    statementText =
      `Income Tax Return (ITR) Acknowledgment Statement for Assessment Year 2024-25. ` +
      `The financial disclosures and gross audited turnover for ${bidder?.name || "the bidder"} have been filed with the Income Tax Department and satisfy statutory financial threshold requirements.`;
  } else if (typeLower.includes("eligibility") || typeLower.includes("tender")) {
    statementText =
      `Self-Declaration Certificate of Tender Specific Eligibility for Tender Reference ${bidder?.tenderId || "N/A"}. ` +
      `${bidder?.name || "The bidder"} hereby confirms full compliance with all technical, financial, and operational criteria specified in the GeM Tender Document.`;
  } else if (typeLower.includes("cvc") || typeLower.includes("blacklisting")) {
    statementText =
      `Non-Debarment & Non-Blacklisting Undertaking. ` +
      `It is officially recorded that ${bidder?.name || "the bidder"} has NOT been blacklisted, debarred, or suspended by Central Vigilance Commission (CVC), GeM, or any Union/State Ministry or PSU.`;
  } else if (typeLower.includes("bis")) {
    statementText =
      `Bureau of Indian Standards (BIS) Quality Standard Compliance Certificate. ` +
      `Products manufactured or supplied by ${bidder?.name || "the bidder"} conform strictly to designated IS/ISO quality and technical benchmarks for public procurement.`;
  } else if (typeLower.includes("oem")) {
    statementText =
      `Original Equipment Manufacturer (OEM) Authorization Letter for Tender Ref ${bidder?.tenderId || "N/A"}. ` +
      `${bidder?.name || "The bidder"} is officially authorized to quote, supply, install, and service OEM equipment under manufacturer warranty.`;
  } else if (typeLower.includes("nsic")) {
    statementText =
      `National Small Industries Corporation (NSIC) Government Purchase Enlistment Certificate. ` +
      `${bidder?.name || "The bidder"} is registered under Single Point Registration Scheme (SPRS) for participation in government tenders with fee waivers and EMD exemptions.`;
  } else if (typeLower.includes("startup")) {
    statementText =
      `DPIIT Startup India Recognition Certificate. ` +
      `${bidder?.name || "The bidder"} is recognized by the Department for Promotion of Industry and Internal Trade (DPIIT) as an eligible Startup entity, entitled to tender relaxation criteria.`;
  } else {
    statementText =
      `Official Compliance Document submitted by ${bidder?.name || "the bidder"} for Tender Reference ${bidder?.tenderId || "N/A"}. ` +
      `This document has been parsed and archived in the PRAMAN e-Governance Verification Repository.`;
  }

  doc.fill(DARK).font("Helvetica").fontSize(9.5)
     .text(statementText, 45, y, { width: doc.page.width - 90, align: "justify", lineGap: 3 });

  y += doc.heightOfString(statementText, { width: doc.page.width - 90 }) + 30;

  // Verification Seal Box
  doc.rect(40, y, doc.page.width - 80, 60).fill("#F0FFF4").stroke("#1E7A34");
  doc.fill("#1E7A34").font("Helvetica-Bold").fontSize(10)
     .text("✓ DIGITALLY VERIFIED & SEALED — PRAMAN SYSTEM", 50, y + 12);
  doc.fill(MUTED).font("Helvetica").fontSize(8)
     .text(`Audit Signature: SHA256-PRAMAN-${(docRecord.id || "000").slice(-8)}\nTimestamp: ${new Date(docRecord.uploadedAt || Date.now()).toUTCString()}`, 50, y + 28);

  // Footer on bottom page
  doc.rect(0, doc.page.height - 30, doc.page.width, 30).fill(NAVY);
  doc.fill(GOLD).font("Helvetica-Bold").fontSize(8)
     .text("PRAMAN — Government e-Marketplace (GeM) Compliance System", 40, doc.page.height - 20);
  doc.fill("white").font("Helvetica").fontSize(7)
     .text("CONFIDENTIAL | OFFICIAL TENDER COMPLIANCE RECORD", doc.page.width - 250, doc.page.height - 20);

  doc.end();
}

module.exports = { buildDemoPDF };
