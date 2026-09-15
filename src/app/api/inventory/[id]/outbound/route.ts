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
      quantity = 1,
      date,
      toLocation,
      purpose,
      handler,
      fromLocation,
      remarks,
    } = body;

    const shipQty = parseInt(quantity, 10);
    if (isNaN(shipQty) || shipQty <= 0) {
      return NextResponse.json(
        { success: false, error: "出庫数は1以上の数値を入力してください。" },
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

    if (item.currentQty < shipQty) {
      return NextResponse.json(
        {
          success: false,
          error: `出庫可能台数（${item.currentQty}台）を超えています。`,
        },
        { status: 400 }
      );
    }

    const newCurrentQty = item.currentQty - shipQty;
    const newShippedQty = item.shippedQty + shipQty;
    const newStatus =
      newCurrentQty === 0
        ? "DEPLETED"
        : newShippedQty > 0
        ? "PARTIALLY_DELIVERED"
        : item.status;

    const actualFromLocation = fromLocation || item.location;

    // トランザクションで在庫更新とログ記録を実行
    const [updatedInventory, log] = await prisma.$transaction([
      prisma.consignedInventory.update({
        where: { id: inventoryId },
        data: {
          currentQty: newCurrentQty,
          shippedQty: newShippedQty,
          status: newStatus,
        },
      }),
      prisma.consignedInventoryLog.create({
        data: {
          inventoryId,
          actionType: "OUTBOUND",
          quantity: shipQty,
          date: date ? new Date(date) : new Date(),
          fromLocation: actualFromLocation,
          toLocation: toLocation || "JCC様現場",
          purpose: purpose || "出庫・障害代替",
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
  } catch (error: any) {
    console.error("POST /api/inventory/[id]/outbound error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process outbound inventory" },
      { status: 500 }
    );
  }
}
