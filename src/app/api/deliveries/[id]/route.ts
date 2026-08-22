import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            partner: true,
          }
        },
        items: true
      }
    });

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    return NextResponse.json(delivery);
  } catch (error) {
    console.error('Error fetching delivery:', error);
    return NextResponse.json({ error: 'Failed to fetch delivery' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    await prisma.delivery.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting delivery:', error);
    return NextResponse.json({ error: 'Failed to delete delivery' }, { status: 500 });
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
    const items = data.items.map((item: any) => {
      const amount = Number(item.quantity) * Number(item.unitPrice);
      subtotal += amount;

      return {
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        amount,
      };
    });

    const tax = Math.floor(subtotal * 0.1);
    const totalAmount = subtotal + tax;

    const delivery = await prisma.$transaction(async (tx) => {
      await tx.deliveryItem.deleteMany({
        where: { deliveryId: id }
      });
      
      if (data.leadStaff !== undefined && data.projectId) {
        await tx.project.update({
          where: { id: Number(data.projectId) },
          data: { leadStaff: data.leadStaff }
        });
      }

      return await tx.delivery.update({
        where: { id },
        data: {
          deliveryDate: new Date(data.deliveryDate),
          expectedPayDate: data.expectedPayDate ? new Date(data.expectedPayDate) : null,
          subtotal,
          tax,
          totalAmount,
          items: {
            create: items
          }
        },
        include: {
          items: true,
          project: true,
        }
      });
    });

    return NextResponse.json(delivery);
  } catch (error) {
    console.error('Error updating delivery:', error);
    return NextResponse.json({ error: 'Failed to update delivery' }, { status: 500 });
  }
}
