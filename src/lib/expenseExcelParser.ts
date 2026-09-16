import * as xlsx from 'xlsx';

export interface ExpenseReportItem {
  date: string;          // YYYY-MM-DD（対象年月 + 日）
  day: number;           // 日 (1-31)
  projectName: string;   // 物件名
  transportType: string; // 交通機関等
  description: string;   // 摘要
  amount: number;        // 金額
  accountCode: string;   // 推定勘定科目コード
  accountName: string;   // 勘定科目名（旅費交通費 等）
  taxType: string;       // 課税仕入 10% / 仕入10％
}

export interface ExpenseReportSummary {
  employeeName: string;   // 申請者氏名
  targetYearMonth: string;// YYYY-MM
  totalAmount: number;    // 合計金額
  items: ExpenseReportItem[];
}

/**
 * Excelシリアル値または文字列から年月（YYYY-MM）を抽出
 */
export function parseYearMonth(cellValue: any, formattedText?: string): string {
  if (formattedText) {
    const match = formattedText.match(/(\d{4})[\/\-年](\d{1,2})/);
    if (match) {
      const y = match[1];
      const m = match[2].padStart(2, '0');
      return `${y}-${m}`;
    }
  }

  if (typeof cellValue === 'number') {
    // Excel date serial number
    const dateObj = xlsx.SSF.parse_date_code(cellValue);
    if (dateObj && dateObj.y && dateObj.m) {
      return `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}`;
    }
  }

  if (typeof cellValue === 'string') {
    const match = cellValue.match(/(\d{4})[\/\-年](\d{1,2})/);
    if (match) {
      return `${match[1]}-${match[2].padStart(2, '0')}`;
    }
  }

  if (cellValue instanceof Date && !isNaN(cellValue.getTime())) {
    const y = cellValue.getFullYear();
    const m = String(cellValue.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  // デフォルトは現在年月
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * セル値から「日」（1〜31）の数値を抽出
 */
export function parseDayValue(cellValue: any): number | null {
  if (cellValue === undefined || cellValue === null || cellValue === '') {
    return null;
  }

  if (typeof cellValue === 'number') {
    // 1〜31の数値であればそのまま日
    if (cellValue >= 1 && cellValue <= 31 && Math.floor(cellValue) === cellValue) {
      return cellValue;
    }
    // Excelシリアル値（1900年基準、例: 3 -> 1900-01-03）
    const parsed = xlsx.SSF.parse_date_code(cellValue);
    if (parsed && parsed.d) {
      return parsed.d;
    }
    return Math.floor(cellValue);
  }

  if (typeof cellValue === 'string') {
    const trimmed = cellValue.trim();
    // "3" や "03"
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 1 && num <= 31) {
      return num;
    }
    // "2025-07-03" や "7/3" などの文字列
    const match = trimmed.match(/(\d{1,2})$/);
    if (match) {
      const d = parseInt(match[1], 10);
      if (!isNaN(d) && d >= 1 && d <= 31) return d;
    }
  }

  return null;
}

/**
 * 交通機関等および摘要から勘定科目・税区分を自動判定
 */
export function determineAccountSubject(transportType: string, description: string): {
  accountName: string;
  accountCode: string;
  taxType: string;
} {
  const trans = (transportType || '').trim();
  const desc = (description || '').trim();

  // 1. 旅費交通費判定キーワード
  const travelTransKeywords = ['地下鉄', '私鉄', 'JR', '新幹線', 'タクシー', 'バス', '高速', '出張手当'];
  const travelDescKeywords = ['駐車代', 'コインパーキング', 'パーキング', '駐車料金', 'ETC'];

  const isTravelTrans = travelTransKeywords.some(kw => trans.includes(kw));
  const isTravelDesc = travelDescKeywords.some(kw => desc.includes(kw));

  if (isTravelTrans || isTravelDesc) {
    return {
      accountName: '旅費交通費',
      accountCode: '722',
      taxType: '仕入10％',
    };
  }

  // 2. 車両費判定キーワード（その他 かつ ガソリン・給油）
  const fuelKeywords = ['ガソリン', '給油', '燃料'];
  if (fuelKeywords.some(kw => desc.includes(kw))) {
    return {
      accountName: '車両費',
      accountCode: '723', // 一般的車両費コード
      taxType: '仕入10％',
    };
  }

  // 3. 消耗品費 / 雑費判定
  const suppliesKeywords = ['社内備品購入', '備品', '消耗品', '機器代金', '書籍代金', '本代'];
  if (suppliesKeywords.some(kw => trans.includes(kw) || desc.includes(kw))) {
    return {
      accountName: '消耗品費',
      accountCode: '728',
      taxType: '仕入10％',
    };
  }

  // デフォルト: 旅費交通費
  return {
    accountName: '旅費交通費',
    accountCode: '722',
    taxType: '仕入10％',
  };
}

/**
 * アップロードされたExcel Bufferから交通費等請求明細を解析
 */
export function parseExpenseReportExcel(buffer: Buffer | ArrayBuffer): ExpenseReportSummary {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Excelファイル内にシートが見つかりません。');
  }
  const sheet = workbook.Sheets[sheetName];

  // 1. 社員名抽出 (A1セル または 23行目の氏名欄)
  let employeeName = '';
  const a1Cell = sheet['A1'];
  if (a1Cell && a1Cell.v) {
    employeeName = String(a1Cell.v).trim();
  }

  if (!employeeName) {
    // 20〜25行目のJ列・K列などをスキャンして「氏名」を探す
    for (let r = 20; r <= 30; r++) {
      for (const col of ['I', 'J', 'K']) {
        const c = sheet[col + r];
        if (c && c.v && String(c.v).includes('氏名')) {
          employeeName = String(c.v).replace(/氏名[:：\s　]*/g, '').trim();
          break;
        }
      }
      if (employeeName) break;
    }
  }

  // 氏名接頭語のクリーンアップ
  employeeName = employeeName.replace(/^(社員名|氏名|申請者)[:：\s　]*/g, '').trim();

  // 2. 対象年月抽出 (B4 または C4セル)
  const c4 = sheet['C4'];
  const b4 = sheet['B4'];
  let targetYearMonth = '';
  if (c4) {
    targetYearMonth = parseYearMonth(c4.v, c4.w);
  } else if (b4) {
    targetYearMonth = parseYearMonth(b4.v, b4.w);
  } else {
    targetYearMonth = parseYearMonth(null);
  }

  // 3. 明細行解析
  // 明細開始行: 6行目 (見出しは5行目)
  const items: ExpenseReportItem[] = [];
  let prevDay: number | null = null;
  let prevProjectName = '';

  for (let r = 6; r <= 100; r++) {
    // 終了条件チェック: J列（または他の列）に「合計」が含まれる
    const jVal = sheet['J' + r]?.v ? String(sheet['J' + r].v).trim() : '';
    const bVal = sheet['B' + r]?.v ? String(sheet['B' + r].v).trim() : '';
    const cVal = sheet['C' + r]?.v ? String(sheet['C' + r].v).trim() : '';
    const fVal = sheet['F' + r]?.v ? String(sheet['F' + r].v).trim() : '';
    const hVal = sheet['H' + r]?.v ? String(sheet['H' + r].v).trim() : '';
    const kCell = sheet['K' + r];

    if (jVal === '合計' || bVal === '合計' || cVal === '合計' || hVal === '合計') {
      // 合計行に達したため終了
      break;
    }

    // 金額チェック
    let amount = 0;
    if (kCell && kCell.v !== undefined && kCell.v !== null && kCell.v !== '') {
      amount = typeof kCell.v === 'number' ? Math.round(kCell.v) : parseInt(String(kCell.v).replace(/,/g, ''), 10);
    }

    // 全列空行チェック（金額もなく、他も空の場合は空行としてスキップ）
    if (!bVal && !cVal && !fVal && !hVal && (!amount || isNaN(amount))) {
      continue;
    }

    // 金額が数値でない、または0以下の行で交通機関や摘要もないならスキップ
    if (isNaN(amount) || (!fVal && !hVal && amount === 0)) {
      continue;
    }

    // フォワードフィル: 日 (B列)
    let currentDay = parseDayValue(sheet['B' + r]?.v);
    if (currentDay === null) {
      currentDay = prevDay;
    } else {
      prevDay = currentDay;
    }

    // フォワードフィル: 物件名 (C列)
    let currentProject = cVal;
    if (!currentProject) {
      currentProject = prevProjectName;
    } else {
      prevProjectName = currentProject;
    }

    // 日付 YYYY-MM-DD の生成
    const dayStr = currentDay ? String(currentDay).padStart(2, '0') : '01';
    const date = `${targetYearMonth}-${dayStr}`;

    // 勘定科目・税区分の自動判定
    const { accountName, accountCode, taxType } = determineAccountSubject(fVal, hVal);

    items.push({
      date,
      day: currentDay || 1,
      projectName: currentProject,
      transportType: fVal,
      description: hVal,
      amount: isNaN(amount) ? 0 : amount,
      accountName,
      accountCode,
      taxType,
    });
  }

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return {
    employeeName,
    targetYearMonth,
    totalAmount,
    items,
  };
}

/**
 * 日本語文字列の正規化（半角カナ→全角カナ、全角英数→半角英数、空白除去、小文字化）
 */
export function normalizeJapaneseText(str: string): string {
  if (!str) return '';
  // 全角英数字を半角に
  let res = str.replace(/[！-～]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
  
  // 半角カナ→全角カナ変換マップ
  const kanaMap: { [key: string]: string } = {
    'ｶﾞ': 'ガ', 'ｷﾞ': 'ギ', 'ｸﾞ': 'グ', 'ｹﾞ': 'ゲ', 'ｺﾞ': 'ゴ',
    'ｻﾞ': 'ザ', 'ｼﾞ': 'ジ', 'ｽﾞ': 'ズ', 'ｾﾞ': 'ゼ', 'ｿﾞ': 'ゾ',
    'ﾀﾞ': 'ダ', 'ﾁﾞ': 'ヂ', 'ﾂﾞ': 'ヅ', 'ﾃﾞ': 'デ', 'ﾄﾞ': 'ド',
    'ﾊﾞ': 'バ', 'ﾋﾞ': 'ビ', 'ﾌﾞ': 'ブ', 'ﾍﾞ': 'ベ', 'ﾎﾞ': 'ボ',
    'ﾊﾟ': 'パ', 'ﾋﾟ': 'ピ', 'ﾌﾟ': 'プ', 'ﾍﾟ': 'ペ', 'ﾎﾟ': 'ポ',
    'ｳﾞ': 'ヴ', 'ﾜﾞ': 'ヷ', 'ｦﾞ': 'ヺ',
    'ｱ': 'ア', 'ｲ': 'イ', 'ｳ': 'ウ', 'ｴ': 'エ', 'ｵ': 'オ',
    'ｶ': 'カ', 'ｷ': 'キ', 'ｸ': 'ク', 'ｹ': 'ケ', 'ｺ': 'コ',
    'ｻ': 'サ', 'ｼ': 'シ', 'ｽ': 'ス', 'ｾ': 'セ', 'ｿ': 'ソ',
    'ﾀ': 'タ', 'ﾁ': 'チ', 'ﾂ': 'ツ', 'ﾃ': 'テ', 'ﾄ': 'ト',
    'ﾅ': 'ナ', 'ﾆ': 'ニ', 'ﾇ': 'ヌ', 'ﾈ': 'ネ', 'ﾉ': 'ノ',
    'ﾊ': 'ハ', 'ﾋ': 'ヒ', 'ﾌ': 'フ', 'ﾍ': 'ヘ', 'ﾎ': 'ホ',
    'ﾏ': 'マ', 'ﾐ': 'ミ', 'ﾑ': 'ム', 'ﾒ': 'メ', 'ﾓ': 'モ',
    'ﾔ': 'ヤ', 'ﾕ': 'ユ', 'ﾖ': 'ヨ',
    'ﾗ': 'ラ', 'ﾘ': 'リ', 'ﾙ': 'ル', 'ﾚ': 'レ', 'ﾛ': 'ロ',
    'ﾜ': 'ワ', 'ｦ': 'ヲ', 'ﾝ': 'ン',
    'ｧ': 'ァ', 'ｨ': 'ィ', 'ｩ': 'ゥ', 'ｪ': 'ェ', 'ｫ': 'ォ',
    'ｯ': 'ッ', 'ｬ': 'ャ', 'ｭ': 'ュ', 'ｮ': 'ョ',
    'ｰ': 'ー', '･': '・'
  };

  // 濁点・半濁点付きカナの置換
  const regKana = new RegExp('(' + Object.keys(kanaMap).join('|') + ')', 'g');
  res = res.replace(regKana, match => kanaMap[match] || match);

  // 空白除去・小文字化
  return res.replace(/[\s　_-]/g, '').toLowerCase();
}

