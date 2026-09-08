import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const forCash = searchParams.get('forCash');
    const activeOnly = searchParams.get('activeOnly');

    const where: any = {
      deletedAt: null,
    };

    if (forCash === 'true') {
      where.isForCash = true;
      where.isActive = true;
    } else if (activeOnly === 'true') {
      where.isActive = true;
    }

    const subjects = await prisma.accountSubject.findMany({
      where,
      orderBy: [
        { displayOrder: 'asc' },
        { id: 'asc' }
      ]
    });

    return NextResponse.json(subjects);
  } catch (error) {
    console.error('Failed to fetch account subjects:', error);
    return NextResponse.json({ error: 'Failed to fetch account subjects' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    if (!data.name || !data.name.trim()) {
      return NextResponse.json({ error: '勘定科目名は必須です' }, { status: 400 });
    }

    // 重複チェック
    const existing = await prisma.accountSubject.findFirst({
      where: {
        name: data.name.trim(),
        deletedAt: null,
      }
    });

    if (existing) {
      return NextResponse.json({ error: '同名の勘定科目が既に存在します' }, { status: 400 });
    }

    const subject = await prisma.accountSubject.create({
      data: {
        name: data.name.trim(),
        code: data.code?.trim() || null,
        isForCash: data.isForCash !== undefined ? Boolean(data.isForCash) : true,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        displayOrder: data.displayOrder ? Number(data.displayOrder) : 0,
        description: data.description?.trim() || null,
      }
    });

    return NextResponse.json(subject);
  } catch (error: any) {
    console.error('Failed to create account subject:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create account subject' }, { status: 500 });
  }
}
