import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: '無効なIDです' }, { status: 400 });
    }

    const purchase = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            partner: true,
          },
        },
        supplier: true,
        items: {
          where: { deletedAt: null },
          orderBy: { itemOrder: 'asc' },
        },
      },
    });

    if (!purchase || purchase.deletedAt) {
      return NextResponse.json({ error: '発注データが見つかりません' }, { status: 404 });
    }

    return NextResponse.json(purchase);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = Number(resolvedParams.id);

    await prisma.purchaseOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
