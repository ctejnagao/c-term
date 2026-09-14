import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: '無効なIDです' }, { status: 400 });
    }

    const current = await prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!current) {
      return NextResponse.json({ error: '発注データが見つかりません' }, { status: 404 });
    }

    const nextReconciled = !current.isReconciled;
    const nextStatus = nextReconciled ? '支払済' : '手配済';
    const nextReconciledAt = nextReconciled ? new Date() : null;

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.purchaseOrder.update({
        where: { id },
        data: {
          isReconciled: nextReconciled,
          reconciledAt: nextReconciledAt,
          status: nextStatus,
        },
      });

      await tx.auditLog.create({
        data: {
          entityName: 'PurchaseOrder',
          entityId: id,
          action: nextReconciled ? 'PAYMENT_RECONCILED' : 'PAYMENT_UNRECONCILED',
          diff: {
            previousStatus: current.status,
            newStatus: nextStatus,
            isReconciled: nextReconciled,
          },
          userId: 'MANUAL_OPERATOR',
        },
      });

      return res;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error toggling reconcile status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
