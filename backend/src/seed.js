/**
 * seed.js — Praman Data Layer seed script
 * Idempotent: deletes all rows before re-inserting.
 * Run with: node src/seed.js  (DATABASE_URL must be set)
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// ─── Check definitions ──────────────────────────────────────────────────────
const CHECK_DEFS = [
  { label: "GST registration & return filing",       category: "statutory",        live: true,  weight: 20 },
  { label: "PAN & Income Tax compliance",            category: "statutory",        live: true,  weight: 15 },
  { label: "Udyam / MSME registration",             category: "statutory",        live: true,  weight: 10 },
  { label: "Make in India / local content",         category: "tender_specific",  live: false, weight: 10 },
  { label: "EPFO / ESIC compliance",               category: "statutory",        live: false, weight: 10 },
  { label: "Startup India / NSIC / OEM authorization", category: "tender_specific", live: false, weight: 5  },
  { label: "DigiLocker document verification",      category: "statutory",        live: false, weight: 10 },
  { label: "Blacklisting / debarment",              category: "statutory",        live: false, weight: 15 },
  { label: "MCA21 company status",                 category: "statutory",        live: false, weight: 10 },
  { label: "Tender-specific eligibility clause",   category: "tender_specific",  live: true,  weight: 15 },
];

// ─── Bidder profiles ────────────────────────────────────────────────────────
const BIDDERS = [
  // ① All checks pass — high score, low risk
  {
    name:       "Bharat Digital Solutions Pvt. Ltd.",
    gstin:      "27AABCB1234F1Z5",
    pan:        "AABCB1234F",
    udyam:      "UDYAM-MH-07-0012345",
    tenderId:   "GEM/2025/B/4521001",
    tenderName: "Supply of IT Hardware & Peripherals",
    score:      92,
    risk:       "low",
    status:     "approved",
    hardGated:  false,
    recommendation: "Recommend approval. All statutory and tender-specific checks cleared.",
    checks: [
      { state: "pass",  note: "GST registration active; 8 quarters returns filed on time." },
      { state: "pass",  note: "PAN verified; ITR filed for last 3 AYs; no outstanding demand." },
      { state: "pass",  note: "Udyam certificate valid; micro enterprise classification confirmed." },
      { state: "pass",  note: "BIS certification present; local content ≥ 50% declared." },
      { state: "pass",  note: "EPFO & ESIC registrations active; challan deposits current." },
      { state: "pass",  note: "NSIC registration active; category matches tender scope." },
      { state: "pass",  note: "All 3 documents verified on DigiLocker — authentic." },
      { state: "pass",  note: "No blacklisting entry found on CVC / GeM portal." },
      { state: "pass",  note: "MCA21: company status ACTIVE; no strike-off proceedings." },
      { state: "pass",  note: "Minimum 3 years experience criterion satisfied." },
    ],
  },

  // ② All checks pass — second clean bidder
  {
    name:       "Sunrise Infrastructure & Tech Ltd.",
    gstin:      "06AADCS5678G1Z3",
    pan:        "AADCS5678G",
    udyam:      "UDYAM-HR-03-0054321",
    tenderId:   "GEM/2025/B/4521002",
    tenderName: "Facility Management Services — Zone B",
    score:      88,
    risk:       "low",
    status:     "approved",
    hardGated:  false,
    recommendation: "Recommend approval. Strong compliance record across all parameters.",
    checks: [
      { state: "pass",  note: "GST active since 2018; returns filed without late fees." },
      { state: "pass",  note: "PAN confirmed; advance tax paid; no scrutiny pending." },
      { state: "pass",  note: "Udyam certificate updated post-UAM migration." },
      { state: "pass",  note: "Swadeshi certification submitted; local content 62%." },
      { state: "pass",  note: "EPFO UAN seeded; contributions up to date." },
      { state: "pass",  note: "No Startup India benefit claimed; OEM authorisation letter present." },
      { state: "pass",  note: "DigiLocker verification successful for GST, PAN, Udyam." },
      { state: "pass",  note: "No debarment record; clear on GeM blacklist registry." },
      { state: "pass",  note: "MCA21 ACTIVE; annual filings (MGT-7, AOC-4) up to date." },
      { state: "pass",  note: "Prior order experience of ₹2.1 Cr meets tender threshold." },
    ],
  },

  // ③ Realistic mix — warn/missing states
  {
    name:       "Kaveri Systems & Services Pvt. Ltd.",
    gstin:      "33AAHCK9012H1Z7",
    pan:        "AAHCK9012H",
    udyam:      "UDYAM-TN-11-0078901",
    tenderId:   "GEM/2025/B/4521003",
    tenderName: "Network Equipment Procurement — Q2",
    score:      61,
    risk:       "medium",
    status:     "under_review",
    hardGated:  false,
    recommendation: null,
    checks: [
      { state: "pass",    note: "GST registration valid; returns filed for last 4 quarters." },
      { state: "warn",    note: "ITR for AY 2023-24 filed late (penalty levied ₹5,000); no current default." },
      { state: "pass",    note: "Udyam certificate valid; small enterprise classification." },
      { state: "missing", note: "BIS/Make-in-India certificate not uploaded; cannot verify local content." },
      { state: "warn",    note: "EPFO challan for Feb 2025 pending; employer directed to rectify." },
      { state: "pass",    note: "NSIC certificate attached; scope partially overlaps tender." },
      { state: "warn",    note: "DigiLocker: PAN document fetch returned mismatch — re-verification needed." },
      { state: "pass",    note: "No blacklisting found on CVC portal." },
      { state: "pass",    note: "MCA21 ACTIVE." },
      { state: "warn",    note: "Experience certificate covers only ₹80 L; tender requires ₹1 Cr min." },
    ],
  },

  // ④ Realistic mix — another warn/missing bidder
  {
    name:       "Rajputana Infra Pvt. Ltd.",
    gstin:      "08AABCR3456K1Z1",
    pan:        "AABCR3456K",
    udyam:      "UDYAM-RJ-05-0034567",
    tenderId:   "GEM/2025/B/4521004",
    tenderName: "Solar Panel Installation — Phase II",
    score:      54,
    risk:       "medium",
    status:     "under_review",
    hardGated:  false,
    recommendation: null,
    checks: [
      { state: "warn",    note: "GST return for GSTR-3B Mar 2025 overdue; GSTIN suspended temporarily." },
      { state: "pass",    note: "PAN verified; ITR filed; income declared matches GST turnover." },
      { state: "missing", note: "Udyam certificate expired; renewal application submitted but not approved." },
      { state: "pass",    note: "Make in India: solar panel BIS IS 14286 certificate present." },
      { state: "missing", note: "EPFO registration not found; company claims contract labour exemption." },
      { state: "pass",    note: "Channel partner authorisation from OEM provided." },
      { state: "pass",    note: "DigiLocker documents verified." },
      { state: "pass",    note: "No blacklisting." },
      { state: "warn",    note: "MCA21: DIN of director flagged for non-filing of DIR-3 KYC." },
      { state: "warn",    note: "Completion certificate for previous solar order not attested." },
    ],
  },

  // ⑤ BLACKLISTED — hardGated: true
  {
    name:       "Patel Constructions & Logistics Co.",
    gstin:      "24AAACP7890L1Z9",
    pan:        "AAACP7890L",
    udyam:      "UDYAM-GJ-09-0011122",
    tenderId:   "GEM/2025/B/4521005",
    tenderName: "Civil Works & Structural Repair — Central Zone",
    score:      12,
    risk:       "high",
    status:     "rejected",
    hardGated:  true,
    recommendation: "REJECT — bidder is debarred by CVC order dated 14 Jan 2025. Hard gate triggered; no further processing.",
    checks: [
      { state: "warn",  note: "GST suspended due to mismatch; show-cause notice issued." },
      { state: "warn",  note: "IT demand of ₹18 L outstanding for AY 2022-23." },
      { state: "pass",  note: "Udyam registration valid." },
      { state: "na",    note: "Make in India not applicable for civil works category." },
      { state: "warn",  note: "ESIC contribution defaulted for 3 months." },
      { state: "na",    note: "OEM/Startup India not applicable." },
      { state: "fail",  note: "DigiLocker: Company registration certificate is forged (CIN mismatch)." },
      { state: "fail",  note: "CVC debarment order active — GeM blacklist entry confirmed. HARD GATE." },
      { state: "fail",  note: "MCA21: Company marked STRIKE-OFF by RoC on 02 Feb 2025." },
      { state: "fail",  note: "Bid document claims turnover of ₹12 Cr; MCA filings show ₹3.2 Cr." },
    ],
  },

  // ⑥ Borderline — several warns
  {
    name:       "Himachal Green Energy Tech LLP",
    gstin:      "02AAHFH4567M1Z4",
    pan:        "AAHFH4567M",
    udyam:      "UDYAM-HP-01-0067890",
    tenderId:   "GEM/2025/B/4521006",
    tenderName: "Wind Energy Monitoring Systems",
    score:      47,
    risk:       "medium",
    status:     "under_review",
    hardGated:  false,
    recommendation: null,
    checks: [
      { state: "pass",  note: "GST active; quarterly returns filed." },
      { state: "warn",  note: "PAN-Aadhaar linking of promoter pending; may affect future compliance." },
      { state: "warn",  note: "Udyam certificate: turnover reclassification pending; currently medium enterprise." },
      { state: "warn",  note: "Local content declaration form missing notarisation." },
      { state: "warn",  note: "EPFO: 2 employees' UAN not seeded; partial compliance." },
      { state: "pass",  note: "NSIC not applicable; direct OEM tie-up letter submitted." },
      { state: "warn",  note: "DigiLocker: one document (Udyam) not yet linked to registered GSTIN." },
      { state: "pass",  note: "No blacklisting found." },
      { state: "pass",  note: "MCA21 ACTIVE; LLP annual filings up to date." },
      { state: "warn",  note: "Eligibility: previous order value ₹55 L vs ₹75 L required; shortfall noted." },
    ],
  },
];

// ─── AuditLog templates ──────────────────────────────────────────────────────
function auditEntries(bidderId, hardGated, status, officerId) {
  const now   = new Date();
  const t1    = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
  const t2    = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
  const t3    = new Date(now.getTime() - 2 * 60 * 60 * 1000);       // 2 hours ago

  const entries = [
    {
      bidderId,
      officerId: null,   // system-generated — no officer FK
      actor:     "system",
      action:    "Automated compliance verification run initiated — all 10 checks queued.",
      timestamp: t1,
    },
    {
      bidderId,
      officerId: null,
      actor:     "system",
      action:    "Verification complete. Score computed and risk level assigned.",
      timestamp: t2,
    },
  ];

  if (hardGated) {
    entries.push({
      bidderId,
      officerId,   // real FK to Officer row
      actor:       "officer@praman.local",
      action:      "Hard gate triggered: CVC blacklisting confirmed. Bid auto-rejected. Case escalated to GeM grievance cell.",
      timestamp:   t3,
    });
  } else if (status === "approved") {
    entries.push({
      bidderId,
      officerId,
      actor:       "officer@praman.local",
      action:      "Officer review complete. Recommendation: APPROVE. Forwarded to procurement committee.",
      timestamp:   t3,
    });
  } else {
    entries.push({
      bidderId,
      officerId,
      actor:       "officer@praman.local",
      action:      "Officer flagged bid for additional document submission. Awaiting rectification within 7 days.",
      timestamp:   t3,
    });
  }

  return entries;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱  Praman seed starting …");

  // ── 1. Wipe in FK-safe order ──────────────────────────────────────────────
  console.log("   Clearing existing data …");
  await prisma.auditLog.deleteMany();
  await prisma.check.deleteMany();
  await prisma.document.deleteMany();
  await prisma.bidder.deleteMany();
  await prisma.officer.deleteMany();

  // ── 2. Officer ─────────────────────────────────────────────────────────────
  console.log("   Creating Officer …");
  const passwordHash = await bcrypt.hash("praman123", 12);
  const officer = await prisma.officer.create({
    data: {
      email:        "officer@praman.local",
      passwordHash,
      name:         "R. Nair",
    },
  });
  const officerId = officer.id;

  // ── 3. Bidders + Checks + Documents + AuditLogs ───────────────────────────
  for (const [idx, profile] of BIDDERS.entries()) {
    console.log(`   Seeding bidder ${idx + 1}/6: ${profile.name}`);

    const { checks: checkStates, ...bidderData } = profile;

    const bidder = await prisma.bidder.create({ data: bidderData });

    // Checks — 10 per bidder, merged with CHECK_DEFS
    for (let i = 0; i < CHECK_DEFS.length; i++) {
      const def   = CHECK_DEFS[i];
      const extra = checkStates[i];
      await prisma.check.create({
        data: {
          bidderId: bidder.id,
          label:    def.label,
          category: def.category,
          live:     def.live,
          weight:   def.weight,
          state:    extra.state,
          note:     extra.note,
        },
      });
    }

    // Documents — one per type for every bidder
    const docTypes = [
      { type: "GST",   fileName: `${bidder.id}_GST_certificate.pdf` },
      { type: "PAN",   fileName: `${bidder.id}_PAN_card.pdf` },
      { type: "UDYAM", fileName: `${bidder.id}_Udyam_certificate.pdf` },
    ];
    for (const doc of docTypes) {
      await prisma.document.create({
        data: { bidderId: bidder.id, ...doc },
      });
    }

    // AuditLogs
    const logs = auditEntries(bidder.id, bidder.hardGated, bidder.status, officerId);
    for (const log of logs) {
      await prisma.auditLog.create({ data: log });
    }
  }

  console.log("✅  Seed complete.");
  console.log("    Officers : 1");
  console.log("    Bidders  : 6");
  console.log("    Checks   : 60  (10 per bidder)");
  console.log("    Documents: 18  (3 per bidder)");
  console.log("    AuditLogs: 18  (3 per bidder)");
}

// Allow direct invocation: node src/seed.js
if (require.main === module) {
  main()
    .catch((err) => {
      console.error("❌  Seed failed:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { main, prisma };
