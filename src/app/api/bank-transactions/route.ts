import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const yearMonth = searchParams.get('yearMonth'); // e.g. "2025-07"
    const search = searchParams.get('search');
    const type = searchParams.get('type'); // "WITHDRAWAL" | "DEPOSIT"
    const isReconciled = searchParams.get('isReconciled');

    const where: any = { deletedAt: null };

    if (yearMonth && yearMonth !== 'all') {
      const [year, month] = yearMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      where.date = {
        gte: startDate,
        lt: endDate,
      };
    }

    if (type) {
      where.transactionType = type;
    }

    if (isReconciled !== null && isReconciled !== undefined && isReconciled !== '') {
      where.isReconciled = isReconciled === 'true';
    }

    if (search && search.trim()) {
      where.OR = [
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { accountName: { contains: search.trim(), mode: 'insensitive' } },
        { memo: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const transactions = await prisma.bankTransaction.findMany({
      where,
      include: {
        cardStatement: true,
        reconciledProject: {
          include: { partner: true },
        },
        reconciledInvoice: true,
      },
      orderBy: [
        { date: 'desc' },
        { id: 'desc' },
      ],
    });

    // Summary calculations
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let uncategorizedCount = 0;

    for (const t of transactions) {
      totalDeposits += t.depositAmount;
      totalWithdrawals += t.withdrawalAmount;
      if (!t.accountName || t.accountName.trim() === '') {
        uncategorizedCount++;
      }
    }

    // Latest balances for UFJ, SMBC, and combined
    const latestUfj = await prisma.bankTransaction.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { bankName: { contains: 'UFJ' } },
          { bankName: { contains: '三菱' } },
        ],
      },
      orderBy: [
        { date: 'desc' },
        { id: 'desc' },
      ],
    });

    const latestSmbc = await prisma.bankTransaction.findFirst({
      where: {
        deletedAt: null,
        bankName: { contains: 'SMBC' },
      },
      orderBy: [
        { date: 'desc' },
        { id: 'desc' },
      ],
    });

    const ufjBalance = latestUfj ? latestUfj.balance : 0;
    const smbcBalance = latestSmbc ? latestSmbc.balance : 0;
    const combinedBalance = ufjBalance + smbcBalance;

    return NextResponse.json({
      transactions,
      summary: {
        totalDeposits,
        totalWithdrawals,
        uncategorizedCount,
        latestBalance: combinedBalance,
        ufjBalance,
        smbcBalance,
        combinedBalance,
        totalCount: transactions.length,
      },
    });
  } catch (error) {
    console.error('Failed to fetch bank transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch bank transactions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const date = new Date(data.date);
    const withdrawalAmount = Number(data.withdrawalAmount || 0);
    const depositAmount = Number(data.depositAmount || 0);
    const amount = depositAmount > 0 ? depositAmount : -withdrawalAmount;
    const balance = Number(data.balance || 0);
    const description = String(data.description || '').trim();

    const hash = `${date.toISOString().split('T')[0]}_${description}_${withdrawalAmount}_${depositAmount}_${balance}`;

    const created = await prisma.bankTransaction.create({
      data: {
        date,
        bankName: data.bankName || '三菱UFJ銀行',
        branchName: data.branchName || '大津町支店',
        accountType: data.accountType || '普通',
        accountNumber: data.accountNumber || '',
        description,
        amount,
        withdrawalAmount,
        depositAmount,
        balance,
        transactionType: depositAmount > 0 ? 'DEPOSIT' : 'WITHDRAWAL',
        accountCode: data.accountCode || null,
        accountName: data.accountName || null,
        subAccountCode: data.subAccountCode || null,
        subAccountName: data.subAccountName || null,
        taxType: data.taxType || '課対仕入10%',
        cardStatementId: data.cardStatementId ? Number(data.cardStatementId) : null,
        memo: data.memo || null,
        hash,
        isReconciled: Boolean(data.isReconciled),
      },
    });

    return NextResponse.json(created);
  } catch (error: any) {
    console.error('Failed to create bank transaction:', error);
    return NextResponse.json({ error: error.message || 'Failed to create transaction' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    const { id, ...updates } = data;

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const payload: any = {};
    if (updates.accountCode !== undefined) payload.accountCode = updates.accountCode?.trim() || null;
    if (updates.accountName !== undefined) payload.accountName = updates.accountName?.trim() || null;
    if (updates.subAccountCode !== undefined) payload.subAccountCode = updates.subAccountCode?.trim() || null;
    if (updates.subAccountName !== undefined) payload.subAccountName = updates.subAccountName?.trim() || null;
    if (updates.taxType !== undefined) payload.taxType = updates.taxType;
    if (updates.memo !== undefined) payload.memo = updates.memo;
    if (updates.isReconciled !== undefined) payload.isReconciled = Boolean(updates.isReconciled);
    if (updates.cardStatementId !== undefined) {
      payload.cardStatementId = updates.cardStatementId ? Number(updates.cardStatementId) : null;
    }

    const updated = await prisma.bankTransaction.update({
      where: { id: Number(id) },
      data: payload,
      include: {
        cardStatement: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Failed to update bank transaction:', error);
    return NextResponse.json({ error: error.message || 'Failed to update transaction' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    await prisma.bankTransaction.update({
      where: { id: Number(id) },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete transaction:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete transaction' }, { status: 500 });
  }
}
