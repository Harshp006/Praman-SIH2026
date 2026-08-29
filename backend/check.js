const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.bidder.count();
  console.log('BIDDERS COUNT:', count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
