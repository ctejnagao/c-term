import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const category = searchParams.get('category');

    let whereClause: any = {};
    
    if (query) {
      whereClause.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { tags: { contains: query, mode: 'insensitive' } },
      ];
    }
    
    if (category) {
      whereClause.category = category;
    }

    const memos = await prisma.systemMemo.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
    });
    
    return NextResponse.json(memos);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch memos' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const memo = await prisma.systemMemo.create({
      data: {
        title: data.title,
        category: data.category || 'インフラ',
        content: data.content,
        tags: data.tags || null,
      }
    });
    return NextResponse.json(memo);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create memo' }, { status: 500 });
  }
}
