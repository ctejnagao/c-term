import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function getPreviousYearMonth(yearMonth: string): string {
  const [yStr, mStr] = yearMonth.split('-');
  let y = Number(yStr);
  let m = Number(mStr);
  if (m === 1) {
    y -= 1;
    m = 12;
  } else {
    m -= 1;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

/**
 * 期首月判定（7月が期首）
 */
function isFiscalYearStart(yearMonth: string): boolean {
  return yearMonth.endsWith('-07');
}

/**
 * 指定年月の前月最終残高（前月繰越 ＋ 当月入金 － 当月出金）を遡って自動計算
 * ※7月（期首月）は前年度（6月以前）からの自動引き継ぎを行わず、7月の手入力残高を基点とする
 */
async function calculatePreviousMonthFinalBalance(targetYearMonth: string, depth = 0): Promise<number> {
  // 当月が期首（7月）の場合は前年度（6月）から引き継がず、7月の手入力期首残高（または0）とする
  if (isFiscalYearStart(targetYearMonth)) {
    const saved = await prisma.cashMonthlyBalance.findUnique({
      where: { yearMonth: targetYearMonth },
    });
    return saved ? saved.carryOverAmount : 0;
  }

  const prevYM = getPreviousYearMonth(targetYearMonth);
  const [y, m] = prevYM.split('-').map(Number);
  const startOfPrev = new Date(y, m - 1, 1);
  const endOfPrev = new Date(y, m, 1);

  // 1. 前月自身の繰越額を取得
  const prevSaved = await prisma.cashMonthlyBalance.findUnique({
    where: { yearMonth: prevYM },
  });

  let prevCarryOver = 0;
  if (prevSaved) {
    prevCarryOver = prevSaved.carryOverAmount;
  } else if (!isFiscalYearStart(prevYM) && depth < 12) {
    // 前月が期首（7月）でなければさらに遡る
    prevCarryOver = await calculatePreviousMonthFinalBalance(prevYM, depth + 1);
  }

  // 2. 前月内の入出金を集計
  const prevTransactions = await prisma.cashTransaction.findMany({
    where: {
      transactionDate: { gte: startOfPrev, lt: endOfPrev },
      deletedAt: null,
    },
    select: { type: true, amount: true },
  });

  const prevIn = prevTransactions.filter(t => t.type === 'IN').reduce((sum, t) => sum + t.amount, 0);
  const prevOut = prevTransactions.filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.amount, 0);

  return prevCarryOver + prevIn - prevOut;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const yearMonth = searchParams.get('yearMonth');
    const recalculate = searchParams.get('recalculate') === 'true';

    if (!yearMonth) {
      return NextResponse.json({ error: 'yearMonth parameter is required' }, { status: 400 });
    }

    const isFiscalStart = isFiscalYearStart(yearMonth);

    // 1. 期首（7月）の場合: 自動引き継ぎは行わず、手入力値（未入力なら0）を返す
    if (isFiscalStart) {
      const balance = await prisma.cashMonthlyBalance.findUnique({
        where: { yearMonth },
      });
      return NextResponse.json({
        id: balance?.id || 0,
        yearMonth,
        carryOverAmount: balance ? balance.carryOverAmount : 0,
        isAuto: false,
        isFiscalStart: true,
        createdAt: balance?.createdAt || new Date(),
        updatedAt: balance?.updatedAt || new Date(),
        deletedAt: balance?.deletedAt || null,
      });
    }

    // 2. 8月〜翌年6月の場合
    if (recalculate) {
      const autoAmount = await calculatePreviousMonthFinalBalance(yearMonth);
      return NextResponse.json({
        id: 0,
        yearMonth,
        carryOverAmount: autoAmount,
        isAuto: true,
        isFiscalStart: false,
      });
    }

    let balance = await prisma.cashMonthlyBalance.findUnique({
      where: { yearMonth },
    });

    if (balance) {
      return NextResponse.json({
        ...balance,
        isAuto: false,
        isFiscalStart: false,
      });
    }

    // 保存レコードがない場合は前月の最終残高から自動計算
    const autoAmount = await calculatePreviousMonthFinalBalance(yearMonth);
    return NextResponse.json({
      id: 0,
      yearMonth,
      carryOverAmount: autoAmount,
      isAuto: true,
      isFiscalStart: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
  } catch (error) {
    console.error('Failed to fetch cash balance:', error);
    return NextResponse.json({ error: 'Failed to fetch cash balance' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { yearMonth, carryOverAmount } = data;

    if (!yearMonth || carryOverAmount === undefined) {
      return NextResponse.json({ error: 'yearMonth and carryOverAmount are required' }, { status: 400 });
    }

    const balance = await prisma.cashMonthlyBalance.upsert({
      where: { yearMonth },
      update: { carryOverAmount: Number(carryOverAmount) },
      create: {
        yearMonth,
        carryOverAmount: Number(carryOverAmount),
      },
    });

    return NextResponse.json({
      ...balance,
      isAuto: false,
      isFiscalStart: isFiscalYearStart(yearMonth),
    });
  } catch (error) {
    console.error('Failed to save cash balance:', error);
    return NextResponse.json({ error: 'Failed to save cash balance' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const yearMonth = searchParams.get('yearMonth');

    if (!yearMonth) {
      return NextResponse.json({ error: 'yearMonth parameter is required' }, { status: 400 });
    }

    await prisma.cashMonthlyBalance.deleteMany({
      where: { yearMonth },
    });

    const isFiscalStart = isFiscalYearStart(yearMonth);
    const autoAmount = isFiscalStart ? 0 : await calculatePreviousMonthFinalBalance(yearMonth);

    return NextResponse.json({
      success: true,
      yearMonth,
      carryOverAmount: autoAmount,
      isAuto: !isFiscalStart,
      isFiscalStart,
    });
  } catch (error) {
    console.error('Failed to delete cash balance override:', error);
    return NextResponse.json({ error: 'Failed to delete cash balance override' }, { status: 500 });
  }
}
