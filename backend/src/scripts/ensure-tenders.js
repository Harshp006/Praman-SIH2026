const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Checking for database foreign key compatibility...");
  try {
    // 1. Check if both tables exist in the public schema
    const bidderTableExistsResult = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE  table_schema = 'public'
        AND    table_name   = 'Bidder'
      );
    `;
    const tenderTableExistsResult = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE  table_schema = 'public'
        AND    table_name   = 'Tender'
      );
    `;

    const bidderExists = bidderTableExistsResult[0]?.exists;
    const tenderExists = tenderTableExistsResult[0]?.exists;

    if (!bidderExists || !tenderExists) {
      console.log(`ℹ️ Bidder exists: ${bidderExists}, Tender exists: ${tenderExists}. Skipping pre-verification.`);
      return;
    }

    // 2. Query unique tenderIds from Bidder table
    const bidders = await prisma.$queryRaw`
      SELECT DISTINCT "tenderId", "tenderName" FROM "Bidder";
    `;

    console.log(`Found ${bidders.length} unique tenders referenced in Bidder table.`);

    for (const b of bidders) {
      if (!b.tenderId) continue;
      
      // Check if tender already exists in Tender table
      const existing = await prisma.$queryRaw`
        SELECT id FROM "Tender" WHERE "tenderId" = ${b.tenderId};
      `;

      if (existing.length === 0) {
        const id = "c" + Math.random().toString(36).substring(2, 15);
        const name = b.tenderName || `Tender ${b.tenderId}`;
        const desc = `Automatically created for compatibility`;
        
        await prisma.$executeRaw`
          INSERT INTO "Tender" ("id", "tenderId", "name", "description")
          VALUES (${id}, ${b.tenderId}, ${name}, ${desc});
        `;
        
        console.log(`Created missing Tender record: ${b.tenderId} (${name})`);
      }
    }
    console.log("✅ Tenders pre-verification complete.");
  } catch (err) {
    console.log("ℹ️ Skipping pre-verification: ", err.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
