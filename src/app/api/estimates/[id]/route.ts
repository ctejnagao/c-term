import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    const estimate = await prisma.estimate.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            orderAccepts: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        },
        partner: true,
        items: {
          orderBy: { itemOrder: 'asc' }
        }
      }
    });

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    return NextResponse.json(estimate);
  } catch (error) {
    console.error('Error fetching estimate:', error);
    return NextResponse.json({ error: 'Failed to fetch estimate' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    await prisma.estimate.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting estimate:', error);
    return NextResponse.json({ error: 'Failed to delete estimate' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    const data = await request.json();

    let subtotal = 0;
    let purchaseCost = 0;
    const items = data.items.map((item: any, index: number) => {
      const amount = Number(item.quantity) * Number(item.unitPrice);
      subtotal += amount;
      
      const itemCost = item.costPrice ? Number(item.quantity) * Number(item.costPrice) : 0;
      purchaseCost += itemCost;

      return {
        itemOrder: index + 1,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        amount,
        costPrice: item.costPrice || null,
      };
    });

    const tax = Math.floor(subtotal * 0.1);
    const totalAmount = subtotal + tax;
    const grossProfit = subtotal - purchaseCost;

    const estimate = await prisma.$transaction(async (tx) => {
      await tx.estimateItem.deleteMany({
        where: { estimateId: id }
      });
      
      if (data.leadStaff !== undefined) {
        await tx.project.update({
          where: { id: Number(data.projectId) },
          data: { leadStaff: data.leadStaff }
        });
      }

      return await tx.estimate.update({
        where: { id },
        data: {
          projectId: Number(data.projectId),
          partnerId: Number(data.partnerId),
          issueDate: new Date(data.issueDate),
          subtotal,
          tax,
          totalAmount,
          purchaseCost,
          grossProfit,
          validUntil: data.validUntil || '二ケ月',
          paymentTerm: data.paymentTerm || '別途御相談',
          items: {
            create: items
          }
        },
        include: {
          items: true,
          project: true,
          partner: true,
        }
      });
    });

    return NextResponse.json(estimate);
  } catch (error) {
    console.error('Error updating estimate:', error);
    return NextResponse.json({ error: 'Failed to update estimate' }, { status: 500 });
  }
}
