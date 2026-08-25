import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Assuming you have a global prisma instance in src/lib/prisma.ts

export async function POST(req: Request) {
  try {
    const { orderId, deliveryDate, items, userId } = await req.json();

    const parsedOrderId = parseInt(orderId);
    if (isNaN(parsedOrderId)) {
      throw new Error("無効な orderId です。");
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. 対象の注文と明細を取得（論理削除除外）
      const order = await tx.order.findFirst({
        where: { id: parsedOrderId, deletedAt: null },
        include: { orderItems: { where: { deletedAt: null } } },
      });

      if (!order) {
        throw new Error("対象の注文が見つかりません。");
      }

      // 2. 納品番号の採番
      const deliveryNumber = `DEL-${Date.now()}`;

      // 3. 分納データの作成
      const delivery = await tx.delivery.create({
        data: {
          deliveryNo: deliveryNumber,
          orderId: parsedOrderId,
          deliveryDate: new Date(deliveryDate),
          status: "DELIVERED",
        },
      });

      // 4. 明細ごとの残数チェックと更新
      for (const item of items) {
        const parsedOrderItemId = parseInt(item.orderItemId);
        if (isNaN(parsedOrderItemId)) throw new Error("無効な orderItemId です。");

        const orderItem = order.orderItems.find((oi) => oi.id === parsedOrderItemId);
        if (!orderItem) throw new Error(`明細ID: ${item.orderItemId} が存在しません。`);

        const remainingQty = orderItem.quantity - orderItem.deliveredQty;
        if (item.quantity > remainingQty) {
          throw new Error(`明細「${orderItem.itemName}」の納品数量(${item.quantity})が残数(${remainingQty})を超えています。`);
        }

        // 分納明細作成
        await tx.deliveryItem.create({
          data: {
            deliveryId: delivery.id,
            orderItemId: parsedOrderItemId,
            quantity: item.quantity,
          },
        });

        // 発注明細の納品済数を加算
        await tx.orderItem.update({
          where: { id: parsedOrderItemId },
          data: { deliveredQty: { increment: item.quantity } },
        });
      }

      // 5. 注文全体のステータス更新判定
      const updatedOrderItems = await tx.orderItem.findMany({
        where: { orderId: parsedOrderId, deletedAt: null },
      });
      const isAllCompleted = updatedOrderItems.every((oi) => oi.deliveredQty >= oi.quantity);

      await tx.order.update({
        where: { id: parsedOrderId },
        data: {
          status: isAllCompleted ? "COMPLETED" : "PARTIALLY_DELIVERED",
        },
      });

      // 6. Antigravity: 監査ログ記録
      await tx.auditLog.create({
        data: {
          entityName: "Order",
          entityId: parsedOrderId,
          action: "SPLIT_DELIVERY",
          diff: { deliveryId: delivery.id, deliveryNumber, items },
          userId: userId ? userId.toString() : "SYSTEM",
        },
      });

      return delivery;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
