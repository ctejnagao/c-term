require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log('>>> Checking JCC Partner...');
  let jcc = await prisma.partner.findFirst({
    where: {
      OR: [
        { name: { contains: '日本カラリング' } },
        { shortName: { contains: 'JCC' } }
      ]
    }
  });

  if (!jcc) {
    jcc = await prisma.partner.create({
      data: {
        name: '日本カラリング株式会社',
        shortName: 'JCC',
        isCustomer: true,
      }
    });
    console.log('Created JCC Partner:', jcc.id);
  } else {
    console.log('Found JCC Partner:', jcc.id, jcc.name);
  }

  // 既存データを確認
  const existingCount = await prisma.consignedInventory.count();
  if (existingCount > 0) {
    console.log(`Already has ${existingCount} consigned inventory items. Skipping seed.`);
    await prisma.$disconnect();
    return;
  }

  console.log('>>> Seeding sample backup PCs for JCC...');

  // 1. 弊社保管PC (Dell OptiPlex 7090 - Win11 Pro)
  const pc1 = await prisma.consignedInventory.create({
    data: {
      itemCode: 'JCC-PC-001',
      partnerId: jcc.id,
      itemName: 'Dell OptiPlex 7090 Micro',
      serialNumber: 'DL-7090-JCC01',
      os: 'Windows 11 Pro 64bit',
      spec: 'Core i7-11700 / 16GB RAM / 512GB NVMe SSD / DisplayPort x2, LAN',
      purchaseDate: new Date('2025-11-15'),
      inboundDate: new Date('2025-12-01'),
      location: '弊社',
      initialQty: 2,
      currentQty: 2,
      shippedQty: 0,
      status: 'STORED',
      remarks: '本社基幹ライン緊急スタンバイ用。初期セットアップ・固定IP設定済。',
      logs: {
        create: {
          actionType: 'INBOUND',
          quantity: 2,
          date: new Date('2025-12-01'),
          toLocation: '弊社',
          purpose: 'JCC様より予備機受託保管開始',
          handler: '社内担当',
          remarks: '動作確認・初期設定完了後、社内ラックにて保管。',
        }
      }
    }
  });

  // 2. 光システム保管PC (産業用Box PC / HP ProDesk 400 - Win10 IoT / Pro)
  const pc2 = await prisma.consignedInventory.create({
    data: {
      itemCode: 'JCC-PC-002',
      partnerId: jcc.id,
      itemName: 'HP ProDesk 400 G6 SFF',
      serialNumber: 'HP-400G6-8182',
      os: 'Windows 10 Pro 64bit',
      spec: 'Core i5-10500 / 8GB RAM / 256GB SSD / RS-232C シリアルポート増設',
      purchaseDate: new Date('2025-08-20'),
      inboundDate: new Date('2025-09-05'),
      location: '仕入先：光システム',
      initialQty: 3,
      currentQty: 2,
      shippedQty: 1,
      status: 'PARTIALLY_DELIVERED',
      remarks: '工場ライン81・82号機 制御バックアップ用。光システム様倉庫にて保管・保守メンテ。',
      logs: {
        create: [
          {
            actionType: 'INBOUND',
            quantity: 3,
            date: new Date('2025-09-05'),
            toLocation: '仕入先：光システム',
            purpose: '光システム様納入・予備機保管委託',
            handler: '光システム担当',
            remarks: 'シリアルポート通信テスト合格',
          },
          {
            actionType: 'OUTBOUND',
            quantity: 1,
            date: new Date('2026-06-15'),
            fromLocation: '仕入先：光システム',
            toLocation: 'JCC第1工場 81号機',
            purpose: 'ライン制御PC HDDエラーに伴う緊急代替機交換',
            handler: '光システム / コムテック',
            remarks: '現地にて入替作業実施、正常稼働確認済。',
          }
        ]
      }
    }
  });

  // 3. 弊社保管PC (産業用タッチパネルPC / 予備ノートPC)
  const pc3 = await prisma.consignedInventory.create({
    data: {
      itemCode: 'JCC-PC-003',
      partnerId: jcc.id,
      itemName: 'Panasonic Let\'s note CF-SV9',
      serialNumber: 'CFSV9-JCC-FLD01',
      os: 'Windows 10 Pro 64bit',
      spec: 'Core i5-10310U vPro / 16GB RAM / 256GB SSD / LTE対応 / 防塵設計',
      purchaseDate: new Date('2026-01-10'),
      inboundDate: new Date('2026-01-20'),
      location: '弊社',
      initialQty: 1,
      currentQty: 1,
      shippedQty: 0,
      status: 'STORED',
      remarks: '現場メンテ・障害診断用ポータブル機。専用診断ツールインストール済。',
      logs: {
        create: {
          actionType: 'INBOUND',
          quantity: 1,
          date: new Date('2026-01-20'),
          toLocation: '弊社',
          purpose: 'フィールド診断用スタンバイ機お預かり',
          handler: '社内担当',
          remarks: 'バッテリ健全性確認済',
        }
      }
    }
  });

  console.log('✅ Seed completed successfully:');
  console.log(`- PC1: ${pc1.itemName} (${pc1.location}, 在庫: ${pc1.currentQty}台)`);
  console.log(`- PC2: ${pc2.itemName} (${pc2.location}, 在庫: ${pc2.currentQty}台 / 出庫: ${pc2.shippedQty}台)`);
  console.log(`- PC3: ${pc3.itemName} (${pc3.location}, 在庫: ${pc3.currentQty}台)`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
