require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const initialSubjects = [
    // 小口現金利用科目 (isForCash: true)
    { name: '旅費交通費', code: '6111', isForCash: true, displayOrder: 10, description: '電車・バス・タクシー・新幹線等' },
    { name: '消耗品費', code: '6112', isForCash: true, displayOrder: 20, description: '文具・日用品・小額什器等' },
    { name: '会議費', code: '6113', isForCash: true, displayOrder: 30, description: '社内会議・打合せ時の茶菓子等' },
    { name: '交際費', code: '6114', isForCash: true, displayOrder: 40, description: '取引先接待・贈答等' },
    { name: '雑費', code: '6115', isForCash: true, displayOrder: 50, description: '少額の手数料・ゴミ処理等' },
    { name: '水道光熱費', code: '6116', isForCash: true, displayOrder: 60, description: '水道・電気・ガス代等' },
    { name: '通信費', code: '6117', isForCash: true, displayOrder: 70, description: '切手・郵送代等' },
    { name: '新聞図書費', code: '6118', isForCash: true, displayOrder: 80, description: '新聞・書籍・雑誌等' },
    { name: '荷造運賃', code: '6119', isForCash: true, displayOrder: 90, description: '宅配便・小包配送料等' },

    // 一般・小口現金対象外科目 (isForCash: false)
    { name: '売上高', code: '4111', isForCash: false, displayOrder: 100, description: '商品・役務の売上' },
    { name: '売掛金', code: '1130', isForCash: false, displayOrder: 110, description: '売掛債権' },
    { name: '買掛金', code: '2110', isForCash: false, displayOrder: 120, description: '仕入未払金' },
    { name: '仕入高', code: '5111', isForCash: false, displayOrder: 130, description: '仕入費用' },
    { name: '支払家賃', code: '6120', isForCash: false, displayOrder: 140, description: '事務所・倉庫等の賃料' },
    { name: '役員報酬', code: '6101', isForCash: false, displayOrder: 150, description: '役員報酬' },
    { name: '給料手当', code: '6102', isForCash: false, displayOrder: 160, description: '従業員給料' },
  ];

  console.log('Seeding Account Subjects...');
  for (const s of initialSubjects) {
    await prisma.accountSubject.upsert({
      where: { name: s.name },
      update: {
        code: s.code,
        isForCash: s.isForCash,
        displayOrder: s.displayOrder,
        description: s.description,
        isActive: true,
      },
      create: {
        name: s.name,
        code: s.code,
        isForCash: s.isForCash,
        displayOrder: s.displayOrder,
        description: s.description,
        isActive: true,
      }
    });
  }
  console.log(`Seeded ${initialSubjects.length} account subjects.`);

  // 既存の小口現金トランザクションに accountSubjectId を紐付け
  const subjects = await prisma.accountSubject.findMany();
  const subjectMap = new Map(subjects.map(s => [s.name, s.id]));

  const transactions = await prisma.cashTransaction.findMany({
    where: { accountSubjectId: null }
  });

  console.log(`Linking existing ${transactions.length} transactions to account subjects...`);
  for (const tx of transactions) {
    const matchedId = subjectMap.get(tx.accountSubject);
    if (matchedId) {
      await prisma.cashTransaction.update({
        where: { id: tx.id },
        data: { accountSubjectId: matchedId }
      });
    }
  }

  console.log('Done!');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
