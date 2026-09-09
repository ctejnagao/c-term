import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();
    const category = searchParams.get('category')?.trim();

    const where: any = {};

    if (q) {
      where.OR = [
        { code: { contains: q } },
        { name: { contains: q } },
        { statementItem: { contains: q } },
      ];
    }

    if (category) {
      where.category = category;
    }

    const masters = await prisma.accountMaster.findMany({
      where,
      orderBy: [
        { code: 'asc' },
      ],
      include: {
        rules: {
          select: {
            id: true,
            keyword: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      count: masters.length,
      data: masters,
    });
  } catch (error: any) {
    console.error('Failed to fetch account masters:', error);
    return NextResponse.json({ error: error.message || '科目マスタの取得に失敗しました' }, { status: 500 });
  }
}
