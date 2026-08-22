import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const acceptances = await prisma.orderAcceptance.findMany({
      include: {
        project: {
          include: {
            partner: true
          }
        },
        estimate: {
          include: {
            items: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // 印刷ページ用にデータをマッピング
    const mapped = acceptances.map(a => {
      const subtotal = a.estimate ? a.estimate.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0) : 0;
      const tax = Math.floor(subtotal * 0.1);
      
      return {
        id: a.id,
        acceptanceNo: a.acceptanceNo,
        acceptDate: a.acceptDate,
        totalAmount: a.totalAmount,
        project: {
          ...a.project,
        },
        partner: a.project.partner,
        items: a.estimate ? a.estimate.items : [],
        subtotal: subtotal,
        tax: tax,
        validUntil: a.estimate?.validUntil,
        paymentTerm: a.estimate?.paymentTerm,
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error fetching order acceptances:', error);
    return NextResponse.json({ error: 'Failed to fetch order acceptances' }, { status: 500 });
  }
}
