import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const data = await req.json();
    const { id: paramId } = await params;
    const id = Number(paramId);
    
    const memo = await prisma.systemMemo.update({
      where: { id },
      data: {
        title: data.title,
        category: data.category,
        content: data.content,
        tags: data.tags,
      }
    });
    return NextResponse.json(memo);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update memo' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: paramId } = await params;
    const id = Number(paramId);
    await prisma.systemMemo.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete memo' }, { status: 500 });
  }
}
