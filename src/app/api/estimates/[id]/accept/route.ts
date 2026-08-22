import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateNextSequence } from '@/lib/sequence';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const estimateId = Number(resolvedParams.id);
    const data = await request.json();

    const { orderedAt, clientOrderNo, orderAmount, expectedDeliveryDate, leadStaff } = data;

    // Fetch estimate to get projectId and other defaults
    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
      include: { project: true }
    });

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    }

    const projectId = estimate.projectId;
    const orderDate = orderedAt ? new Date(orderedAt) : new Date();
    const parsedOrderAmount = orderAmount ? Number(orderAmount) : Number(estimate.totalAmount);
    const parsedDeliveryDate = expectedDeliveryDate ? new Date(expectedDeliveryDate) : null;

    // Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Project
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: {
          status: '受注',
          orderedAt: orderDate,
          clientOrderNo: clientOrderNo || null,
          orderAmount: parsedOrderAmount,
          expectedDeliveryDate: parsedDeliveryDate,
          ...(leadStaff ? { leadStaff } : {})
        }
      });

      // 2. Generate Acceptance No
      const acceptanceNo = await generateNextSequence('ORDER_ACCEPT', orderDate);

      // 3. Create OrderAcceptance
      const orderAcceptance = await tx.orderAcceptance.create({
        data: {
          acceptanceNo,
          projectId,
          estimateId,
          acceptDate: orderDate,
          deliveryDate: parsedDeliveryDate,
          totalAmount: parsedOrderAmount,
          staff: leadStaff || null,
        }
      });

      return { updatedProject, orderAcceptance };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error accepting estimate:', error);
    return NextResponse.json({ error: 'Failed to accept estimate' }, { status: 500 });
  }
}
