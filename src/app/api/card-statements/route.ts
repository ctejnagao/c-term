import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const billingMonth = searchParams.get('billingMonth');
    const id = searchParams.get('id');

    if (id) {
      const statement = await prisma.cardStatement.findUnique({
        where: { id: Number(id) },
        include: {
          bankTransactions: true,
        }
      });
      return NextResponse.json(statement);
    }

    const where: any = { deletedAt: null };
    if (billingMonth) {
      where.billingMonth = billingMonth;
    }

    const statements = await prisma.cardStatement.findMany({
      where,
      include: {
        bankTransactions: true,
      },
      orderBy: [
        { paymentDate: 'desc' },
        { id: 'desc' }
      ]
    });

    return NextResponse.json(statements);
  } catch (error) {
    console.error('Failed to fetch card statements:', error);
    return NextResponse.json({ error: 'Failed to fetch card statements' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, cardName, cardHolder, billingMonth, paymentDate, totalAmount, status, memo, details } = body;

    if (!billingMonth || !paymentDate || totalAmount === undefined) {
      return NextResponse.json({ error: '請求年月、振替日、合計金額は必須です' }, { status: 400 });
    }

    if (id) {
      const updated = await prisma.cardStatement.update({
        where: { id: Number(id) },
        data: {
          cardName: cardName || '楽天ビジネスカード',
          cardHolder: cardHolder || null,
          billingMonth,
          paymentDate: new Date(paymentDate),
          totalAmount: Number(totalAmount),
          status: status || 'CONFIRMED',
          memo: memo || null,
          details: details || null,
        }
      });
      return NextResponse.json(updated);
    } else {
      const created = await prisma.cardStatement.create({
        data: {
          cardName: cardName || '楽天ビジネスカード',
          cardHolder: cardHolder || null,
          billingMonth,
          paymentDate: new Date(paymentDate),
          totalAmount: Number(totalAmount),
          status: status || 'CONFIRMED',
          memo: memo || null,
          details: details || null,
        }
      });
      return NextResponse.json(created);
    }
  } catch (error: any) {
    console.error('Failed to save card statement:', error);
    return NextResponse.json({ error: error.message || 'Failed to save card statement' }, { status: 500 });
  }
}
