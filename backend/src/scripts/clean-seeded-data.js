"use strict";
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  console.log("Cleaning all seeded data to completely raw state...");

  // 1. Delete all checks
  const deletedChecks = await prisma.check.deleteMany({});
  console.log(`✅ Deleted ${deletedChecks.count} pre-calculated checks.`);

  // 2. Set all bidders to null score, risk, recommendation, and pending_review
  const updatedBidders = await prisma.bidder.updateMany({
    data: {
      score: null,
      risk: null,
      recommendation: null,
      status: "pending_review"
    }
  });
  console.log(`✅ Reset ${updatedBidders.count} bidders to UNSCORED / PENDING.`);

  // 3. Delete AI and Verification audit logs so they don't show up as already done
  const deletedLogs = await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { action: { contains: "Verification run by" } },
        { action: { contains: "AI compliance recommendation generated" } },
        { action: { contains: "Officer decision:" } }
      ]
    }
  });
  console.log(`✅ Deleted ${deletedLogs.count} automated audit logs.`);

  console.log("Done! All bidders are now completely raw and require manual verification.");
}

run().catch(console.error).finally(() => prisma.$disconnect());
