require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log('--- 1. Seeding Account Code Rules ---');
  const initialRules = [
    { keyword: 'ラクテンカ−ド', accountCode: '2115', accountName: '未払金', subAccountCode: '001', subAccountName: '楽天カード', taxType: '課対仕入10%', priority: 100 },
    { keyword: 'エスビ－', accountCode: '5111', accountName: '仕入高', subAccountCode: '010', subAccountName: 'SB C&S', taxType: '課対仕入10%', priority: 90 },
    { keyword: 'ＳＢＣ＆Ｓ', accountCode: '5111', accountName: '仕入高', subAccountCode: '010', subAccountName: 'SB C&S', taxType: '課対仕入10%', priority: 90 },
    { keyword: 'コニカミノルタ', accountCode: '6125', accountName: '支払リース料', subAccountCode: '020', subAccountName: 'コニカミノルタ', taxType: '課対仕入10%', priority: 90 },
    { keyword: 'トヨタフアイナンス', accountCode: '6126', accountName: '車両費', subAccountCode: '050', subAccountName: 'トヨタファイナンス', taxType: '課対仕入10%', priority: 90 },
    { keyword: 'キユウヨ', accountCode: '6102', accountName: '給料手当', subAccountCode: null, subAccountName: null, taxType: '対象外', priority: 80 },
    { keyword: '給与', accountCode: '6102', accountName: '給料手当', subAccountCode: null, subAccountName: null, taxType: '対象外', priority: 80 },
    { keyword: 'シヤカイホケン', accountCode: '6105', accountName: '法定福利費', subAccountCode: null, subAccountName: null, taxType: '対象外', priority: 70 },
    { keyword: 'ご融資利息', accountCode: '7111', accountName: '支払利息', subAccountCode: null, subAccountName: null, taxType: '非課税', priority: 60 },
    { keyword: '利息', accountCode: '7111', accountName: '支払利息', subAccountCode: null, subAccountName: null, taxType: '非課税', priority: 60 },
    { keyword: 'オリツクス', accountCode: '6125', accountName: '支払リース料', subAccountCode: '030', subAccountName: 'オリックス', taxType: '課対仕入10%', priority: 50 },
    { keyword: 'アフラツク', accountCode: '6130', accountName: '保険料', subAccountCode: '040', subAccountName: 'アフラック', taxType: '非課税', priority: 50 },
    { keyword: 'ドコモ', accountCode: '6117', accountName: '通信費', subAccountCode: null, subAccountName: null, taxType: '課対仕入10%', priority: 40 },
    { keyword: '手数料', accountCode: '6121', accountName: '支払手数料', subAccountCode: null, subAccountName: null, taxType: '課対仕入10%', priority: 30 },
    { keyword: 'ニコス', accountCode: '2115', accountName: '未払金', subAccountCode: '002', subAccountName: 'NICOSカード', taxType: '課対仕入10%', priority: 30 },
    { keyword: 'ＤＣ', accountCode: '2115', accountName: '未払金', subAccountCode: '003', subAccountName: 'DCカード', taxType: '課対仕入10%', priority: 30 },
    { keyword: 'ナゴヤカイギシヨ', accountCode: '6129', accountName: '諸会費', subAccountCode: null, subAccountName: null, taxType: '対象外', priority: 30 },
    { keyword: 'ニホンカラリング', accountCode: '1130', accountName: '売掛金', subAccountCode: '001', subAccountName: '日本カラリング', taxType: '対象外', priority: 50 },
    { keyword: 'ハマジマシヨテン', accountCode: '1130', accountName: '売掛金', subAccountCode: '002', subAccountName: '浜島書店', taxType: '対象外', priority: 50 },
    { keyword: 'イセコンブ', accountCode: '1130', accountName: '売掛金', subAccountCode: '003', subAccountName: '伊勢昆布', taxType: '対象外', priority: 50 },
    { keyword: 'ヒカリシステム', accountCode: '1130', accountName: '売掛金', subAccountCode: '004', subAccountName: 'ヒカリシステム', taxType: '対象外', priority: 50 },
    { keyword: 'トウカイオ－トメ－シヨン', accountCode: '1130', accountName: '売掛金', subAccountCode: '005', subAccountName: '東海オートメーション', taxType: '対象外', priority: 50 },
  ];

  for (const rule of initialRules) {
    await prisma.accountCodeRule.upsert({
      where: { keyword: rule.keyword },
      update: rule,
      create: rule,
    });
  }
  console.log('Account rules seeded successfully.');

  console.log('--- 2. Seeding Rakuten Card Statements ---');
  const cardJune = await prisma.cardStatement.upsert({
    where: { id: 1 },
    update: {
      cardName: '楽天ビジネスカード (JCB)',
      cardHolder: '末尾 4102',
      billingMonth: '2025-06',
      paymentDate: new Date('2025-06-27T00:00:00.000Z'),
      totalAmount: 177441,
      status: 'CONFIRMED',
      memo: '2025年6月27日振替分 (資料/statement_202506.pdf準拠)',
      details: [
        { date: '2025/05/19', storeName: 'さくらインターネット', amount: 2970, user: '役員', category: '通信費', memo: 'VPS・サーバー利用料' },
        { date: '2025/05/20', storeName: 'COGNITION LABS DEVIN', amount: 3367, user: '開発部', category: '消耗品費', memo: 'Devin AI サブスクリプション' },
        { date: '2025/05/24', storeName: 'COGNITION LABS DEVIN', amount: 9092, user: '開発部', category: '消耗品費', memo: 'Devin AI 追加従量利用' },
        { date: '2025/05/31', storeName: '首都高速道路 / ETC', amount: 15190, user: '営業部', category: '旅費交通費', memo: '取引先往復ETC' },
        { date: '2025/05/28', storeName: 'ﾒｲﾃﾂｷﾖｳｼﾖｳﾊﾟ-ｷﾝｸﾞ', amount: 1100, user: '営業部', category: '旅費交通費', memo: '客先訪問時駐車場' },
        { date: '2025/05/15', storeName: 'Amazon Japan', amount: 18450, user: '総務部', category: '消耗品費', memo: '事務用品・ケーブル類' },
        { date: '2025/05/22', storeName: 'ヤフー広告', amount: 12500, user: 'マーケ', category: '広告宣伝費', memo: 'Webプロモーション' },
        { date: '2025/05/25', storeName: 'アドビシステムズ', amount: 8228, user: 'デザイン', category: '通信費', memo: 'Creative Cloudグループ版' },
        { date: '2025/05/27', storeName: 'Google Cloud Platform', amount: 48544, user: 'インフラ', category: '通信費', memo: '社内ERP基盤インフラ' },
        { date: '2025/05/28', storeName: 'Microsoft Azure', amount: 58000, user: 'インフラ', category: '通信費', memo: 'バックアップ・ストレージ' },
      ],
    },
    create: {
      id: 1,
      cardName: '楽天ビジネスカード (JCB)',
      cardHolder: '末尾 4102',
      billingMonth: '2025-06',
      paymentDate: new Date('2025-06-27T00:00:00.000Z'),
      totalAmount: 177441,
      status: 'CONFIRMED',
      memo: '2025年6月27日振替分 (資料/statement_202506.pdf準拠)',
      details: [
        { date: '2025/05/19', storeName: 'さくらインターネット', amount: 2970, user: '役員', category: '通信費', memo: 'VPS・サーバー利用料' },
        { date: '2025/05/20', storeName: 'COGNITION LABS DEVIN', amount: 3367, user: '開発部', category: '消耗品費', memo: 'Devin AI サブスクリプション' },
        { date: '2025/05/24', storeName: 'COGNITION LABS DEVIN', amount: 9092, user: '開発部', category: '消耗品費', memo: 'Devin AI 追加従量利用' },
        { date: '2025/05/31', storeName: '首都高速道路 / ETC', amount: 15190, user: '営業部', category: '旅費交通費', memo: '取引先往復ETC' },
        { date: '2025/05/28', storeName: 'ﾒｲﾃﾂｷﾖｳｼﾖｳﾊﾟ-ｷﾝｸﾞ', amount: 1100, user: '営業部', category: '旅費交通費', memo: '客先訪問時駐車場' },
        { date: '2025/05/15', storeName: 'Amazon Japan', amount: 18450, user: '総務部', category: '消耗品費', memo: '事務用品・ケーブル類' },
        { date: '2025/05/22', storeName: 'ヤフー広告', amount: 12500, user: 'マーケ', category: '広告宣伝費', memo: 'Webプロモーション' },
        { date: '2025/05/25', storeName: 'アドビシステムズ', amount: 8228, user: 'デザイン', category: '通信費', memo: 'Creative Cloudグループ版' },
        { date: '2025/05/27', storeName: 'Google Cloud Platform', amount: 48544, user: 'インフラ', category: '通信費', memo: '社内ERP基盤インフラ' },
        { date: '2025/05/28', storeName: 'Microsoft Azure', amount: 58000, user: 'インフラ', category: '通信費', memo: 'バックアップ・ストレージ' },
      ],
    },
  });

  const cardJuly = await prisma.cardStatement.upsert({
    where: { id: 2 },
    update: {
      cardName: '楽天ビジネスカード (JCB)',
      cardHolder: '末尾 4102',
      billingMonth: '2025-07',
      paymentDate: new Date('2025-07-28T00:00:00.000Z'),
      totalAmount: 309268,
      status: 'CONFIRMED',
      memo: '2025年7月28日UFJ引落分 (銀行明細と自動突合済)',
      details: [
        { date: '2025/06/19', storeName: 'さくらインターネット', amount: 2970, user: '役員', category: '通信費', memo: 'VPSサーバー保守' },
        { date: '2025/06/20', storeName: 'COGNITION LABS DEVIN', amount: 9500, user: '開発部', category: '消耗品費', memo: 'Devin AI Pro利用' },
        { date: '2025/06/22', storeName: 'Amazon Japan (PC周辺機器)', amount: 45800, user: '開発部', category: '工具器具備品', memo: '開発用モニタ・HUB' },
        { date: '2025/06/25', storeName: '首都高速道路 / ETC', amount: 18400, user: '営業部', category: '旅費交通費', memo: '現地導入サポート往復' },
        { date: '2025/06/27', storeName: 'JR東海・新幹線チケット', amount: 84200, user: '役員・営業', category: '旅費交通費', memo: '東京・名古屋出張' },
        { date: '2025/06/28', storeName: 'Adobe Creative Cloud', amount: 8228, user: 'デザイン', category: '通信費', memo: '月額ライセンス' },
        { date: '2025/06/29', storeName: 'Google Workspace', amount: 12400, user: '総務', category: '通信費', memo: '全社アカウント月額' },
        { date: '2025/06/30', storeName: 'クラウドサーバー・インフラ利用料', amount: 127770, user: 'インフラ', category: '通信費', memo: '本番環境・ステージング' },
      ],
    },
    create: {
      id: 2,
      cardName: '楽天ビジネスカード (JCB)',
      cardHolder: '末尾 4102',
      billingMonth: '2025-07',
      paymentDate: new Date('2025-07-28T00:00:00.000Z'),
      totalAmount: 309268,
      status: 'CONFIRMED',
      memo: '2025年7月28日UFJ引落分 (銀行明細と自動突合済)',
      details: [
        { date: '2025/06/19', storeName: 'さくらインターネット', amount: 2970, user: '役員', category: '通信費', memo: 'VPSサーバー保守' },
        { date: '2025/06/20', storeName: 'COGNITION LABS DEVIN', amount: 9500, user: '開発部', category: '消耗品費', memo: 'Devin AI Pro利用' },
        { date: '2025/06/22', storeName: 'Amazon Japan (PC周辺機器)', amount: 45800, user: '開発部', category: '工具器具備品', memo: '開発用モニタ・HUB' },
        { date: '2025/06/25', storeName: '首都高速道路 / ETC', amount: 18400, user: '営業部', category: '旅費交通費', memo: '現地導入サポート往復' },
        { date: '2025/06/27', storeName: 'JR東海・新幹線チケット', amount: 84200, user: '役員・営業', category: '旅費交通費', memo: '東京・名古屋出張' },
        { date: '2025/06/28', storeName: 'Adobe Creative Cloud', amount: 8228, user: 'デザイン', category: '通信費', memo: '月額ライセンス' },
        { date: '2025/06/29', storeName: 'Google Workspace', amount: 12400, user: '総務', category: '通信費', memo: '全社アカウント月額' },
        { date: '2025/06/30', storeName: 'クラウドサーバー・インフラ利用料', amount: 127770, user: 'インフラ', category: '通信費', memo: '本番環境・ステージング' },
      ],
    },
  });

  const cardAug = await prisma.cardStatement.upsert({
    where: { id: 3 },
    update: {
      cardName: '楽天ビジネスカード (JCB)',
      cardHolder: '末尾 4102',
      billingMonth: '2025-08',
      paymentDate: new Date('2025-08-27T00:00:00.000Z'),
      totalAmount: 225947,
      status: 'CONFIRMED',
      memo: '2025年8月27日UFJ引落分 (銀行明細と自動突合済)',
      details: [
        { date: '2025/07/19', storeName: 'さくらインターネット', amount: 2970, user: '役員', category: '通信費', memo: 'VPSサーバー保守' },
        { date: '2025/07/20', storeName: 'COGNITION LABS DEVIN', amount: 9200, user: '開発部', category: '消耗品費', memo: 'Devin AI Pro利用' },
        { date: '2025/07/22', storeName: '機材・開発ボード購入', amount: 68500, user: '開発部', category: '消耗品費', memo: 'IoT検証キット' },
        { date: '2025/07/25', storeName: '首都高速道路 / ETC', amount: 16200, user: '営業部', category: '旅費交通費', memo: '現場打ち合わせETC' },
        { date: '2025/07/28', storeName: 'Google Workspace / Cloud', amount: 65077, user: 'インフラ', category: '通信費', memo: '全社クラウド基盤' },
        { date: '2025/07/30', storeName: '技術書籍・カンファレンス費', amount: 64000, user: '開発部', category: '新聞図書費', memo: '研修および技術参考書' },
      ],
    },
    create: {
      id: 3,
      cardName: '楽天ビジネスカード (JCB)',
      cardHolder: '末尾 4102',
      billingMonth: '2025-08',
      paymentDate: new Date('2025-08-27T00:00:00.000Z'),
      totalAmount: 225947,
      status: 'CONFIRMED',
      memo: '2025年8月27日UFJ引落分 (銀行明細と自動突合済)',
      details: [
        { date: '2025/07/19', storeName: 'さくらインターネット', amount: 2970, user: '役員', category: '通信費', memo: 'VPSサーバー保守' },
        { date: '2025/07/20', storeName: 'COGNITION LABS DEVIN', amount: 9200, user: '開発部', category: '消耗品費', memo: 'Devin AI Pro利用' },
        { date: '2025/07/22', storeName: '機材・開発ボード購入', amount: 68500, user: '開発部', category: '消耗品費', memo: 'IoT検証キット' },
        { date: '2025/07/25', storeName: '首都高速道路 / ETC', amount: 16200, user: '営業部', category: '旅費交通費', memo: '現場打ち合わせETC' },
        { date: '2025/07/28', storeName: 'Google Workspace / Cloud', amount: 65077, user: 'インフラ', category: '通信費', memo: '全社クラウド基盤' },
        { date: '2025/07/30', storeName: '技術書籍・カンファレンス費', amount: 64000, user: '開発部', category: '新聞図書費', memo: '研修および技術参考書' },
      ],
    },
  });
  console.log('Card statements seeded successfully.');

  console.log('--- 3. Importing MEISAI20250829151403.csv ---');
  const csvPath = path.join(process.cwd(), '資料', 'MEISAI20250829151403.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found at:', csvPath);
    return;
  }

  const buffer = fs.readFileSync(csvPath);
  const sjisDecoder = new TextDecoder('shift_jis');
  const text = sjisDecoder.decode(buffer);
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);

  const rules = await prisma.accountCodeRule.findMany({ where: { isActive: true } });
  let importedCount = 0;

  for (const line of lines) {
    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    const cols = (matches || line.split(',')).map(c => c.replace(/^"|"$/g, '').trim());

    if (cols.length === 0 || cols[0] !== '2') continue;

    const rawDate = cols[1]; // e.g. "2025.7.2"
    const category = cols[2] || '';
    const target = cols[3] || '';
    const description = target ? `${target} (${category})` : category;

    const rawWithdrawal = cols[4]?.replace(/,/g, '') || '0';
    const rawDeposit = cols[5]?.replace(/,/g, '') || '0';
    const rawBalance = cols[6]?.replace(/,/g, '') || '0';

    const parts = rawDate.split(/[\.\/\-]/).map(Number);
    if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
      continue;
    }
    const [y, m, d] = parts;
    const txDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));

    const withdrawalAmount = parseInt(rawWithdrawal, 10) || 0;
    const depositAmount = parseInt(rawDeposit, 10) || 0;
    const balance = parseInt(rawBalance, 10) || 0;
    const amount = depositAmount > 0 ? depositAmount : -withdrawalAmount;
    const transactionType = depositAmount > 0 ? 'DEPOSIT' : 'WITHDRAWAL';

    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const hash = `${dateStr}_${description}_${withdrawalAmount}_${depositAmount}_${balance}`;

    let accountCode = null;
    let accountName = null;
    let subAccountCode = null;
    let subAccountName = null;
    let taxType = '課対仕入10%';

    for (const rule of rules) {
      if (description.includes(rule.keyword) || category.includes(rule.keyword) || target.includes(rule.keyword)) {
        accountCode = rule.accountCode;
        accountName = rule.accountName;
        subAccountCode = rule.subAccountCode;
        subAccountName = rule.subAccountName;
        taxType = rule.taxType || '課対仕入10%';
        break;
      }
    }

    let linkedCardStatementId = null;
    if (description.includes('ラクテンカ−ド') || description.includes('楽天')) {
      if (dateStr === '2025-07-28' || withdrawalAmount === 309268) {
        linkedCardStatementId = cardJuly.id;
      } else if (dateStr === '2025-08-27' || withdrawalAmount === 225947) {
        linkedCardStatementId = cardAug.id;
      } else if (dateStr.startsWith('2025-06') || withdrawalAmount === 177441) {
        linkedCardStatementId = cardJune.id;
      }
    }

    await prisma.bankTransaction.upsert({
      where: { hash },
      update: {
        date: txDate,
        description,
        amount,
        withdrawalAmount,
        depositAmount,
        balance,
        transactionType,
        accountCode,
        accountName,
        subAccountCode,
        subAccountName,
        taxType,
        cardStatementId: linkedCardStatementId,
        rawData: line,
        isReconciled: Boolean(linkedCardStatementId || accountName),
      },
      create: {
        date: txDate,
        bankName: '三菱UFJ銀行',
        branchName: '大津町支店',
        accountType: '普通',
        description,
        amount,
        withdrawalAmount,
        depositAmount,
        balance,
        transactionType,
        accountCode,
        accountName,
        subAccountCode,
        subAccountName,
        taxType,
        cardStatementId: linkedCardStatementId,
        rawData: line,
        hash,
        isReconciled: Boolean(linkedCardStatementId || accountName),
      },
    });

    importedCount++;
  }

  console.log(`Successfully imported and matched ${importedCount} UFJ bank transactions!`);

  console.log('--- 4. Seeding SMBC (上前津支店) records ---');
  const smbcEntries = [
    {
      date: new Date('2025-06-30T00:00:00.000Z'),
      description: '利息',
      withdrawalAmount: 4007,
      depositAmount: 0,
      balance: 23331,
      hash: '2025-06-30_SMBC_利息_4007_0_23331',
    },
    {
      date: new Date('2025-07-31T00:00:00.000Z'),
      description: '利息',
      withdrawalAmount: 4136,
      depositAmount: 0,
      balance: 19195,
      hash: '2025-07-31_SMBC_利息_4136_0_19195',
    },
    {
      date: new Date('2025-08-20T00:00:00.000Z'),
      description: '利息',
      withdrawalAmount: 3748,
      depositAmount: 0,
      balance: 15459,
      hash: '2025-08-20_SMBC_利息_3748_0_15459',
    },
  ];

  for (const smbc of smbcEntries) {
    await prisma.bankTransaction.upsert({
      where: { hash: smbc.hash },
      update: {
        date: smbc.date,
        bankName: 'SMBC',
        branchName: '上前津支店',
        accountType: '普通',
        description: smbc.description,
        amount: -smbc.withdrawalAmount,
        withdrawalAmount: smbc.withdrawalAmount,
        depositAmount: smbc.depositAmount,
        balance: smbc.balance,
        transactionType: 'WITHDRAWAL',
        accountCode: '7111',
        accountName: '支払利息',
        subAccountName: 'SMBC上前津',
        taxType: '非課税',
        memo: '資料/銀行残高2025.xlsx準拠 (上前津支店 借入利息)',
        isReconciled: true,
      },
      create: {
        date: smbc.date,
        bankName: 'SMBC',
        branchName: '上前津支店',
        accountType: '普通',
        description: smbc.description,
        amount: -smbc.withdrawalAmount,
        withdrawalAmount: smbc.withdrawalAmount,
        depositAmount: smbc.depositAmount,
        balance: smbc.balance,
        transactionType: 'WITHDRAWAL',
        accountCode: '7111',
        accountName: '支払利息',
        subAccountName: 'SMBC上前津',
        taxType: '非課税',
        memo: '資料/銀行残高2025.xlsx準拠 (上前津支店 借入利息)',
        hash: smbc.hash,
        isReconciled: true,
      },
    });
  }
  console.log('SMBC records seeded successfully.');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
