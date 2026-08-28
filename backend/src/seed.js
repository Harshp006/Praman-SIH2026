/**
 * seed.js — Praman minimal seed script
 *
 * Seeds ONLY the Officer account. Safe to run on every container restart.
 * Never wipes or duplicates existing data — guards with officer count check.
 *
 * Usage:
 *   node src/seed.js                  (called by docker-compose on startup)
 *   docker compose exec backend node src/seed.js   (manual re-run)
 */

"use strict";

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱  Praman seed — officer-only …");

  const officerCount = await prisma.officer.count();

  if (officerCount > 0) {
    console.log(`⏭️  Officer already exists (${officerCount} found). Skipping seed.`);
    return;
  }

  console.log("   Creating Officer: officer@praman.local (R. Nair) …");
  const passwordHash = await bcrypt.hash("praman123", 12);

  await prisma.officer.create({
    data: {
      email:        "officer@praman.local",
      passwordHash,
      name:         "R. Nair",
    },
  });

  console.log("✅  Seed complete.");
  console.log("    Officers : 1");
  console.log("    Bidders  : 0  (empty — officers add bidders via the UI)");
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
