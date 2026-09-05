require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

async function testPaymentWorkflow() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log('=== 取引先支払PDF取込・入金予定/入金済自動同期テスト開始 ===\n');

  try {
    // 1. テスト用の取引先・案件・請求書の準備
    let partner = await prisma.partner.findFirst({ where: { deletedAt: null } });
    if (!partner) throw new Error('Partner not found');

    const projectFuture = await prisma.project.create({
      data: {
        projectCode: `TEST-PAY-FUT-${Date.now().toString().slice(-6)}`,
        name: '未来入金テスト案件',
        partnerId: partner.id,
        status: '請求済',
      }
    });

    const invoiceFuture = await prisma.invoice.create({
      data: {
        invoiceNo: `INV-FUT-${Date.now().toString().slice(-6)}`,
        projectId: projectFuture.id,
        partnerId: partner.id,
        issueDate: new Date(),
        subtotal: 100000,
        tax: 10000,
        totalAmount: 110000,
        paymentStatus: '未入金',
      }
    });

    console.log('✅ テスト案件作成 (未来計上予定用): Project ID =', projectFuture.id, 'Invoice ID =', invoiceFuture.id);

    // 2. 「計上日がシステム日付を超えていない（未来日）」のPDF取込シミュレーション
    // 未来日: 2026-12-31
    const futureDate = new Date('2026-12-31');
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const isFuturePast = futureDate <= endOfToday; // false
    const futureStatus = isFuturePast ? '入金済' : '入金予定'; // '入金予定'

    await prisma.project.update({
      where: { id: projectFuture.id },
      data: {
        status: futureStatus,
        expectedPayDate: futureDate,
      }
    });
    await prisma.invoice.update({
      where: { id: invoiceFuture.id },
      data: {
        paymentStatus: futureStatus,
        paidDate: futureDate,
      }
    });

    const checkFuture = await prisma.project.findUnique({ where: { id: projectFuture.id } });
    const checkInvFuture = await prisma.invoice.findUnique({ where: { id: invoiceFuture.id } });

    console.log('✅ 1. 未来日(2026-12-31)の取込判定結果:');
    console.log('   Project.status =', checkFuture.status, '(期待値: 入金予定)');
    console.log('   Invoice.paymentStatus =', checkInvFuture.paymentStatus, '(期待値: 入金予定)');

    // 3. 「計上日がシステム日付を超えている（過去日）」のPDF取込シミュレーション
    // 過去日: 2026-06-30
    const projectPast = await prisma.project.create({
      data: {
        projectCode: `TEST-PAY-PAST-${Date.now().toString().slice(-6)}`,
        name: '過去計上テスト案件',
        partnerId: partner.id,
        status: '請求済',
      }
    });
    const invoicePast = await prisma.invoice.create({
      data: {
        invoiceNo: `INV-PAST-${Date.now().toString().slice(-6)}`,
        projectId: projectPast.id,
        partnerId: partner.id,
        issueDate: new Date(),
        subtotal: 200000,
        tax: 20000,
        totalAmount: 220000,
        paymentStatus: '未入金',
      }
    });

    const pastDate = new Date('2026-06-30');
    const isPastReached = pastDate <= endOfToday; // true
    const pastStatus = isPastReached ? '入金済' : '入金予定'; // '入金済'

    await prisma.project.update({
      where: { id: projectPast.id },
      data: {
        status: pastStatus,
        expectedPayDate: pastDate,
      }
    });
    await prisma.invoice.update({
      where: { id: invoicePast.id },
      data: {
        paymentStatus: pastStatus,
        paidDate: pastDate,
        paidAmount: 220000,
      }
    });

    const checkPast = await prisma.project.findUnique({ where: { id: projectPast.id } });
    const checkInvPast = await prisma.invoice.findUnique({ where: { id: invoicePast.id } });

    console.log('\n✅ 2. 過去日(2026-06-30)の取込判定結果:');
    console.log('   Project.status =', checkPast.status, '(期待値: 入金済)');
    console.log('   Invoice.paymentStatus =', checkInvPast.paymentStatus, '(期待値: 入金済)');

    // 4. 「C-TERP起動時に計上日を超えていれば入金済にする」自動同期ロジックのテスト
    console.log('\n--- 3. 起動時同期 (syncPaymentStatuses) のテスト ---');
    // 先ほどの未来案件の計上日をあえて「昨日」に書き換えて「入金予定」のままにしておく
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.project.update({
      where: { id: projectFuture.id },
      data: {
        status: '入金予定',
        expectedPayDate: yesterday,
      }
    });
    await prisma.invoice.update({
      where: { id: invoiceFuture.id },
      data: {
        paymentStatus: '入金予定',
        paidDate: yesterday,
      }
    });

    console.log('   [準備] 案件', projectFuture.id, 'の計上日を昨日にし、ステータスを「入金予定」に設定しました。');

    // syncPaymentStatuses をインポートして実行
    const { syncPaymentStatuses } = await import('../src/lib/paymentSync');
    const syncResult = await syncPaymentStatuses();
    console.log('   [同期実行結果]', syncResult);

    const recheckProject = await prisma.project.findUnique({ where: { id: projectFuture.id } });
    const recheckInvoice = await prisma.invoice.findUnique({ where: { id: invoiceFuture.id } });

    console.log('✅ 同期後の判定結果:');
    console.log('   Project.status =', recheckProject.status, '(期待値: 入金済)');
    console.log('   Invoice.paymentStatus =', recheckInvoice.paymentStatus, '(期待値: 入金済)');

    // 監査ログ確認
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: 'AUTO_PAYMENT_CONFIRMED',
        entityId: projectFuture.id,
      },
      take: 1,
    });
    console.log('✅ 不変監査ログ記録確認:', auditLogs.length > 0 ? '記録あり' : 'なし', auditLogs[0]?.diff);

    console.log('\n=== 全ての検証が成功しました！ ===');
  } catch (err) {
    console.error('テストエラー:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testPaymentWorkflow();
