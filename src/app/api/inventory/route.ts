import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const location = searchParams.get("location") || "";
    const status = searchParams.get("status") || "";

    // 検索条件
    const where: any = {
      deletedAt: null,
    };

    if (location && location !== "ALL") {
      where.location = location;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (query) {
      where.OR = [
        { itemName: { contains: query, mode: "insensitive" } },
        { itemCode: { contains: query, mode: "insensitive" } },
        { serialNumber: { contains: query, mode: "insensitive" } },
        { os: { contains: query, mode: "insensitive" } },
        { spec: { contains: query, mode: "insensitive" } },
        { remarks: { contains: query, mode: "insensitive" } },
      ];
    }

    // 全件取得 (KPI集計用にも使用)
    const allActiveItems = await prisma.consignedInventory.findMany({
      where: { deletedAt: null },
      include: {
        partner: true,
        logs: {
          orderBy: { date: "desc" },
          take: 5,
        },
      },
      orderBy: [
        { status: "asc" },
        { inboundDate: "desc" },
        { createdAt: "desc" },
      ],
    });

    // KPIサマリー集計
    let totalInitialQty = 0;
    let totalCurrentQty = 0;
    let ourLocationQty = 0;
    let hikariLocationQty = 0;
    let totalShippedQty = 0;

    allActiveItems.forEach((item) => {
      totalInitialQty += item.initialQty;
      totalCurrentQty += item.currentQty;
      totalShippedQty += item.shippedQty;

      if (item.location.includes("弊社") || item.location.includes("自社") || item.location.includes("コムテック")) {
        ourLocationQty += item.currentQty;
      } else if (item.location.includes("光システム")) {
        hikariLocationQty += item.currentQty;
      }
    });

    // フィルタ適用アイテム
    let filteredItems = allActiveItems;
    if (location && location !== "ALL") {
      filteredItems = filteredItems.filter((i) => i.location === location);
    }
    if (status && status !== "ALL") {
      filteredItems = filteredItems.filter((i) => i.status === status);
    }
    if (query) {
      const q = query.toLowerCase();
      filteredItems = filteredItems.filter(
        (i) =>
          i.itemName.toLowerCase().includes(q) ||
          (i.itemCode && i.itemCode.toLowerCase().includes(q)) ||
          (i.serialNumber && i.serialNumber.toLowerCase().includes(q)) ||
          (i.os && i.os.toLowerCase().includes(q)) ||
          (i.spec && i.spec.toLowerCase().includes(q)) ||
          (i.remarks && i.remarks.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalInitialQty,
        totalCurrentQty,
        ourLocationQty,
        hikariLocationQty,
        totalShippedQty,
        itemTypesCount: allActiveItems.length,
      },
      items: filteredItems,
    });
  } catch (error: any) {
    console.error("GET /api/inventory error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      itemName,
      itemCode,
      serialNumber,
      os,
      spec,
      purchaseDate,
      inboundDate,
      location = "弊社",
      initialQty = 1,
      remarks,
    } = body;

    if (!itemName) {
      return NextResponse.json(
        { success: false, error: "品名・モデル名は必須です。" },
        { status: 400 }
      );
    }

    const qty = parseInt(initialQty, 10) || 1;

    // 日本カラリングのPartnerを取得またはフォールバック
    let partner = await prisma.partner.findFirst({
      where: {
        OR: [
          { name: { contains: "日本カラリング" } },
          { shortName: { contains: "JCC" } },
        ],
      },
    });

    if (!partner) {
      // 存在しなければ作成
      partner = await prisma.partner.create({
        data: {
          name: "日本カラリング株式会社",
          shortName: "JCC",
          isCustomer: true,
        },
      });
    }

    // 自動採番 itemCode が無ければ生成
    let finalItemCode = itemCode;
    if (!finalItemCode) {
      const count = await prisma.consignedInventory.count();
      finalItemCode = `JCC-PC-${String(count + 1).padStart(3, "0")}`;
    }

    const newInventory = await prisma.consignedInventory.create({
      data: {
        itemCode: finalItemCode,
        partnerId: partner.id,
        itemName,
        serialNumber: serialNumber || null,
        os: os || null,
        spec: spec || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        inboundDate: inboundDate ? new Date(inboundDate) : new Date(),
        location,
        initialQty: qty,
        currentQty: qty,
        shippedQty: 0,
        status: "STORED",
        remarks: remarks || null,
        logs: {
          create: {
            actionType: "INBOUND",
            quantity: qty,
            date: inboundDate ? new Date(inboundDate) : new Date(),
            toLocation: location,
            purpose: "受託入庫・保管開始",
            handler: "社内担当",
            remarks: remarks || "初期登録",
          },
        },
      },
      include: {
        logs: true,
        partner: true,
      },
    });

    return NextResponse.json({ success: true, item: newInventory });
  } catch (error: any) {
    console.error("POST /api/inventory error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create inventory item" },
      { status: 500 }
    );
  }
}
