import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const project = await prisma.project.findUnique({
      where: { id: Number(resolvedParams.id) },
      include: {
        partner: true,
        estimates: { orderBy: { createdAt: 'desc' } },
        deliveries: { orderBy: { createdAt: 'desc' } },
        invoices: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const data = await req.json();
    const projectId = Number(resolvedParams.id);
    
    // 入金予定日の処理
    let expectedPayDate = data.expectedPayDate !== undefined
      ? (data.expectedPayDate ? new Date(data.expectedPayDate) : null)
      : undefined;

    const project = await prisma.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id: projectId },
        data: {
          name: data.name !== undefined ? data.name : undefined,
          status: data.status !== undefined ? data.status : undefined,
          leadStaff: data.leadStaff !== undefined ? data.leadStaff : undefined,
          customerDepartment: data.customerDepartment !== undefined ? data.customerDepartment : undefined,
          customerStaff: data.customerStaff !== undefined ? data.customerStaff : undefined,
          clientOrderNo: data.clientOrderNo !== undefined ? data.clientOrderNo : undefined,
          approximateAmount: data.approximateAmount !== undefined ? (data.approximateAmount ? Number(data.approximateAmount) : null) : undefined,
          ...(expectedPayDate !== undefined ? { expectedPayDate } : {}),
        }
      });

      // 紐づくInvoiceが存在する場合、ステータスを同期
      if (data.status) {
        let invPaymentStatus: string | null = null;
        if (data.status === '入金済') invPaymentStatus = '入金済';
        else if (data.status === '入金予定') invPaymentStatus = '入金予定';
        else if (data.status === '請求済' || data.status === '納品済') invPaymentStatus = '未入金';

        if (invPaymentStatus) {
          await tx.invoice.updateMany({
            where: { projectId: projectId, deletedAt: null },
            data: {
              paymentStatus: invPaymentStatus,
              ...(invPaymentStatus === '入金予定' && expectedPayDate ? { paidDate: expectedPayDate } : {}),
              ...(invPaymentStatus === '未入金' ? { paidDate: null, paidAmount: 0 } : {}),
            }
          });
        }
      }

      return updated;
    });
    
    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Update failed:', error);
    return NextResponse.json({ error: 'Failed', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    await prisma.project.delete({
      where: { id: Number(resolvedParams.id) }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete failed:', error);
    return NextResponse.json({ error: 'Failed', details: error.message }, { status: 500 });
  }
}
