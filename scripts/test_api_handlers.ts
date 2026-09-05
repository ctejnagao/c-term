require('dotenv').config();

async function testApiDirect() {
  const { POST: postPdfOrder } = await import('../src/app/api/pdf-import/order/route');
  const { POST: postSplitDelivery } = await import('../src/app/api/deliveries/split/route');
  const { POST: postRecurringBatch } = await import('../src/app/api/contracts/recurring-batch/route');

  console.log('=== API Route ハンドラー直接呼び出しテスト ===\n');

  // 1. PDF注文作成API呼び出し
  const uniqueOrderNo = `API-ORD-${Date.now()}`;
  const req1 = new Request('http://localhost:3000/api/pdf-import/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderNumber: uniqueOrderNo,
      partnerId: 1,
      totalAmount: 30000,
      orderDate: '2026-09-01',
      items: [
        { itemName: 'カラーマスターバッチ', quantity: 5, unitPrice: 6000 }
      ],
      pdfImport: {
        fileName: 'coloring_order_sample.pdf',
        fileUrl: '/uploads/sample.pdf'
      },
      userId: 'API_TESTER'
    })
  });

  const res1 = await postPdfOrder(req1);
  const json1 = await res1.json();
  console.log('1. POST /api/pdf-import/order 結果: status =', res1.status);
  console.log('   Body:', json1.success, 'OrderId =', json1.data?.id, 'OrderNumber =', json1.data?.orderNumber);

  if (!json1.success) {
    throw new Error('PDF Order API failed: ' + json1.error);
  }

  // 1-b. 重複エラー検証
  const resDup = await postPdfOrder(req1);
  const jsonDup = await resDup.json();
  console.log('1-b. 重複時の挙動: status =', resDup.status, 'Error =', jsonDup.error);

  // 2. 分納API呼び出し
  const createdOrderId = json1.data.id;
  const createdItemId = json1.data.orderItems[0].id;
  const req2 = new Request('http://localhost:3000/api/deliveries/split', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: createdOrderId,
      deliveryDate: '2026-09-05',
      items: [
        { orderItemId: createdItemId, quantity: 2 }
      ],
      userId: 'API_TESTER'
    })
  });

  const res2 = await postSplitDelivery(req2);
  const json2 = await res2.json();
  console.log('\n2. POST /api/deliveries/split 結果: status =', res2.status);
  console.log('   DeliveryId =', json2.data?.id, 'Success =', json2.success);

  // 3. 定期請求API呼び出し
  const req3 = new Request('http://localhost:3000/api/contracts/recurring-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetPeriod: '2026-10',
      userId: 'BATCH_ADMIN'
    })
  });

  const res3 = await postRecurringBatch(req3);
  const json3 = await res3.json();
  console.log('\n3. POST /api/contracts/recurring-batch 結果: status =', res3.status);
  console.log('   ProcessedCount =', json3.processedCount, 'Success =', json3.success);

  console.log('\n=== 全APIハンドラーテスト完了 ===');
}

testApiDirect().catch(console.error);
