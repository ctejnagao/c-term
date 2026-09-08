import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Try decoding with Shift-JIS first (UFJ standard), fallback to UTF-8
    let text = '';
    try {
      const sjisDecoder = new TextDecoder('shift_jis');
      const decoded = sjisDecoder.decode(buffer);
      if (decoded.includes('支店') || decoded.includes('振替') || decoded.includes('カ−ド') || decoded.includes('カード') || decoded.includes('普通')) {
        text = decoded;
      } else {
        const utf8Decoder = new TextDecoder('utf-8');
        text = utf8Decoder.decode(buffer);
      }
    } catch {
      const utf8Decoder = new TextDecoder('utf-8');
      text = utf8Decoder.decode(buffer);
    }

    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      return NextResponse.json({ error: 'CSVデータが空です' }, { status: 400 });
    }

    const rules = await prisma.accountCodeRule.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'desc' }, { id: 'asc' }],
    });

    const cardStatements = await prisma.cardStatement.findMany({
      where: { deletedAt: null },
    });

    let headerBranchName = '大津町支店';
    let headerAccountType = '普通';
    let headerBankName = '三菱UFJ銀行';

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      const cols = (matches || line.split(',')).map(c => c.replace(/^"|"$/g, '').trim());

      if (cols.length === 0) continue;

      const recordType = cols[0];

      // Header record
      if (recordType === '1') {
        if (cols.length > 2 && cols[2]) {
          headerBranchName = cols[2];
        }
        if (cols.length > 5 && cols[5]) {
          headerAccountType = cols[5];
        }
        continue;
      }

      // Detail row
      if (recordType === '2') {
        if (cols.length < 5) continue;

        const rawDate = cols[1]; // e.g. "2025.7.2"
        const category = cols[2] || '';
        const target = cols[3] || '';
        const description = target ? `${target} (${category})` : category;

        const rawWithdrawal = cols[4]?.replace(/,/g, '') || '0';
        const rawDeposit = cols[5]?.replace(/,/g, '') || '0';
        const rawBalance = cols[6]?.replace(/,/g, '') || '0';

        const parts = rawDate.split(/[\.\/\-]/).map(Number);
        if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
          continue;
        }
        const [y, m, d] = parts;
        const txDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));

        const withdrawalAmount = parseInt(rawWithdrawal, 10) || 0;
        const depositAmount = parseInt(rawDeposit, 10) || 0;
        const balance = parseInt(rawBalance, 10) || 0;
        const amount = depositAmount > 0 ? depositAmount : -withdrawalAmount;
        const transactionType = depositAmount > 0 ? 'DEPOSIT' : 'WITHDRAWAL';

        const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const hash = `${dateStr}_${description}_${withdrawalAmount}_${depositAmount}_${balance}`;

        const existing = await prisma.bankTransaction.findUnique({
          where: { hash },
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        let accountCode: string | null = null;
        let accountName: string | null = null;
        let subAccountCode: string | null = null;
        let subAccountName: string | null = null;
        let taxType: string | null = '課対仕入10%';

        for (const rule of rules) {
          if (description.includes(rule.keyword) || category.includes(rule.keyword) || target.includes(rule.keyword)) {
            accountCode = rule.accountCode;
            accountName = rule.accountName;
            subAccountCode = rule.subAccountCode;
            subAccountName = rule.subAccountName;
            taxType = rule.taxType || '課対仕入10%';
            break;
          }
        }

        let linkedCardStatementId: number | null = null;
        if (description.includes('ラクテン') || description.includes('楽天') || description.includes('カード') || description.includes('カ−ド')) {
          const matchedCard = cardStatements.find(cs => {
            const csDateStr = new Date(cs.paymentDate).toISOString().split('T')[0];
            return csDateStr === dateStr || Math.abs(cs.totalAmount - withdrawalAmount) === 0;
          });
          if (matchedCard) {
            linkedCardStatementId = matchedCard.id;
          }
        }

        await prisma.bankTransaction.create({
          data: {
            date: txDate,
            bankName: headerBankName,
            branchName: headerBranchName,
            accountType: headerAccountType,
            description,
            amount,
            withdrawalAmount,
            depositAmount,
            balance,
            transactionType,
            accountCode,
            accountName,
            subAccountCode,
            subAccountName,
            taxType,
            cardStatementId: linkedCardStatementId,
            rawData: line,
            hash,
            isReconciled: Boolean(linkedCardStatementId || accountName),
          },
        });

        importedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      errors,
    });
  } catch (error: any) {
    console.error('Failed to parse bank transaction CSV:', error);
    return NextResponse.json({ error: error.message || 'CSV解析・取込に失敗しました' }, { status: 500 });
  }
}
