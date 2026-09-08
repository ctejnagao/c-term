import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateNextSequence } from '@/lib/sequence';

export async function GET() {
  try {
    const estimates = await prisma.estimate.findMany({
      include: {
        project: true,
        partner: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(estimates);
  } catch (error) {
    console.error('Error fetching estimates:', error);
    return NextResponse.json({ error: 'Failed to fetch estimates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // 自動採番
    const estimateNo = await generateNextSequence('ESTIMATE', new Date(data.issueDate));

    // 金額計算
    let subtotal = 0;
    let purchaseCost = 0;
    const items = data.items.map((item: any, index: number) => {
      const q = Number(item.quantity) || 0;
      const up = Number(item.unitPrice) || 0;
      const amount = q * up;
      subtotal += amount;
      
      const itemCost = item.costPrice ? q * Number(item.costPrice) : 0;
      purchaseCost += itemCost;

      return {
        itemOrder: index + 1,
        itemName: item.itemName,
        quantity: q,
        unit: item.unit || null,
        unitPrice: up,
        amount,
        costPrice: item.costPrice ? Number(item.costPrice) : null,
      };
    });

    const tax = Math.floor(subtotal * 0.1); // 消費税 10%
    const totalAmount = subtotal + tax;
    const grossProfit = subtotal - purchaseCost;

    const estimate = await prisma.$transaction(async (tx) => {
      const created = await tx.estimate.create({
        data: {
          estimateNo,
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

      // 案件のステータスが「案件」の場合は「見積中」に自動更新
      const project = await tx.project.findUnique({
        where: { id: Number(data.projectId) }
      });
      if (project && project.status === '案件') {
        await tx.project.update({
          where: { id: Number(data.projectId) },
          data: { status: '見積中' }
        });
      }

      return created;
    });
    return NextResponse.json(estimate, { status: 201 });
  } catch (error) {
    console.error('Error creating estimate:', error);
    return NextResponse.json({ error: 'Failed to create estimate' }, { status: 500 });
  }
}
