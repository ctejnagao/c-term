import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const yearMonth = searchParams.get('yearMonth');

    if (!yearMonth) {
      return NextResponse.json({ error: 'yearMonth parameter is required' }, { status: 400 });
    }

    let balance = await prisma.cashMonthlyBalance.findUnique({
      where: { yearMonth },
    });

    if (!balance) {
      // Default to 0 if not found
      balance = {
        id: 0,
        yearMonth,
        carryOverAmount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      };
    }

    return NextResponse.json(balance);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch cash balance' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { yearMonth, carryOverAmount } = data;

    if (!yearMonth || carryOverAmount === undefined) {
      return NextResponse.json({ error: 'yearMonth and carryOverAmount are required' }, { status: 400 });
    }

    const balance = await prisma.cashMonthlyBalance.upsert({
      where: { yearMonth },
      update: { carryOverAmount: Number(carryOverAmount) },
      create: {
        yearMonth,
        carryOverAmount: Number(carryOverAmount),
      }
    });

    return NextResponse.json(balance);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to save cash balance' }, { status: 500 });
  }
}
