import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const contracts = await prisma.recurringContract.findMany({
      where: { deletedAt: null },
      include: {
        partner: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(contracts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
