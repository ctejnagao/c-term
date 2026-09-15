import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const inventoryId = parseInt(id, 10);

    const item = await prisma.consignedInventory.findUnique({
      where: { id: inventoryId },
      include: {
        partner: true,
        logs: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    console.error("GET /api/inventory/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch inventory details" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const inventoryId = parseInt(id, 10);
    const body = await request.json();

    const {
      itemName,
      itemCode,
      serialNumber,
      os,
      spec,
      purchaseDate,
      inboundDate,
      location,
      currentQty,
      initialQty,
      status,
      remarks,
    } = body;

    const existing = await prisma.consignedInventory.findUnique({
      where: { id: inventoryId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.consignedInventory.update({
      where: { id: inventoryId },
      data: {
        itemName: itemName !== undefined ? itemName : existing.itemName,
        itemCode: itemCode !== undefined ? itemCode : existing.itemCode,
        serialNumber: serialNumber !== undefined ? serialNumber : existing.serialNumber,
        os: os !== undefined ? os : existing.os,
        spec: spec !== undefined ? spec : existing.spec,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : (purchaseDate === null ? null : existing.purchaseDate),
        inboundDate: inboundDate ? new Date(inboundDate) : existing.inboundDate,
        location: location !== undefined ? location : existing.location,
        currentQty: currentQty !== undefined ? parseInt(currentQty, 10) : existing.currentQty,
        initialQty: initialQty !== undefined ? parseInt(initialQty, 10) : existing.initialQty,
        status: status !== undefined ? status : existing.status,
        remarks: remarks !== undefined ? remarks : existing.remarks,
      },
      include: {
        logs: {
          orderBy: { date: "desc" },
        },
      },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    console.error("PUT /api/inventory/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update inventory item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const inventoryId = parseInt(id, 10);

    // 論理削除
    await prisma.consignedInventory.update({
      where: { id: inventoryId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/inventory/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete inventory item" },
      { status: 500 }
    );
  }
}
