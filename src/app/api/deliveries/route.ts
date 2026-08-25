import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateNextSequence } from '@/lib/sequence';

export async function GET() {
  try {
    const deliveries = await prisma.delivery.findMany({
      include: {
        project: {
          include: {
            partner: true
          }
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    const mapped = deliveries.map(d => ({
      ...d,
      partner: d.project?.partner
    }));
    
    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // 見積書から納品書を生成する場合のデータ構築
    const deliveryNo = await generateNextSequence('DELIVERY', new Date(data.deliveryDate));

    // data.items は見積明細配列が渡される想定
    const items = data.items.map((item: any) => ({
      itemName: item.itemName,
      quantity: Number(item.quantity),
      unit: item.unit,
      unitPrice: Number(item.unitPrice),
      amount: Number(item.amount || (Number(item.quantity) * Number(item.unitPrice))),
    }));

    const result = await prisma.$transaction(async (tx) => {
      // 案件のステータスを更新
      await tx.project.update({
        where: { id: Number(data.projectId) },
        data: { status: '納品済' }
      });

      // 納品レコードを作成
      const delivery = await tx.delivery.create({
        data: {
          deliveryNo,
          projectId: Number(data.projectId),
          deliveryDate: new Date(data.deliveryDate),
          expectedPayDate: data.expectedPayDate ? new Date(data.expectedPayDate) : null,
          subtotal: Number(data.subtotal),
          tax: Number(data.tax),
          totalAmount: Number(data.totalAmount),
          items: {
            create: items
          }
        },
        include: {
          items: true,
          project: true,
        }
      });

      return delivery;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating delivery:', error);
    return NextResponse.json({ error: 'Failed to create delivery' }, { status: 500 });
  }
}
