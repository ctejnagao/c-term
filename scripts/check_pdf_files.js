require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const fs = require('fs');
const path = require('path');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const list = await prisma.pdfImport.findMany({
    select: { id: true, fileName: true, fileUrl: true },
    orderBy: { id: 'asc' }
  });

  for (const item of list) {
    const cleanUrl = (item.fileUrl || '').replace(/^\//, '');
    const localPath = path.join(process.cwd(), 'public', cleanUrl);
    const exists = fs.existsSync(localPath);
    console.log(`ID ${item.id}: exists=${exists} | fileUrl=${item.fileUrl}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
