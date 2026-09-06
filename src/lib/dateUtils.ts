/**
 * 日本の祝日および銀行休業日（UFJ銀行・銀行法第15条に基づく）判定ユーティリティ
 */

// 春分の日の計算 (1980〜2099年)
function getVernalEquinoxDay(year: number): number {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

// 秋分の日の計算 (1980〜2099年)
function getAutumnalEquinoxDay(year: number): number {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

// 第N月曜日を取得 (ハッピーマンデー用)
function getNthMonday(year: number, month: number, nth: number): number {
  const firstDay = new Date(year, month - 1, 1).getDay();
  let firstMonday = 1;
  if (firstDay === 1) {
    firstMonday = 1;
  } else if (firstDay === 0) {
    firstMonday = 2;
  } else {
    firstMonday = 1 + (7 - firstDay + 1);
  }
  return firstMonday + (nth - 1) * 7;
}

/**
 * 指定日が「国民の祝日」であるかを判定（振替休日・国民の休日を含む）
 */
export function isNationalHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // 1. 固定祝日判定（単体）
  const isBaseHoliday = (y: number, m: number, d: number): boolean => {
    if (m === 1 && d === 1) return true; // 元日
    if (m === 1 && d === getNthMonday(y, 1, 2)) return true; // 成人の日 (第2月曜)
    if (m === 2 && d === 11) return true; // 建国記念の日
    if (y >= 2020 && m === 2 && d === 23) return true; // 天皇誕生日
    if (m === 3 && d === getVernalEquinoxDay(y)) return true; // 春分の日
    if (m === 4 && d === 29) return true; // 昭和の日
    if (m === 5 && d === 3) return true; // 憲法記念日
    if (m === 5 && d === 4) return true; // みどりの日
    if (m === 5 && d === 5) return true; // こどもの日
    if (y >= 2016 && m === 8 && d === 11) return true; // 山の日
    if (m === 7 && d === getNthMonday(y, 7, 3)) return true; // 海の日 (第3月曜)
    if (m === 9 && d === getNthMonday(y, 9, 3)) return true; // 敬老の日 (第3月曜)
    if (m === 9 && d === getAutumnalEquinoxDay(y)) return true; // 秋分の日
    if (m === 10 && d === getNthMonday(y, 10, 2)) return true; // スポーツの日 (第2月曜)
    if (m === 11 && d === 3) return true; // 文化の日
    if (m === 11 && d === 23) return true; // 勤労感謝の日
    return false;
  };

  if (isBaseHoliday(year, month, day)) {
    return true;
  }

  // 2. 振替休日判定（日曜が祝日だった場合、以降で直近の平日）
  const dayOfWeek = date.getDay();
  if (dayOfWeek !== 0) { // 日曜でなければ振替休日の可能性をチェック
    let checkDate = new Date(year, month - 1, day - 1);
    while (isBaseHoliday(checkDate.getFullYear(), checkDate.getMonth() + 1, checkDate.getDate())) {
      if (checkDate.getDay() === 0) {
        // 日曜の祝日があったため、この日は振替休日
        return true;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  // 3. 国民の休日判定（祝日と祝日に挟まれた平日、例: 敬老の日と秋分の日に挟まれた火曜日など）
  const prevDate = new Date(year, month - 1, day - 1);
  const nextDate = new Date(year, month - 1, day + 1);
  if (
    isBaseHoliday(prevDate.getFullYear(), prevDate.getMonth() + 1, prevDate.getDate()) &&
    isBaseHoliday(nextDate.getFullYear(), nextDate.getMonth() + 1, nextDate.getDate())
  ) {
    return true;
  }

  return false;
}

/**
 * 銀行法第15条・銀行法施行令第5条に基づく銀行休業日（UFJ銀行稼働日判定用）
 * 1. 土曜日・日曜日
 * 2. 国民の祝日・振替休日・国民の休日
 * 3. 12月31日、1月1日、1月2日、1月3日（年末年始休業）
 */
export function isBankHoliday(date: Date): boolean {
  const dayOfWeek = date.getDay();
  // 土曜日(6) または 日曜日(0)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();

  // 年末年始休業 (12/31, 1/1, 1/2, 1/3)
  if (month === 12 && day === 31) return true;
  if (month === 1 && (day === 1 || day === 2 || day === 3)) return true;

  // 祝日判定
  return isNationalHoliday(date);
}

/**
 * 指定日が銀行休業日の場合、直前の銀行営業日（UFJ銀行稼働日）まで遡って返します。
 */
export function adjustToPreviousBusinessDay(date: Date): Date {
  const result = new Date(date);
  // 休業日（土日・祝日・年末年始）である限り、1日ずつ前へ遡る
  while (isBankHoliday(result)) {
    result.setDate(result.getDate() - 1);
  }
  return result;
}

/**
 * 計上日の翌月末日を取得し、UFJ銀行の稼働日（休業日の場合は手前の営業日）に調整した日付を返します。
 * 例: 2026年04月30日計上 -> 翌月末 2026年05月31日(日) -> 2026年05月29日(金)
 * 例: 2026年11月30日計上 -> 翌月末 2026年12月31日(木) -> 2026年12月30日(水) ※12/31は銀行休業日
 * 例: 2026年08月31日計上 -> 翌月末 2026年09月30日(水) -> 2026年09月30日(水)
 */
export function calculateExpectedPayDate(dateStr?: string | Date | null): Date {
  if (!dateStr) {
    return adjustToPreviousBusinessDay(new Date());
  }

  let year: number;
  let month: number;

  if (typeof dateStr === 'string') {
    const parts = dateStr.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
    if (parts) {
      year = parseInt(parts[1], 10);
      month = parseInt(parts[2], 10); // 1〜12
    } else {
      const d = new Date(dateStr);
      year = d.getFullYear();
      month = d.getMonth() + 1;
    }
  } else {
    year = dateStr.getFullYear();
    month = dateStr.getMonth() + 1;
  }

  // 翌月末日 (month + 1 の 0日目)
  const nextMonthEnd = new Date(year, month + 1, 0);

  // UFJ銀行営業日（休日の場合は直前の営業日）へ調整
  const adjusted = adjustToPreviousBusinessDay(nextMonthEnd);
  adjusted.setHours(23, 59, 59, 999);
  return adjusted;
}

/**
 * Date オブジェクトを YYYY-MM-DD 形式の文字列に変換します。
 */
export function formatToYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

