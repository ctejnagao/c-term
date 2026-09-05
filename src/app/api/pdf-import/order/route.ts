import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 柔軟な入力形式に対応（フラット形式またはネスト形式）
    const orderData = body.order || body;
    const pdfImportData = body.pdfImport || body;

    const orderNumber = orderData.orderNumber;
    if (!orderNumber || typeof orderNumber !== "string") {
      return NextResponse.json(
        { success: false, error: "発注番号 (orderNumber) は必須です。" },
        { status: 400 }
      );
    }

    const partnerId = parseInt(orderData.partnerId, 10);
    if (isNaN(partnerId)) {
      return NextResponse.json(
        { success: false, error: "有効な取引先ID (partnerId) を指定してください。" },
        { status: 400 }
      );
    }

    const totalAmount = Number(orderData.totalAmount) || 0;
    const orderDate = orderData.orderDate ? new Date(orderData.orderDate) : new Date();
    const rawItems = orderData.items || orderData.orderItems || [];
    const userId = body.userId ? String(body.userId) : "SYSTEM";

    // 1. トランザクション処理
    const result = await prisma.$transaction(async (tx) => {
      // 1-1. 取引先(Partner)の存在確認（論理削除除外）
      const partner = await tx.partner.findFirst({
        where: { id: partnerId, deletedAt: null },
      });
      if (!partner) {
        throw new Error(`取引先ID: ${partnerId} が見つからないか、削除されています。`);
      }

      // 1-2. 発注番号（orderNumber）の重複検証（論理削除除外）
      const existingOrder = await tx.order.findFirst({
        where: { orderNumber: orderNumber.trim(), deletedAt: null },
      });
      if (existingOrder) {
        throw new Error(`発注番号「${orderNumber}」は既に登録されています。`);
      }

      // 1-3. PdfImport レコードの取得または作成
      let pdfImportId: number | null = null;
      if (body.pdfImportId) {
        const existingPdf = await tx.pdfImport.findFirst({
          where: { id: Number(body.pdfImportId), deletedAt: null },
        });
        if (existingPdf) {
          pdfImportId = existingPdf.id;
        }
      }

      if (!pdfImportId && (pdfImportData.fileName || pdfImportData.fileUrl)) {
        const createdPdf = await tx.pdfImport.create({
          data: {
            fileName: pdfImportData.fileName || "unknown.pdf",
            fileUrl: pdfImportData.fileUrl || "/uploads/unknown.pdf",
            rawText: pdfImportData.rawText || null,
            parsedData: pdfImportData.parsedData || null,
            status: "PROCESSED",
          },
        });
        pdfImportId = createdPdf.id;
      }

      // 1-4. Order レコードの作成
      const order = await tx.order.create({
        data: {
          orderNumber: orderNumber.trim(),
          partnerId,
          pdfImportId,
          totalAmount,
          status: "OPEN",
          orderDate,
        },
      });

      // 1-5. OrderItem レコードの作成（deliveredQty = 0）
      const createdItems = [];
      for (const item of rawItems) {
        const itemName = String(item.itemName || "品名未設定");
        const quantity = Number(item.quantity) || 1;
        const unitPrice = Number(item.unitPrice) || 0;

        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            itemName,
            quantity,
            unitPrice,
            deliveredQty: 0,
          },
        });
        createdItems.push(orderItem);
      }

      // 1-6. Antigravity要件: 不変監査ログ (AuditLog) の追記
      await tx.auditLog.create({
        data: {
          entityName: "Order",
          entityId: order.id,
          action: "PDF_IMPORT_ORDER_CREATE",
          diff: {
            orderNumber: order.orderNumber,
            partnerId,
            pdfImportId,
            totalAmount,
            itemsCount: createdItems.length,
            items: createdItems.map((i) => ({
              id: i.id,
              itemName: i.itemName,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            })),
          },
          userId,
        },
      });

      return {
        ...order,
        pdfImportId,
        orderItems: createdItems,
      };
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "注文生成処理に失敗しました。" },
      { status: 400 }
    );
  }
}
