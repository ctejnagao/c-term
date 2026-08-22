const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const invoice = await prisma.invoice.findUnique({
    where: { invoiceNo: '2700001' },
    include: { project: true }
  });
  console.log(JSON.stringify(invoice, null, 2));
}

check().then(() => prisma.$disconnect());
