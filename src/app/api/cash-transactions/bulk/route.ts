import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transactions } = body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: '登録対象のデータがありません。' }, { status: 400 });
    }

    // トランザクション内で全件登録
    const created = await prisma.$transaction(
      transactions.map((tx: any) =>
        prisma.cashTransaction.create({
          data: {
            transactionDate: new Date(tx.transactionDate),
            type: tx.type || 'OUT',
            employeeId: Number(tx.employeeId),
            projectId: tx.projectId ? Number(tx.projectId) : null,
            categoryType: tx.categoryType || null,
            description: tx.description || '',
            amount: Number(tx.amount),
            accountSubject: tx.accountSubject || '旅費交通費',
            accountSubjectId: tx.accountSubjectId ? Number(tx.accountSubjectId) : null,
            taxCategory: tx.taxCategory || '仕入10％',
          },
          include: {
            employee: true,
            project: true,
            accountSubjectRef: true,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      count: created.length,
      transactions: created,
    });
  } catch (error: any) {
    console.error('Bulk create cash transactions error:', error);
    return NextResponse.json({ error: error?.message || '出金データの一括登録に失敗しました。' }, { status: 500 });
  }
}
