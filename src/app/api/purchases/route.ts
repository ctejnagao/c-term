import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generatePurchaseOrderSequence } from '@/lib/sequence';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');

    const where: any = {
      deletedAt: null,
    };

    if (projectId) where.projectId = Number(projectId);
    if (supplierId) where.supplierId = Number(supplierId);
    if (status) where.status = status;

    const purchases = await prisma.purchaseOrder.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            projectCode: true,
            name: true,
            partner: {
              select: {
                id: true,
                name: true,
                shortName: true,
              },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            shortName: true,
            tel: true,
            address: true,
          },
        },
        items: {
          where: { deletedAt: null },
          orderBy: { itemOrder: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(purchases);
  } catch (error: any) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      projectId,
      supplierId,
      supplierEstimateNo,
      orderDate,
      deliveryDate,
      paymentDate,
      content,
      remarks,
      items,
    } = body;

    if (!projectId || !supplierId || !content) {
      return NextResponse.json(
        { error: '案件、仕入先、および件名・注文内容は必須です。' },
        { status: 400 }
      );
    }

    const orderDateObj = orderDate ? new Date(orderDate) : new Date();
    const deliveryDateObj = deliveryDate ? new Date(deliveryDate) : null;
    const paymentDateObj = paymentDate ? new Date(paymentDate) : null;

    // 自動採番 (26-01120〜)
    const orderNo = await generatePurchaseOrderSequence(orderDateObj);

    // 明細の金額計算
    let subtotal = 0;
    const itemsData = (items && Array.isArray(items) && items.length > 0)
      ? items.map((it: any, index: number) => {
          const qty = Number(it.quantity) || 1;
          const unitPrice = Number(it.unitPrice) || 0;
          const amount = it.amount !== undefined ? Number(it.amount) : qty * unitPrice;
          subtotal += amount;
          return {
            itemOrder: index + 1,
            itemName: it.itemName || '作業一式',
            quantity: qty,
            unit: it.unit || '式',
            unitPrice: unitPrice,
            amount: amount,
            remarks: it.remarks || null,
          };
        })
      : [
          {
            itemOrder: 1,
            itemName: content,
            quantity: 1,
            unit: '式',
            unitPrice: Number(body.subtotal) || 0,
            amount: Number(body.subtotal) || 0,
            remarks: remarks || null,
          },
        ];

    if (itemsData.length === 1 && subtotal === 0 && body.subtotal) {
      subtotal = Number(body.subtotal);
    }

    const tax = Math.floor(subtotal * 0.1);
    const totalAmount = subtotal + tax;

    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchaseOrder.create({
        data: {
          orderNo,
          projectId: Number(projectId),
          supplierId: Number(supplierId),
          supplierEstimateNo: supplierEstimateNo ? String(supplierEstimateNo).trim() : null,
          orderDate: orderDateObj,
          deliveryDate: deliveryDateObj,
          paymentDate: paymentDateObj,
          subtotal,
          tax,
          totalAmount,
          content,
          remarks: remarks || null,
          status: '手配済',
          isReconciled: false,
          items: {
            create: itemsData,
          },
        },
        include: {
          project: true,
          supplier: true,
          items: true,
        },
      });

      // 監査ログ
      await tx.auditLog.create({
        data: {
          entityName: 'PurchaseOrder',
          entityId: created.id,
          action: 'CREATE',
          diff: {
            orderNo: created.orderNo,
            supplierId: created.supplierId,
            supplierEstimateNo: created.supplierEstimateNo,
            totalAmount: created.totalAmount.toString(),
            status: '手配済',
          },
          userId: 'SYSTEM',
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, data: purchase }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
