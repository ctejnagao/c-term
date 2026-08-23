import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const data = await req.json();
    const { id: paramId } = await params;
    const id = Number(paramId);
    
    const transaction = await prisma.cashTransaction.update({
      where: { id },
      data: {
        transactionDate: new Date(data.transactionDate),
        type: data.type,
        employeeId: Number(data.employeeId),
        projectId: data.projectId ? Number(data.projectId) : null,
        categoryType: data.categoryType,
        description: data.description,
        amount: Number(data.amount),
        accountSubject: data.accountSubject,
        taxCategory: data.taxCategory,
      },
      include: {
        employee: true,
        project: true,
      }
    });
    return NextResponse.json(transaction);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update cash transaction' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: paramId } = await params;
    const id = Number(paramId);
    await prisma.cashTransaction.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete cash transaction' }, { status: 500 });
  }
}
