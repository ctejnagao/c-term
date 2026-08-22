require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  // 1. Update projects (案件)
  const mapping = [
    { old: '2700007', new: '2501706' },
    { old: '2700006', new: '2501704' },
    { old: '2700005', new: '2501696' },
    { old: '2700004', new: '2501723' },
    { old: '2700003', new: '2601733' },
    { old: '2700002', new: '2601735' },
    { old: '2700001', new: '2601736' },
  ];

  for (const { old, new: newNo } of mapping) {
    try {
      const project = await prisma.project.findUnique({ where: { projectCode: old } });
      if (project) {
        await prisma.project.update({
          where: { id: project.id },
          data: { projectCode: newNo }
        });
        console.log(`Updated Project ${old} -> ${newNo}`);
      } else {
        console.log(`Project ${old} not found. Skip.`);
      }
    } catch (err) {
      console.error(`Error updating Project ${old}:`, err.message);
    }
  }

  // 2. Update sequence tracker for PROJECT
  try {
    await prisma.sequenceTracker.upsert({
      where: { key: 'PROJECT' },
      update: {
        yearPrefix: '26',
        currentSeq: 1736
      },
      create: {
        key: 'PROJECT',
        yearPrefix: '26',
        currentSeq: 1736
      }
    });
    console.log(`Updated SequenceTracker PROJECT to yearPrefix 26, currentSeq 1736.`);
  } catch (err) {
    console.error(`Error updating sequence tracker PROJECT:`, err.message);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
