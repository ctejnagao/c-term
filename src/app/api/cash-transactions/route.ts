import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const yearMonth = searchParams.get('yearMonth');

    let whereClause = {};
    if (yearMonth) {
      // Create a date range for the month
      // e.g. "2026-08" -> start: 2026-08-01, end: 2026-09-01
      const [year, month] = yearMonth.split('-');
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 1);
      
      whereClause = {
        transactionDate: {
          gte: startDate,
          lt: endDate,
        }
      };
    }

    const transactions = await prisma.cashTransaction.findMany({
      where: whereClause,
      include: {
        employee: true,
        project: true,
      },
      orderBy: [
        { transactionDate: 'asc' },
        { id: 'asc' }
      ]
    });
    return NextResponse.json(transactions);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch cash transactions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const transaction = await prisma.cashTransaction.create({
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
    return NextResponse.json({ error: 'Failed to create cash transaction' }, { status: 500 });
  }
}
