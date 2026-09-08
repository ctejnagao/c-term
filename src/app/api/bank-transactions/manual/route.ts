import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      bankName = 'SMBC',
      branchName = '上前津支店',
      date,
      txDate, // support either date or txDate
      description,
      withdrawalAmount,
      withdrawal, // support either
      depositAmount,
      deposit, // support either
      balance,
      accountName,
      accountCode,
      subAccountName,
      memo,
    } = body;

    const rawDate = date || txDate;
    if (!rawDate) {
      return NextResponse.json({ error: '日付（date または txDate）は必須です' }, { status: 400 });
    }

    const txDateObj = new Date(rawDate);
    if (isNaN(txDateObj.getTime())) {
      return NextResponse.json({ error: '無効な日付形式です' }, { status: 400 });
    }

    const withdrawalVal = Number(withdrawalAmount !== undefined ? withdrawalAmount : (withdrawal || 0)) || 0;
    const depositVal = Number(depositAmount !== undefined ? depositAmount : (deposit || 0)) || 0;
    const balanceVal = Number(balance) || 0;
    const amountVal = depositVal > 0 ? depositVal : -withdrawalVal;
    const transactionType = depositVal > 0 ? 'DEPOSIT' : 'WITHDRAWAL';
    const desc = (description || '').trim() || '借入返済';

    const dateStr = txDateObj.toISOString().split('T')[0];
    const hash = `${dateStr}_${bankName}_${desc}_${withdrawalVal}_${depositVal}_${balanceVal}_${Date.now()}`;

    // Auto assign account subject for SMBC typical entries
    let finalAccountName = accountName;
    let finalAccountCode = accountCode;
    let finalTaxType = '非課税';

    if (!finalAccountName) {
      if (desc.includes('利息')) {
        finalAccountName = '支払利息';
        finalAccountCode = '7111';
        finalTaxType = '非課税';
      } else if (desc.includes('返済') || desc.includes('融資') || desc.includes('借入')) {
        finalAccountName = '短期借入金';
        finalAccountCode = '2111';
        finalTaxType = '対象外';
      } else {
        finalAccountName = '諸経費';
        finalTaxType = '課対仕入10%';
      }
    }

    if (id) {
      const updated = await prisma.bankTransaction.update({
        where: { id: Number(id) },
        data: {
          date: txDateObj,
          bankName,
          branchName,
          description: desc,
          withdrawalAmount: withdrawalVal,
          depositAmount: depositVal,
          amount: amountVal,
          balance: balanceVal,
          transactionType,
          accountName: finalAccountName,
          accountCode: finalAccountCode,
          subAccountName: subAccountName || 'SMBC上前津',
          taxType: finalTaxType,
          memo: memo || null,
        },
        include: {
          cardStatement: true,
          reconciledProject: { include: { partner: true } },
          reconciledInvoice: true,
        },
      });
      return NextResponse.json({ success: true, transaction: updated });
    } else {
      const created = await prisma.bankTransaction.create({
        data: {
          date: txDateObj,
          bankName,
          branchName,
          accountType: '普通',
          description: desc,
          withdrawalAmount: withdrawalVal,
          depositAmount: depositVal,
          amount: amountVal,
          balance: balanceVal,
          transactionType,
          accountName: finalAccountName,
          accountCode: finalAccountCode,
          subAccountName: subAccountName || 'SMBC上前津',
          taxType: finalTaxType,
          memo: memo || null,
          hash,
          isReconciled: true,
        },
        include: {
          cardStatement: true,
          reconciledProject: { include: { partner: true } },
          reconciledInvoice: true,
        },
      });
      return NextResponse.json({ success: true, transaction: created });
    }
  } catch (error: any) {
    console.error('Failed to save manual bank transaction:', error);
    return NextResponse.json({ error: error.message || '手入力明細の保存に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await prisma.bankTransaction.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true, message: '明細を削除しました' });
  } catch (error: any) {
    console.error('Failed to delete manual bank transaction:', error);
    return NextResponse.json({ error: error.message || '明細の削除に失敗しました' }, { status: 500 });
  }
}
