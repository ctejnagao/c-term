import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const inventoryId = parseInt(id, 10);
    const body = await request.json();

    const {
      toLocation,
      quantity = 1,
      date,
      handler,
      remarks,
    } = body;

    if (!toLocation) {
      return NextResponse.json(
        { success: false, error: "移動先場所を指定してください。" },
        { status: 400 }
      );
    }

    const item = await prisma.consignedInventory.findUnique({
      where: { id: inventoryId },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: "在庫データが見つかりません。" },
        { status: 404 }
      );
    }

    const moveQty = parseInt(quantity, 10);
    if (isNaN(moveQty) || moveQty <= 0) {
      return NextResponse.json(
        { success: false, error: "移動台数は1以上で指定してください。" },
        { status: 400 }
      );
    }

    if (moveQty > item.currentQty) {
      return NextResponse.json(
        { success: false, error: `移動可能台数（${item.currentQty}台）を超えています。` },
        { status: 400 }
      );
    }

    const fromLocation = item.location;

    // 全台移動の場合：既存レコードの location を更新
    if (moveQty === item.currentQty) {
      const [updatedInventory, log] = await prisma.$transaction([
        prisma.consignedInventory.update({
          where: { id: inventoryId },
          data: {
            location: toLocation,
          },
        }),
        prisma.consignedInventoryLog.create({
          data: {
            inventoryId,
            actionType: "TRANSFER",
            quantity: moveQty,
            date: date ? new Date(date) : new Date(),
            fromLocation,
            toLocation,
            purpose: "拠点間移動・保管場所変更",
            handler: handler || "社内担当",
            remarks: remarks || null,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        item: updatedInventory,
        log,
      });
    } else {
      // 一部台数移動の場合：移動元レコードを減数し、移動先に新レコードを作成
      const newFromQty = item.currentQty - moveQty;
      const count = await prisma.consignedInventory.count();
      const newItemCode = `${item.itemCode || "JCC-PC"}-T${count + 1}`;

      const [updatedFrom, newItem, log] = await prisma.$transaction([
        prisma.consignedInventory.update({
          where: { id: inventoryId },
          data: {
            currentQty: newFromQty,
            initialQty: item.initialQty - moveQty < newFromQty ? newFromQty : item.initialQty - moveQty,
          },
        }),
        prisma.consignedInventory.create({
          data: {
            itemCode: newItemCode,
            partnerId: item.partnerId,
            itemName: item.itemName,
            serialNumber: item.serialNumber,
            os: item.os,
            spec: item.spec,
            purchaseDate: item.purchaseDate,
            inboundDate: item.inboundDate,
            location: toLocation,
            initialQty: moveQty,
            currentQty: moveQty,
            shippedQty: 0,
            status: "STORED",
            remarks: `移動元（${fromLocation}）より一部移動: ${remarks || ""}`,
          },
        }),
        prisma.consignedInventoryLog.create({
          data: {
            inventoryId,
            actionType: "TRANSFER",
            quantity: moveQty,
            date: date ? new Date(date) : new Date(),
            fromLocation,
            toLocation,
            purpose: "一部台数の拠点間移動",
            handler: handler || "社内担当",
            remarks: remarks || null,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        item: updatedFrom,
        newItem,
        log,
      });
    }
  } catch (error: any) {
    console.error("POST /api/inventory/[id]/transfer error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to transfer inventory" },
      { status: 500 }
    );
  }
}
