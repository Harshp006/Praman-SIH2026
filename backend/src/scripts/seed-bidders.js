/**
 * seed-bidders.js — Seeds 300 realistic Indian company bidders into Praman DB.
 * Run with: node src/scripts/seed-bidders.js
 * Idempotent: skips if bidder count already > 10.
 */
"use strict";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ─── Realistic Indian company data pools ─────────────────────────────────────

const COMPANY_PREFIXES = [
  "Bharat","Hindustan","National","Indian","New India","Reliance","Tata","Infosys",
  "Wipro","Mahindra","Birla","Godrej","Bajaj","Larsen","Adani","Vedanta","JSW",
  "Aditya","Patanjali","Amul","ONGC","NTPC","SAIL","Coal India","HAL","BEL","BEML",
  "DRDO","ISRO","BHEL","Gail","IOC","BPCL","Bharat Forge","Tube Investments",
  "Bosch India","Siemens India","ABB India","Honeywell India","3M India","Schneider",
  "Siemens","Crompton","Havells","Voltas","Blue Star","Finolex","Polycab","Sterlite",
  "Techno","Infotech","Datacraft","Cyient","Persistent","Mphasis","Hexaware","KPIT",
  "Mastek","Zensar","Cognizant India","Accenture India","IBM India","HCL","Tech Mahindra",
  "Oracle India","SAP India","Microsoft India","Dell India","HP India","Lenovo India",
  "Cisco India","Intel India","Qualcomm India","Samsung India","LG India","Philips India",
  "Kirloskar","Forbes","Thermax","Greaves","Cummins India","Timken","SKF India",
  "Schaeffler India","Bharat Petroleum","Indian Oil","HPCL","MRPL","EIL","GAIL",
  "Power Grid","NHPC","SJVN","THDC","NVVN","Sterlite Power","Adani Green","Torrent Power",
  "CESC","Tata Power","JSW Energy","Renew Power","Greenko","Azure Power","Engie India",
];

const COMPANY_SUFFIXES = [
  "Ltd","Private Ltd","Pvt Ltd","Industries","Enterprises","Corporation","Systems",
  "Technologies","Solutions","Engineering","Manufacturing","Exports","Infra","Projects",
  "Constructions","Infrastructure","Energy","Power","Chemicals","Pharma","Healthcare",
  "Logistics","Consultancy","Services","International","Group","Holdings","Ventures",
];

const STATES = [
  { code: "07", name: "Delhi" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "33", name: "Tamil Nadu" },
  { code: "36", name: "Telangana" },
  { code: "06", name: "Haryana" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "03", name: "Punjab" },
  { code: "19", name: "West Bengal" },
  { code: "21", name: "Odisha" },
  { code: "32", name: "Kerala" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "20", name: "Jharkhand" },
  { code: "22", name: "Chhattisgarh" },
];

const TENDER_NAMES = [
  "Supply of IT Equipment and Peripherals",
  "Procurement of Office Furniture",
  "Civil Construction of Administrative Block",
  "Annual Maintenance Contract for HVAC Systems",
  "Supply and Installation of CCTV Surveillance",
  "Procurement of Medicines and Medical Supplies",
  "Road Development and Maintenance Contract",
  "Software Development for e-Governance Portal",
  "Supply of Power Transformers",
  "Security Services Contract",
  "Housekeeping and Sanitation Services",
  "Supply of Laboratory Equipment",
  "Catering Services for Canteen",
  "Printing and Stationery Supply",
  "Electrical Works and Maintenance",
  "Procurement of Vehicles",
  "Water Treatment Plant Installation",
  "Solar Power Plant Installation",
  "Supply of PPE Kits and Safety Equipment",
  "Consultancy Services for Project Management",
  "Supply of Steel Structures",
  "Manpower Supply Contract",
  "Data Center Setup and Maintenance",
  "Supply of Agricultural Equipment",
  "Procurement of Uniforms and Apparel",
];

// ─── Helper functions ─────────────────────────────────────────────────────────

