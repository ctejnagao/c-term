import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateNextSequence } from '@/lib/sequence';

export async function GET() {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        project: true,
        partner: true,
        items: true,
      },
      orderBy: { issueDate: 'desc' },
    });
    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const invoiceNo = await generateNextSequence('INVOICE', new Date(data.issueDate));

    const items = data.items.map((item: any) => ({
      itemName: item.itemName,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      amount: item.amount,
    }));

    const result = await prisma.$transaction(async (tx) => {
      // 案件のステータスを更新
      await tx.project.update({
        where: { id: Number(data.projectId) },
        data: { status: '請求済' }
      });

      // 請求書レコードを作成
      const invoice = await tx.invoice.create({
        data: {
          invoiceNo,
          projectId: Number(data.projectId),
          partnerId: Number(data.partnerId),
          issueDate: new Date(data.issueDate),
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
          partner: true,
        }
      });

      return invoice;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    
    const result = await prisma.$transaction(async (tx) => {
      // 入金ステータスや請求書発送日の更新
      const invoice = await tx.invoice.update({
        where: { id: Number(data.id) },
        data: {
          paymentStatus: data.paymentStatus, // 未入金 / 一部入金 / 入金済
          paidAmount: data.paidAmount,
          paidDate: data.paidDate ? new Date(data.paidDate) : null,
          sendDate: data.sendDate ? new Date(data.sendDate) : null,
        }
      });

      // プロジェクト側のステータスも同期する
      if (data.paymentStatus) {
        let newProjectStatus = '請求済';
        if (data.paymentStatus === '入金済') {
          newProjectStatus = '入金済';
        } else if (data.paymentStatus === '入金予定') {
          newProjectStatus = '入金予定';
        }
        await tx.project.update({
          where: { id: invoice.projectId },
          data: { status: newProjectStatus }
        });
      }

      return invoice;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}
