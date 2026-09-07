/**
 * seed-documents.js — Populates realistic Indian tender documents for all bidders.
 * 
 * Ensures every seeded bidder across every tender has 6 to 9 realistic
 * uploaded document records in the database.
 */

"use strict";

require("../config");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function generateDocumentsForBidder(bidder, index) {
  const sanitize = (str) => (str || "").replace(/[^a-zA-Z0-9]/g, "_");
  const bidderClean = sanitize(bidder.name);
  const tenderClean = sanitize(bidder.tenderId);

  // Pool of realistic Indian procurement document definitions
  const docPool = [
    {
      type: "GST",
      fileName: `GST_Registration_Certificate_${bidder.gstin}.pdf`,
    },
    {
      type: "PAN",
      fileName: `PAN_Verification_Card_${bidder.pan}.pdf`,
    },
    {
      type: "UDYAM",
      fileName: `Udyam_MSME_Registration_${bidder.udyam}.pdf`,
    },
    {
      type: "ITR 2024-25",
      fileName: `ITR_Acknowledgment_AY2024-25_${bidder.pan}.pdf`,
    },
    {
      type: "Tender Eligibility",
      fileName: `Tender_Eligibility_Self_Declaration_${tenderClean}.pdf`,
    },
    {
      type: "CVC Non-Blacklisting",
      fileName: `CVC_Non_Debarment_Undertaking_${bidderClean}.pdf`,
    },
    {
      type: "Turnover Financial",
      fileName: `Audited_Financial_Turnover_Statement_FY24.pdf`,
    },
  ];

  // Conditional realistic documents based on bidder index
  if (index % 2 === 0) {
    docPool.push({
      type: "BIS",
      fileName: `BIS_Quality_Standard_Compliance_Certificate.pdf`,
    });
  }

  if (index % 3 === 0) {
    docPool.push({
      type: "OEM Authorization",
      fileName: `Manufacturer_OEM_Authorization_Letter_${tenderClean}.pdf`,
    });
  }

  if (index % 4 === 0) {
    docPool.push({
      type: "NSIC",
      fileName: `NSIC_Government_Purchase_Enlistment.pdf`,
    });
  }

  if (index % 5 === 0) {
    docPool.push({
      type: "Startup India",
      fileName: `DPIIT_Startup_India_Recognition_Certificate.pdf`,
    });
  }

  return docPool.map((doc) => ({
    bidderId: bidder.id,
    type: doc.type,
    fileName: doc.fileName,
    filePath: `/uploads/${bidder.id}/${doc.fileName}`,
    uploadedAt: bidder.createdAt || new Date(),
  }));
}

async function seedDocuments() {
  console.log("📄  Seeding realistic documents for all bidders …");

  const bidders = await prisma.bidder.findMany({
    select: {
      id: true,
      name: true,
      gstin: true,
      pan: true,
      udyam: true,
      tenderId: true,
      createdAt: true,
      _count: { select: { documents: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (bidders.length === 0) {
    console.log("⚠️  No bidders found in database. Run seed-bidders.js first.");
    return;
  }

  let totalDocsCreated = 0;
  let biddersProcessed = 0;

  for (let i = 0; i < bidders.length; i++) {
    const bidder = bidders[i];

    // If bidder already has documents, skip or add missing ones
    if (bidder._count.documents >= 5) {
      continue;
    }

    const docsToCreate = generateDocumentsForBidder(bidder, i);

    // Delete any incomplete documents for clean seed state
    await prisma.document.deleteMany({ where: { bidderId: bidder.id } });

    await prisma.document.createMany({
      data: docsToCreate,
    });

    totalDocsCreated += docsToCreate.length;
    biddersProcessed++;
  }

  console.log(`✅  Successfully seeded ${totalDocsCreated} documents across ${biddersProcessed} bidders!`);
}

if (require.main === module) {
  seedDocuments()
    .catch((err) => {
      console.error("❌  Document seed failed:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { seedDocuments, generateDocumentsForBidder };
