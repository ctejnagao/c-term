import prisma from './prisma';

/**
 * 決算日（6/30）に基づき、指定日の属する会計年度（西暦下2桁）を計算する。
 * - 7月〜翌年6月が当年度となる（例: 2026/7/1〜2027/6/30 => 26年度）
 * - 6/30 以前は前年開始の年度となる（例: 2026/6/30 => 25年度）
 */
export function getFiscalYearPrefix(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-indexed
  
  // 7月以降はその年の西暦、6月以前は前年の西暦（7月〜翌年6月が同一年度）
  const fiscalYear = month >= 7 ? year : year - 1;
  
  // 西暦下2桁を返す
  return (fiscalYear % 100).toString().padStart(2, '0');
}

export type SequenceType = 'ESTIMATE' | 'DELIVERY' | 'INVOICE' | 'PROJECT' | 'ORDER_ACCEPT';

/**
 * 指定されたタイプ（ESTIMATE等）と日付に基づき、自動採番を行う。
 * 例: 2600001
 */
export async function generateNextSequence(type: SequenceType, date: Date = new Date()): Promise<string> {
  const yearPrefix = getFiscalYearPrefix(date);
  
  // トランザクションで安全に採番・インクリメントする
  const result = await prisma.$transaction(async (tx) => {
    // 該当年度のレコードがあるか取得
    let tracker = await tx.sequenceTracker.findUnique({
      where: { key: type }
    });
    
    if (!tracker) {
      // 未存在の場合は作成（currentSeqを1に初期化）
      tracker = await tx.sequenceTracker.create({
        data: {
          key: type,
          yearPrefix,
          currentSeq: 1,
        }
      });
    } else if (tracker.yearPrefix !== yearPrefix) {
      // 年度プレフィックスが変わった場合は頭二桁(yearPrefix)のみ変更し、連番はリセットせず継続する
      tracker = await tx.sequenceTracker.update({
        where: { key: type },
        data: {
          yearPrefix,
          currentSeq: { increment: 1 }
        }
      });
    } else {
      // 同一年度の場合はインクリメントして更新
      tracker = await tx.sequenceTracker.update({
        where: { key: type },
        data: {
          currentSeq: { increment: 1 }
        }
      });
    }
    return tracker;
  });

  // 採番ルール: 年度(2桁) + 5桁連番
  const seqNumberString = result.currentSeq.toString().padStart(5, '0');
  return `${yearPrefix}${seqNumberString}`;
}
