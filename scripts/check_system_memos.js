require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function check() {
  const memos = await prisma.systemMemo.findMany();
  console.log('=== SystemMemo count:', memos.length, '===');
  memos.forEach(m => {
    console.log(`[ID: ${m.id}] Title: ${m.title} | Category: ${m.category}`);
    console.log(`Content:\n${m.content}\n---`);
  });

  const mocks = await prisma.mockPrototype.findMany();
  console.log('=== MockPrototype count:', mocks.length, '===');
  mocks.forEach(m => {
    console.log(`Title: ${m.title} | Repo: ${m.repoUrl} | Cmd: ${m.composeCmd} | Port: ${m.port}`);
  });

  await prisma.$disconnect();
}
check();
