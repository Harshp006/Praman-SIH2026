/**
 * seed-if-empty.js — Conditional seed guard
 *
 * Runs the full seed ONLY when the database is empty (bidder count === 0).
 * Safe to call on every container start; won't wipe live officer decisions.
 *
 * To force a full re-seed (e.g., before a final demo):
 *   docker compose exec backend node src/seed.js
 */

const { main: runSeed, prisma } = require("./seed");

async function main() {
  const bidderCount = await prisma.bidder.count();

  if (bidderCount > 0) {
    console.log(
      `⏭️  Database already seeded (${bidderCount} bidder${bidderCount !== 1 ? "s" : ""} found). Skipping seed.`
    );
    return;
  }

  console.log("📭  Database is empty — running full seed …");
  await runSeed();
}

main()
  .catch((err) => {
    console.error("❌  seed-if-empty failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
