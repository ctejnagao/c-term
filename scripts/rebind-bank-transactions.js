require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function rebind() {
  console.log('--- 取引明細への最新仕訳ルールの再バインド実行 ---');
  const rules = await prisma.accountCodeRule.findMany({
    where: { isActive: true },
    orderBy: [{ priority: 'desc' }, { id: 'asc' }],
  });

  const txs = await prisma.bankTransaction.findMany();
  let updatedCount = 0;

  for (const tx of txs) {
    let matchedRule = null;
    for (const rule of rules) {
      if (tx.description.includes(rule.keyword)) {
        matchedRule = rule;
        break;
      }
    }

    if (matchedRule) {
      await prisma.bankTransaction.update({
        where: { id: tx.id },
        data: {
          accountCode: matchedRule.accountCode,
          accountName: matchedRule.accountName,
          subAccountCode: matchedRule.subAccountCode,
          subAccountName: matchedRule.subAccountName,
          taxType: matchedRule.taxType,
        },
      });
      updatedCount++;
    } else if (tx.bankName === 'SMBC') {
      await prisma.bankTransaction.update({
        where: { id: tx.id },
        data: {
          accountCode: '821',
          accountName: '支払利息',
          taxType: '対象外',
        },
      });
      updatedCount++;
    }
  }

  console.log(`全${txs.length}件中、${updatedCount}件の明細を最新弥生コードで再バインドしました。`);
}

rebind()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
