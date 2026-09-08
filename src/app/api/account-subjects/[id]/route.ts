import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: paramId } = await params;
    const id = Number(paramId);
    const data = await req.json();

    if (!data.name || !data.name.trim()) {
      return NextResponse.json({ error: '勘定科目名は必須です' }, { status: 400 });
    }

    // 重複チェック (自身以外)
    const existing = await prisma.accountSubject.findFirst({
      where: {
        name: data.name.trim(),
        id: { not: id },
        deletedAt: null,
      }
    });

    if (existing) {
      return NextResponse.json({ error: '同名の勘定科目が既に存在します' }, { status: 400 });
    }

    const subject = await prisma.accountSubject.update({
      where: { id },
      data: {
        name: data.name.trim(),
        code: data.code !== undefined ? (data.code?.trim() || null) : undefined,
        isForCash: data.isForCash !== undefined ? Boolean(data.isForCash) : undefined,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
        displayOrder: data.displayOrder !== undefined ? Number(data.displayOrder) : undefined,
        description: data.description !== undefined ? (data.description?.trim() || null) : undefined,
      }
    });

    return NextResponse.json(subject);
  } catch (error: any) {
    console.error('Failed to update account subject:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update account subject' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: paramId } = await params;
    const id = Number(paramId);

    // 論理削除
    await prisma.accountSubject.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete account subject:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete account subject' }, { status: 500 });
  }
}
