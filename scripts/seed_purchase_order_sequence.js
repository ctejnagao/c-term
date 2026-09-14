require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

async function seed() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const tracker = await prisma.sequenceTracker.upsert({
      where: { key: 'PURCHASE_ORDER' },
      update: {
        yearPrefix: '26',
        currentSeq: 1119,
      },
      create: {
        key: 'PURCHASE_ORDER',
        yearPrefix: '26',
        currentSeq: 1119,
      },
    });

    console.log('✅ SequenceTracker for PURCHASE_ORDER set to:', tracker);
  } catch (err) {
    console.error('Error seeding sequence tracker:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
