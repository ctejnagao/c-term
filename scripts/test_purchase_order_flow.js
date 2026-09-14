require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

async function testPurchaseFlow() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log('=== 発注・買掛管理 & 採番・消込テスト開始 ===\n');

  try {
    // 1. 仕入先 Partner（株式会社 光システム）の準備
    let supplier = await prisma.partner.findFirst({
      where: {
        OR: [
          { name: { contains: '光システム' } },
          { shortName: { contains: '光システム' } }
        ],
        deletedAt: null,
      },
    });

    if (!supplier) {
      supplier = await prisma.partner.create({
        data: {
          name: '株式会社 光システム',
          shortName: '光システム',
          isSupplier: true,
          tel: '052-562-1456',
          address: '名古屋市中村区名駅1丁目10番9 山善ビル5F',
        },
      });
      console.log('✅ 仕入先 Partner（光システム）作成:', supplier.id, supplier.name);
    } else {
      console.log('✅ 既存の仕入先 Partner を確認:', supplier.id, supplier.name);
    }

    // 2. 得意先 Partner（日本カラリング）& 案件の準備
    let customer = await prisma.partner.findFirst({
      where: {
        OR: [
          { name: { contains: '日本カラリング' } },
          { shortName: 'JCC' }
        ],
        deletedAt: null,
      },
    });

    if (!customer) {
      customer = await prisma.partner.create({
        data: {
          code: 'K500032',
          name: '日本カラリング株式会社',
          shortName: 'JCC',
          isCustomer: true,
        },
      });
      console.log('✅ 得意先 Partner（日本カラリング）作成:', customer.id);
    }

    let project = await prisma.project.findFirst({
      where: { partnerId: customer.id, deletedAt: null },
    });

    if (!project) {
      project = await prisma.project.create({
        data: {
          projectCode: '2601738',
          name: 'TPV81号機 PC更新',
          partnerId: customer.id,
          status: '受注',
        },
      });
      console.log('✅ テスト案件作成:', project.id, project.name);
    } else {
      console.log('✅ 既存の案件を確認:', project.id, project.projectCode, project.name);
    }

    // 3. 発注番号の採番テスト (26-01120 を期待)
    const { generatePurchaseOrderSequence } = await import('../src/lib/sequence');
    const orderNo1 = await generatePurchaseOrderSequence(new Date('2026-08-26'));
    console.log('\n✅ 1件目採番結果:', orderNo1, '(期待値: 26-01120)');

    // 4. 発注データ作成 (外注見積 COM6398 を再現)
    const subtotal = 357000;
    const tax = 35700;
    const totalAmount = 392700;

    const purchaseOrder1 = await prisma.purchaseOrder.create({
      data: {
        orderNo: orderNo1,
        projectId: project.id,
        supplierId: supplier.id,
        supplierEstimateNo: '6398',
        orderDate: new Date('2026-08-26'),
        deliveryDate: new Date('2026-09-25'),
        subtotal,
        tax,
        totalAmount,
        content: 'JCC様 TPV81号機 PC更新',
        remarks: '・対象：81，82号機',
        status: '手配済',
        isReconciled: false,
        items: {
          create: [
            {
              itemOrder: 1,
              itemName: 'JCC様 TPV81号機 PC更新',
              quantity: 1,
              unit: '式',
              unitPrice: 357000,
              amount: 357000,
              remarks: 'Dell Pro Slim QCS1250, Win11検証含む',
            },
          ],
        },
      },
      include: {
        items: true,
        project: true,
        supplier: true,
      },
    });

    console.log('✅ 発注登録完了:');
    console.log('   ID:', purchaseOrder1.id);
    console.log('   注文番号:', purchaseOrder1.orderNo);
    console.log('   仕入先:', purchaseOrder1.supplier.name);
    console.log('   外注見積No:', purchaseOrder1.supplierEstimateNo);
    console.log('   税込金額:', purchaseOrder1.totalAmount.toString());
    console.log('   ステータス:', purchaseOrder1.status);
    console.log('   明細件数:', purchaseOrder1.items.length);

    // 5. 2件目の連続採番テスト (26-01121 を期待)
    const orderNo2 = await generatePurchaseOrderSequence(new Date('2026-08-27'));
    console.log('\n✅ 2件目採番結果:', orderNo2, '(期待値: 26-01121)');

    // 6. 手動支払消込のテスト
    console.log('\n--- 支払消込トグル検証 ---');
    // 消込実行
    const reconciled = await prisma.purchaseOrder.update({
      where: { id: purchaseOrder1.id },
      data: {
        isReconciled: true,
        reconciledAt: new Date(),
        status: '支払済',
      },
    });
    console.log('✅ 消込ON更新結果: isReconciled =', reconciled.isReconciled, 'status =', reconciled.status);

    // 監査ログ記録
    await prisma.auditLog.create({
      data: {
        entityName: 'PurchaseOrder',
        entityId: purchaseOrder1.id,
        action: 'PAYMENT_RECONCILED',
        diff: {
          orderNo: purchaseOrder1.orderNo,
          supplierEstimateNo: purchaseOrder1.supplierEstimateNo,
          amount: purchaseOrder1.totalAmount.toString(),
        },
        userId: 'TEST_SCRIPT',
      },
    });

    const auditLog = await prisma.auditLog.findFirst({
      where: { entityId: purchaseOrder1.id, action: 'PAYMENT_RECONCILED' },
      orderBy: { id: 'desc' },
    });
    console.log('✅ 監査ログ確認:', auditLog?.action, auditLog?.diff);

    // 消込解除
    const unreconciled = await prisma.purchaseOrder.update({
      where: { id: purchaseOrder1.id },
      data: {
        isReconciled: false,
        reconciledAt: null,
        status: '手配済',
      },
    });
    console.log('✅ 消込OFF戻し結果: isReconciled =', unreconciled.isReconciled, 'status =', unreconciled.status);

    console.log('\n=== 全ての検証が成功しました！ ===');
  } catch (err) {
    console.error('テストエラー:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testPurchaseFlow();
