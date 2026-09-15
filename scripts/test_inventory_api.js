require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

async function testInventory() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log('>>> 1. Fetching all consigned inventory...');
  const items = await prisma.consignedInventory.findMany({
    where: { deletedAt: null },
    include: { logs: true, partner: true },
    orderBy: { id: 'asc' }
  });

  console.log(`Found ${items.length} inventory items:`);
  items.forEach(i => {
    console.log(`- [${i.itemCode}] ${i.itemName} | 置き場所: ${i.location} | 在庫: ${i.currentQty}台 / 出庫: ${i.shippedQty}台 | OS: ${i.os}`);
  });

  // KPI計算
  let ourQty = 0;
  let hikariQty = 0;
  let currentTotal = 0;
  let shippedTotal = 0;
  items.forEach(i => {
    currentTotal += i.currentQty;
    shippedTotal += i.shippedQty;
    if (i.location.includes('弊社')) ourQty += i.currentQty;
    if (i.location.includes('光システム')) hikariQty += i.currentQty;
  });

  console.log('\n>>> 2. KPI Summary:');
  console.log(`- 現在庫合計: ${currentTotal}台`);
  console.log(`- 弊社保管: ${ourQty}台`);
  console.log(`- 光システム保管: ${hikariQty}台`);
  console.log(`- 累計出庫済: ${shippedTotal}台`);

  await prisma.$disconnect();
}

testInventory().catch(console.error);
