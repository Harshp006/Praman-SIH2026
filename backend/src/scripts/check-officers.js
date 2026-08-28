const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const officers = await p.officer.findMany({ select: { id: true, email: true, name: true } });
  console.log('OFFICERS:', JSON.stringify(officers, null, 2));
}
run().catch(console.error).finally(() => p.$disconnect());
