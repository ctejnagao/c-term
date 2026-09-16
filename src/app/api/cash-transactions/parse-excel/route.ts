import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseExpenseReportExcel, normalizeJapaneseText } from '@/lib/expenseExcelParser';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません。' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const parsed = parseExpenseReportExcel(Buffer.from(arrayBuffer));

    // マスタデータの取得
    const [employees, projects, accountSubjects] = await Promise.all([
      prisma.employee.findMany({ where: { isActive: true, deletedAt: null } }),
      prisma.project.findMany({ where: { deletedAt: null }, select: { id: true, projectCode: true, name: true } }),
      prisma.accountSubject.findMany({ where: { isForCash: true, deletedAt: null } }),
    ]);

    // 1. 社員マスタとの照合
    let matchedEmployeeId: number | null = null;
    let matchedEmployeeName: string | null = null;
    const cleanEmpName = normalizeJapaneseText(parsed.employeeName);

    if (cleanEmpName) {
      // 完全一致（正規化後）
      const exactMatch = employees.find(e => normalizeJapaneseText(e.name) === cleanEmpName);
      if (exactMatch) {
        matchedEmployeeId = exactMatch.id;
        matchedEmployeeName = exactMatch.name;
      } else {
        // 部分一致
        const partialMatch = employees.find(e => {
          const empNorm = normalizeJapaneseText(e.name);
          return empNorm.includes(cleanEmpName) || cleanEmpName.includes(empNorm);
        });
        if (partialMatch) {
          matchedEmployeeId = partialMatch.id;
          matchedEmployeeName = partialMatch.name;
        }
      }
    }

    // 2. 物件マスタおよび勘定科目との照合
    const items = parsed.items.map((item, idx) => {
      let matchedProjectId: number | null = null;
      let matchedProjectName: string | null = null;

      if (item.projectName) {
        const itemProjNorm = normalizeJapaneseText(item.projectName);

        // 完全一致（正規化後）
        const exactProj = projects.find(p => normalizeJapaneseText(p.name) === itemProjNorm);
        if (exactProj) {
          matchedProjectId = exactProj.id;
          matchedProjectName = exactProj.name;
        } else {
          // 部分一致（プロジェクト名に含まれる、または物件名に含まれる）
          const partialProj = projects.find(p => {
            const pNorm = normalizeJapaneseText(p.name);
            return pNorm.includes(itemProjNorm) || itemProjNorm.includes(pNorm);
          });
          if (partialProj) {
            matchedProjectId = partialProj.id;
            matchedProjectName = partialProj.name;
          }
        }
      }

      // 勘定科目のID解決
      let accountSubjectId: number | null = null;
      const matchedSubject = accountSubjects.find(s => s.name === item.accountName);
      if (matchedSubject) {
        accountSubjectId = matchedSubject.id;
      } else {
        // 車両費などがマスタにない場合は旅費交通費をフォールバック
        const fallback = accountSubjects.find(s => s.name === '旅費交通費');
        if (fallback) {
          accountSubjectId = fallback.id;
        }
      }

      return {
        tempId: `item-${idx}-${Date.now()}`,
        date: item.date,
        day: item.day,
        projectName: item.projectName,
        matchedProjectId,
        matchedProjectName,
        transportType: item.transportType,
        description: item.description,
        amount: item.amount,
        accountName: item.accountName,
        accountCode: item.accountCode,
        accountSubjectId,
        taxType: item.taxType,
      };
    });

    return NextResponse.json({
      summary: {
        employeeName: parsed.employeeName,
        matchedEmployeeId,
        matchedEmployeeName,
        targetYearMonth: parsed.targetYearMonth,
        totalAmount: parsed.totalAmount,
        itemCount: items.length,
      },
      items,
    });
  } catch (error: any) {
    console.error('Excel parse error:', error);
    return NextResponse.json({ error: error?.message || 'Excelファイルの解析に失敗しました。' }, { status: 500 });
  }
}
