import { prisma } from "./prisma";

type SequenceType = "PROJECT" | "ESTIMATE" | "DELIVERY" | "INVOICE" | "ORDER";

/**
 * 6月末締め年度のプレフィックス（西暦下2桁）を取得
 * - 7/1 〜 翌年6/30 を翌年年度とする (例: 2026/7/1 -> '27', 2026/6/30 -> '26')
 */
export function getFiscalYearPrefix(targetDate: Date = new Date()): string {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1; // 1〜12月

  // 7月以降なら翌年、6月以前なら当年
  const fiscalYear = month >= 7 ? year + 1 : year;
  return fiscalYear.toString().slice(-2);
}

/**
 * 採番関数: 年度プレフィックス + 5桁連番 (例: 2701737)
 * @param type 帳票タイプ
 * @param targetDate 発行日（指定がなければ現在日時）
 */
export async function getNextSequenceNumber(
  type: SequenceType,
  targetDate: Date = new Date()
): Promise<string> {
  const fiscalPrefix = getFiscalYearPrefix(targetDate);
  const trackerKey = `${type}_${fiscalPrefix}`; // 年度ごとに管理

  return await prisma.$transaction(async (tx) => {
    let tracker = await tx.sequenceTracker.findUnique({
      where: { key: trackerKey },
    });

    if (!tracker) {
      // Find the latest tracker for this type to continue the sequence
      const latestTracker = await tx.sequenceTracker.findFirst({
        where: { key: { startsWith: `${type}_` } },
        orderBy: { updatedAt: 'desc' }
      });
      
      tracker = await tx.sequenceTracker.create({
        data: {
          key: trackerKey,
          yearPrefix: fiscalPrefix,
          currentSeq: latestTracker ? latestTracker.currentSeq : 1000,
        },
      });
    }

    const nextSeq = tracker.currentSeq + 1;

    await tx.sequenceTracker.update({
      where: { key: trackerKey },
      data: {
        currentSeq: nextSeq,
      },
    });

    // 例: "27" + "01001" = "2701001"
    return `${fiscalPrefix}${String(nextSeq).padStart(5, "0")}`;
  });
}