function rng(seed) {
  // Simple deterministic pseudo-random from seed string
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pick(arr, seed) {
  return arr[rng(seed) % arr.length];
}

function generateCompanyName(i) {
  const prefix = COMPANY_PREFIXES[i % COMPANY_PREFIXES.length];
  const suffix = COMPANY_SUFFIXES[Math.floor(i / 3) % COMPANY_SUFFIXES.length];
  return `${prefix} ${suffix}`;
}

function generatePAN(i) {
  // PAN: AAAAA9999A — 5 letters, 4 digits, 1 letter
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const l1 = letters[(i * 7 + 1) % letters.length];
  const l2 = letters[(i * 13 + 2) % letters.length];
  const l3 = letters[(i * 17 + 3) % letters.length];
  const l4 = letters[(i * 19 + 4) % letters.length];
  const l5 = "P"; // P = company
  const num = String((i * 31 + 1000) % 9000 + 1000);
  const l6 = letters[(i * 11 + 5) % letters.length];
  return `${l1}${l2}${l3}${l4}${l5}${num}${l6}`;
}

function generateGSTIN(i, state) {
  const pan = generatePAN(i);
  const entityNum = String((i % 9) + 1);
  const checkChar = "Z";
  const gstin = `${state.code}${pan}${entityNum}${checkChar}`;
  // GSTIN must be exactly 15 chars: 2(state) + 10(pan) + 1(entity) + 1(check) = 14, add one more
  const num2 = String(i % 10);
  return `${state.code}${pan}${entityNum}${checkChar}${num2}`.substring(0, 15);
}

function generateUdyam(i) {
  const states = ["MH","DL","KA","TN","TS","UP","GJ","PB","WB","OR","KL","MP"];
  const stateCode = states[i % states.length];
  const num = String(i + 1000).padStart(7, "0");
  return `UDYAM-${stateCode}-0${num}`;
}

// We will use 25 distinct Tenders instead of generating a new one for each bidder
function getTenderId(index) {
  const year = 2025 + (index % 2);
  const num = String(index + 1000000);
  return `GEM/${year}/B/${num}`;
}

// Generate check results for a bidder with given "quality" (0–1)
function generateChecks(bidderId, quality) {
  const CHECK_DEFS = [
    { label: "GST registration & return filing",          category: "statutory",       live: true,  weight: 15 },
    { label: "PAN & Income Tax compliance",               category: "statutory",       live: true,  weight: 15 },
    { label: "Udyam / MSME registration",                category: "statutory",       live: true,  weight: 10 },
    { label: "Make in India / local content",             category: "tender_specific", live: false, weight: 10 },
    { label: "EPFO / ESIC compliance",                   category: "statutory",       live: false, weight: 10 },
    { label: "Startup India / NSIC / OEM authorization", category: "tender_specific", live: false, weight:  5 },
    { label: "DigiLocker document verification",          category: "statutory",       live: false, weight: 10 },
    { label: "Blacklisting / debarment",                  category: "statutory",       live: false, weight: 20 },
    { label: "MCA21 company status",                      category: "statutory",       live: false, weight: 10 },
    { label: "Tender-specific eligibility clause",        category: "tender_specific", live: true,  weight: 15 },
  ];

  const checks = [];
  for (let i = 0; i < CHECK_DEFS.length; i++) {
    const def = CHECK_DEFS[i];
    let state, note;

    // Blacklisting check: only fail for very low quality
    if (def.label === "Blacklisting / debarment") {
      if (quality < 0.15) {
        state = "fail";
        note = "Company found in CVC debarment registry. GeM blacklisting confirmed.";
      } else {
        state = "pass";
        note = "No records found in CVC, GeM, or MCA blacklisting databases.";
      }
    } else if (quality >= 0.80) {
      state = Math.random() > 0.15 ? "pass" : "warn";
      note = state === "pass"
        ? "Verification passed. All documents and portal data consistent."
        : "Minor discrepancy noted. Advisory flag — does not block compliance.";
    } else if (quality >= 0.50) {
      const r = Math.random();
      state = r > 0.55 ? "pass" : r > 0.25 ? "warn" : "fail";
      note = state === "pass" ? "Verification passed."
           : state === "warn" ? "Discrepancy detected. Manual review recommended."
           : "Verification failed. Data mismatch with portal records.";
    } else {
      const r = Math.random();
      state = r > 0.6 ? "fail" : r > 0.4 ? "warn" : "missing";
      note = state === "fail" ? "Critical compliance failure. Document invalid or missing."
           : state === "warn" ? "Partial compliance. Multiple warnings recorded."
           : "Required document not submitted. Verification incomplete.";
    }

    checks.push({ ...def, bidderId, state, note });
  }
  return checks;
}

function computeScore(checks) {
  let weighted = 0, totalWeight = 0;
  for (const c of checks) {
    if (c.state === "na" || c.state === "missing") continue;
    const pts = c.state === "pass" ? c.weight : c.state === "warn" ? c.weight * 0.5 : 0;
    weighted    += pts;
    totalWeight += c.weight;
  }
  const score = totalWeight === 0 ? 0 : Math.round((weighted / totalWeight) * 100);
  const risk  = score >= 80 ? "low" : score >= 50 ? "medium" : "high";
  return { score, risk };
}

function buildRecommendation(bidder, checks, score, risk) {
  const fails = checks.filter(c => c.state === "fail").map(c => c.label);
  const warns = checks.filter(c => c.state === "warn").map(c => c.label);
  if (score >= 80) {
    return `Score: ${score}/100 (${risk} risk). ${bidder.name} meets all mandatory compliance thresholds.` +
           (warns.length ? ` Minor advisories: ${warns.join("; ")}.` : " No warnings recorded.") +
           " Recommend APPROVE.";
  } else if (score >= 50) {
    return `Score: ${score}/100 (${risk} risk). ${bidder.name} presents a mixed compliance profile. ` +
           `Flagged: ${[...fails, ...warns].join("; ") || "none"}. ` +
           "Recommend FLAG FOR REVIEW.";
  }
  return `Score: ${score}/100 (${risk} risk). ${bidder.name} falls below minimum compliance thresholds. ` +
         `Failures: ${fails.join("; ") || "multiple"}. Recommend REJECT.`;
}

// ─── Main seeder ─────────────────────────────────────────────────────────────

async function seedBidders() {
  const existing = await prisma.bidder.count();
  if (existing > 10) {
    console.log(`[Seed] Skipping — ${existing} bidders already exist in the database.`);
    return;
  }

  // Get officer account
  const officer = await prisma.officer.findFirst();
  if (!officer) {
    console.error("[Seed] No officer found. Run the main seed.js first.");
    process.exit(1);
  }

  console.log(`[Seed] Seeding 25 Tenders...`);
  const tenders = [];
  for (let i = 0; i < TENDER_NAMES.length; i++) {
    const tenderId = getTenderId(i);
    const tender = await prisma.tender.upsert({
      where: { tenderId },
      update: {},
      create: {
        tenderId,
        name: TENDER_NAMES[i],
        description: `Procurement process for ${TENDER_NAMES[i]}`
      }
    });
    tenders.push(tender);
  }

  console.log(`[Seed] Seeding 300 realistic Indian bidders...`);

  const TOTAL = 300;

  // We are creating all bidders as 'pending_review' without scores or checks
  // so the officer can run verification manually.

  let created = 0;

  for (let i = 0; i < TOTAL; i++) {
    const state = STATES[i % STATES.length];
    const name = generateCompanyName(i);
    const pan = generatePAN(i);
    const gstin = generateGSTIN(i, state);
    const udyam = generateUdyam(i);
    
    // Assign bidder to one of the 25 tenders
    const tenderIndex = i % TENDER_NAMES.length;
    const tenderId = tenders[tenderIndex].tenderId;
    const tenderName = tenders[tenderIndex].name;
    const status = "pending_review";

    try {
      const bidder = await prisma.bidder.create({
        data: {
          name,
          pan,
          gstin,
          udyam,
          tenderId,
          tenderName,
          status: "pending_review",
          createdById: officer.id,
        },
      });

      // Audit log (Initial Registration Only)
      await prisma.auditLog.create({
        data: {
          bidderId:  bidder.id,
          officerId: officer.id,
          actor:     "System",
          action:    `Mock bidder registered via automated seeder. Awaiting verification.`,
        },
      });

      created++;
      if (created % 50 === 0) console.log(`[Seed] ${created}/${TOTAL} bidders created...`);
    } catch (err) {
      console.warn(`[Seed] Skipped bidder ${i} (${name}): ${err.message}`);
    }
  }

  console.log(`\n✅ Seeded ${created} bidders successfully!`);
}

seedBidders()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
