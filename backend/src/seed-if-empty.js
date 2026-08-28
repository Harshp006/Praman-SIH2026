/**
 * seed-if-empty.js — Startup seed entry point
 *
 * Delegates directly to seed.js which is already fully idempotent:
 *   - Only inserts the Officer if none exists (officer count guard)
 *   - Never wipes or alters existing bidder data
 *
 * Safe to call on every container restart.
 */

"use strict";

const { main: runSeed, prisma } = require("./seed");

main()
  .catch((err) => {
    console.error("❌  seed-if-empty failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

async function main() {
  await runSeed();
}

