const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const project = await prisma.project.create({
      data: {
        projectCode: '9999999',
        name: 'Test Project',
        partnerId: 1, // Assuming partnerId 1 exists
        status: '案件',
        approximateAmount: 10000,
      }
    });
    console.log('Success:', project);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
