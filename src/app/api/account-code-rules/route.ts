import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const rules = await prisma.accountCodeRule.findMany({
      orderBy: [
        { priority: 'desc' },
        { id: 'asc' }
      ]
    });
    return NextResponse.json(rules);
  } catch (error) {
    console.error('Failed to fetch account code rules:', error);
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, keyword, accountCode, accountName, subAccountCode, subAccountName, taxType, priority, isActive } = body;

    if (!keyword || !keyword.trim()) {
      return NextResponse.json({ error: 'キーワードは必須です' }, { status: 400 });
    }
    if (!accountName || !accountName.trim()) {
      return NextResponse.json({ error: '勘定科目名は必須です' }, { status: 400 });
    }

    if (id) {
      const updated = await prisma.accountCodeRule.update({
        where: { id: Number(id) },
        data: {
          keyword: keyword.trim(),
          accountCode: accountCode?.trim() || null,
          accountName: accountName.trim(),
          subAccountCode: subAccountCode?.trim() || null,
          subAccountName: subAccountName?.trim() || null,
          taxType: taxType || '課対仕入10%',
          priority: Number(priority) || 0,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        }
      });
      return NextResponse.json(updated);
    } else {
      const created = await prisma.accountCodeRule.create({
        data: {
          keyword: keyword.trim(),
          accountCode: accountCode?.trim() || null,
          accountName: accountName.trim(),
          subAccountCode: subAccountCode?.trim() || null,
          subAccountName: subAccountName?.trim() || null,
          taxType: taxType || '課対仕入10%',
          priority: Number(priority) || 0,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        }
      });
      return NextResponse.json(created);
    }
  } catch (error: any) {
    console.error('Failed to save account code rule:', error);
    return NextResponse.json({ error: error.message || 'Failed to save rule' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await prisma.accountCodeRule.delete({
      where: { id: Number(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete rule:', error);
    return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
  }
}
