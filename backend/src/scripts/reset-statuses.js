/**
 * reset-statuses.js — Resets all seeded bidders back to pending_review
 * so officers make all approve/reject decisions themselves.
 */
"use strict";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  const updated = await prisma.bidder.updateMany({
    where: { status: { in: ["approved", "rejected"] } },
    data:  { status: "pending_review" },
  });
  // Also delete the auto-generated "approved/rejected" audit logs from seeding
  await prisma.auditLog.deleteMany({
    where: { action: { contains: "Officer decision:" } },
  });
  console.log(`✅ Reset ${updated.count} bidders to pending_review.`);
  console.log(`✅ Removed seeded decision audit logs.`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
