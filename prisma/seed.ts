import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ㈱コムテックエンタープライズ 弥生会計 勘定科目一覧表 (全8頁・188科目)
const accountMastersData = [
  // --- 1頁: 資産 / 流動資産 / 現金・預金 ---
  { code: '101', name: '現 金', category: '資産', subCategory: '現金・預金', taxType: '対象外', taxFraction: '切り捨て', statementItem: '現金', borrowLend: '借方' },
  { code: '102', name: '小 口 現 金', category: '資産', subCategory: '現金・預金', taxType: '対象外', taxFraction: '切り捨て', statementItem: '現金', borrowLend: '借方' },
  { code: '111', name: '当 座 預 金', category: '資産', subCategory: '現金・預金', taxType: '対象外', taxFraction: '切り捨て', statementItem: '当座預金', borrowLend: '借方' },
  { code: '122', name: '普 通 　 三 菱 Ｕ Ｆ Ｊ 銀 行', category: '資産', subCategory: '現金・預金', taxType: '対象外', taxFraction: '切り捨て', statementItem: '普通預金', borrowLend: '借方' },
  { code: '125', name: '普 通 　 三 井 住 友 銀 行', category: '資産', subCategory: '現金・預金', taxType: '対象外', taxFraction: '切り捨て', statementItem: '普通預金', borrowLend: '借方' },
  { code: '126', name: '普 通 　 瀬 戸 信 用 金 庫', category: '資産', subCategory: '現金・預金', taxType: '対象外', taxFraction: '切り捨て', statementItem: '普通預金', borrowLend: '借方' },
  { code: '127', name: '普 通 　 愛 知 信 用 金 庫', category: '資産', subCategory: '現金・預金', taxType: '対象外', taxFraction: '切り捨て', statementItem: '普通預金', borrowLend: '借方' },
  { code: '123', name: '普 通 　 愛 知 銀 行 本 店', category: '資産', subCategory: '現金・預金', taxType: '対象外', taxFraction: '切り捨て', statementItem: '普通預金', borrowLend: '借方' },
  { code: '121', name: '普 通 　 愛 知 小 牧', category: '資産', subCategory: '現金・預金', taxType: '対象外', taxFraction: '切り捨て', statementItem: '普通預金', borrowLend: '借方' },
  { code: '124', name: '普 通 　 愛 知 知 立', category: '資産', subCategory: '現金・預金', taxType: '対象外', taxFraction: '切り捨て', statementItem: '普通預金', borrowLend: '借方' },
  { code: '128', name: '普 通 　 大 垣 共 立', category: '資産', subCategory: '現金・預金', taxType: '対象外', taxFraction: '切り捨て', statementItem: '普通預金', borrowLend: '借方' },
  { code: '131', name: '通 知 預 金', category: '資産', subCategory: '現金・預金', taxType: '対象外', taxFraction: '切り捨て', statementItem: '定期積金', borrowLend: '借方' },
  { code: '141', name: '定 期 積 金', category: '資産', subCategory: '現金・預金', taxType: '対象外', taxFraction: '切り捨て', statementItem: '定期積金', borrowLend: '借方' },
  { code: '151', name: '定 期 預 金', category: '資産', subCategory: '現金・預金', taxType: '対象外', taxFraction: '切り捨て', statementItem: '定期預金', borrowLend: '借方' },
  { code: '152', name: '別 段 預 金', category: '資産', subCategory: '現金・預金', taxType: '対象外', taxFraction: '切り捨て', statementItem: '定期積金', borrowLend: '借方' },
  { code: '155', name: 'ニ コ ス カ ー ド', category: '資産', subCategory: '現金・預金', taxType: '対象外', taxFraction: '切り捨て', statementItem: '普通預金', borrowLend: '借方' },
  { code: '156', name: '楽 天 カ ー ド', category: '資産', subCategory: '現金・預金', taxType: '対象外', taxFraction: '切り捨て', statementItem: '普通預金', borrowLend: '借方' },

  // --- 1頁: 資産 / 流動資産 / 売上債権 ---
  { code: '165', name: '受 取 手 形', category: '資産', subCategory: '売上債権', taxType: '対象外', taxFraction: '切り捨て', statementItem: '受取手形', borrowLend: '借方' },
  { code: '188', name: '不 渡 手 形', category: '資産', subCategory: '売上債権', taxType: '対象外', taxFraction: '切り捨て', statementItem: '不渡手形', borrowLend: '借方' },
  { code: '166', name: '売 掛 金', category: '資産', subCategory: '売上債権', taxType: '対象外', taxFraction: '切り捨て', statementItem: '売掛金', borrowLend: '借方' },
  { code: '169', name: '貸 倒 引 当 金 ( 売 )', category: '資産', subCategory: '売上債権', taxType: '対象外', taxFraction: '切り捨て', statementItem: '貸倒引当金', borrowLend: '借方' },

  // --- 1頁: 資産 / 流動資産 / 有価証券 ---
  { code: '167', name: '有 価 証 券', category: '資産', subCategory: '有価証券', taxType: '対象外', taxFraction: '切り捨て', statementItem: '有価証券', borrowLend: '借方' },

  // --- 1頁: 資産 / 流動資産 / 棚卸資産 ---
  { code: '171', name: '商 品', category: '資産', subCategory: '棚卸資産', taxType: '対象外', taxFraction: '切り捨て', statementItem: '商品', borrowLend: '借方' },
  { code: '172', name: '製 品', category: '資産', subCategory: '棚卸資産', taxType: '対象外', taxFraction: '切り捨て', statementItem: '製品', borrowLend: '借方' },
  { code: '173', name: '仕 掛 品', category: '資産', subCategory: '棚卸資産', taxType: '対象外', taxFraction: '切り捨て', statementItem: '仕掛品', borrowLend: '借方' },
  { code: '174', name: '原 材 料', category: '資産', subCategory: '棚卸資産', taxType: '対象外', taxFraction: '切り捨て', statementItem: '原材料', borrowLend: '借方' },
  { code: '175', name: '貯 蔵 品', category: '資産', subCategory: '棚卸資産', taxType: '対象外', taxFraction: '切り捨て', statementItem: '貯蔵品', borrowLend: '借方' },
  { code: '176', name: '半 製 品', category: '資産', subCategory: '棚卸資産', taxType: '対象外', taxFraction: '切り捨て', statementItem: '半製品', borrowLend: '借方' },
  { code: '177', name: '副 産 物 作 業 く ず', category: '資産', subCategory: '棚卸資産', taxType: '対象外', taxFraction: '切り捨て', statementItem: '副産物及び作業くず', borrowLend: '借方' },

  // --- 1頁: 資産 / 流動資産 / 他流動資産 ---
  { code: '910', name: '仮 払 消 費 税', category: '資産', subCategory: '他流動資産', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '指定なし', statementItem: '仮払消費税', borrowLend: '借方' },
  { code: '181', name: '前 渡 金', category: '資産', subCategory: '他流動資産', taxType: '対象外', taxFraction: '切り捨て', statementItem: '前渡金', borrowLend: '借方' },
  { code: '184', name: '立 替 金', category: '資産', subCategory: '他流動資産', taxType: '対象外', taxFraction: '切り捨て', statementItem: '立替金', borrowLend: '借方' },
  { code: '185', name: '未 収 入 金', category: '資産', subCategory: '他流動資産', taxType: '対象外', taxFraction: '切り捨て', statementItem: '未収入金', borrowLend: '借方' },
  { code: '182', name: '貸 付 金', category: '資産', subCategory: '他流動資産', taxType: '対象外', taxFraction: '切り捨て', statementItem: '貸付金', borrowLend: '借方' },
  { code: '187', name: '前 払 費 用', category: '資産', subCategory: '他流動資産', taxType: '対象外', taxFraction: '切り捨て', statementItem: '前払費用', borrowLend: '借方' },
  { code: '186', name: '仮 払 金', category: '資産', subCategory: '他流動資産', taxType: '対象外', taxFraction: '切り捨て', statementItem: '仮払金', borrowLend: '借方' },
  { code: '916', name: '未 収 消 費 税 等', category: '資産', subCategory: '他流動資産', taxType: '対象外', taxFraction: '指定なし', statementItem: '未収消費税等', borrowLend: '借方' },
  { code: '915', name: '繰 延 税 金 資 産', category: '資産', subCategory: '他流動資産', taxType: '対象外', taxFraction: '切り捨て', statementItem: '繰延税金資産', borrowLend: '借方' },
  { code: '199', name: '貸 倒 引 当 金 ( 他 )', category: '資産', subCategory: '他流動資産', taxType: '対象外', taxFraction: '切り捨て', statementItem: '貸倒引当金', borrowLend: '借方' },
  { code: '189', name: '本 支 店 勘 定', category: '資産', subCategory: '他流動資産', taxType: '対象外', taxFraction: '切り捨て', statementItem: '本支店勘定', borrowLend: '借方' },

  // --- 2頁: 資産 / 固定資産 / 有形固定資産 ---
  { code: '211', name: '建 物', category: '資産', subCategory: '有形固定資産', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '建物', borrowLend: '借方' },
  { code: '212', name: '附 属 設 備', category: '資産', subCategory: '有形固定資産', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '附属設備', borrowLend: '借方' },
  { code: '213', name: '構 築 物', category: '資産', subCategory: '有形固定資産', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '構築物', borrowLend: '借方' },
  { code: '214', name: '機 械 装 置', category: '資産', subCategory: '有形固定資産', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '機械装置', borrowLend: '借方' },
  { code: '215', name: '車 両 運 搬 具', category: '資産', subCategory: '有形固定資産', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '車両運搬具', borrowLend: '借方' },
  { code: '216', name: '工 具 器 具 備 品', category: '資産', subCategory: '有形固定資産', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '工具器具備品', borrowLend: '借方' },
  { code: '217', name: '一 括 償 却 資 産', category: '資産', subCategory: '有形固定資産', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '指定なし', statementItem: '一括償却資産', borrowLend: '借方' },
  { code: '224', name: '減 価 累 計 額', category: '資産', subCategory: '有形固定資産', taxType: '対象外', taxFraction: '切り捨て', statementItem: '減価償却累計額', borrowLend: '借方' },
  { code: '221', name: '土 地', category: '資産', subCategory: '有形固定資産', taxType: '対象外', taxFraction: '切り捨て', statementItem: '土地', borrowLend: '借方' },
  { code: '222', name: '建 設 仮 勘 定', category: '資産', subCategory: '有形固定資産', taxType: '対象外', taxFraction: '切り捨て', statementItem: '建設仮勘定', borrowLend: '借方' },

  // --- 2頁: 資産 / 固定資産 / 無形固定資産 ---
  { code: '233', name: '電 話 加 入 権', category: '資産', subCategory: '無形固定資産', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '電話加入権', borrowLend: '借方' },
  { code: '234', name: '施 設 利 用 権', category: '資産', subCategory: '無形固定資産', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '施設利用権', borrowLend: '借方' },
  { code: '235', name: '工 業 所 有 権', category: '資産', subCategory: '無形固定資産', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '工業所有権', borrowLend: '借方' },
  { code: '236', name: '営 業 権', category: '資産', subCategory: '無形固定資産', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '営業権', borrowLend: '借方' },
  { code: '237', name: '借 地 権', category: '資産', subCategory: '無形固定資産', taxType: '対象外', taxFraction: '切り捨て', statementItem: '借地権', borrowLend: '借方' },
  { code: '225', name: 'ソ フ ト ウ ェ ア', category: '資産', subCategory: '無形固定資産', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: 'ソフトウェア', borrowLend: '借方' },

  // --- 2頁: 資産 / 固定資産 / 投資等 ---
  { code: '242', name: '投 資 有 価 証 券', category: '資産', subCategory: '投資等', taxType: '対象外', taxFraction: '切り捨て', statementItem: '投資有価証券', borrowLend: '借方' },
  { code: '241', name: '出 資 金', category: '資産', subCategory: '投資等', taxType: '対象外', taxFraction: '切り捨て', statementItem: '出資金', borrowLend: '借方' },
  { code: '244', name: '敷 金', category: '資産', subCategory: '投資等', taxType: '対象外', taxFraction: '切り捨て', statementItem: '敷金', borrowLend: '借方' },
  { code: '243', name: '差 入 保 証 金', category: '資産', subCategory: '投資等', taxType: '対象外', taxFraction: '切り捨て', statementItem: '差入保証金', borrowLend: '借方' },
  { code: '246', name: '長 期 貸 付 金', category: '資産', subCategory: '投資等', taxType: '対象外', taxFraction: '切り捨て', statementItem: '長期貸付金', borrowLend: '借方' },
  { code: '247', name: '長 期 固 定 性 預 金', category: '資産', subCategory: '投資等', taxType: '対象外', taxFraction: '切り捨て', statementItem: '長期固定性預金', borrowLend: '借方' },
  { code: '248', name: '預 託 金', category: '資産', subCategory: '投資等', taxType: '対象外', taxFraction: '指定なし', statementItem: 'その他', borrowLend: '借方' },
  { code: '249', name: '関 係 会 社 株 式', category: '資産', subCategory: '投資等', taxType: '対象外', taxFraction: '指定なし', statementItem: '関係会社株式', borrowLend: '借方' },
  { code: '250', name: '関 係 会 社 出 資 金', category: '資産', subCategory: '投資等', taxType: '対象外', taxFraction: '指定なし', statementItem: '関係会社出資金', borrowLend: '借方' },
  { code: '245', name: '長 期 前 払 費 用', category: '資産', subCategory: '投資等', taxType: '対象外', taxFraction: '切り捨て', statementItem: '長期前払費用', borrowLend: '借方' },

  // --- 2頁: 資産 / 繰延資産 ---
  { code: '252', name: '創 立 費', category: '資産', subCategory: '繰延資産', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '創立費', borrowLend: '借方' },
  { code: '253', name: '開 発 費', category: '資産', subCategory: '繰延資産', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '開発費', borrowLend: '借方' },

  // --- 3頁: 負債 / 流動負債 / 仕入債務 ---
  { code: '311', name: '支 払 手 形', category: '負債', subCategory: '仕入債務', taxType: '対象外', taxFraction: '切り捨て', statementItem: '支払手形', borrowLend: '貸方' },
  { code: '312', name: '買 掛 金', category: '負債', subCategory: '仕入債務', taxType: '対象外', taxFraction: '切り捨て', statementItem: '買掛金', borrowLend: '貸方' },

  // --- 3頁: 負債 / 流動負債 / 他流動負債 ---
  { code: '911', name: '仮 受 消 費 税', category: '負債', subCategory: '他流動負債', taxType: '課税売上', taxRate: '標準自動', taxFraction: '指定なし', statementItem: '仮受消費税', borrowLend: '貸方' },
  { code: '313', name: '短 期 借 入 金', category: '負債', subCategory: '他流動負債', taxType: '対象外', taxFraction: '切り捨て', statementItem: '短期借入金', borrowLend: '貸方' },
  { code: '314', name: '未 払 金', category: '負債', subCategory: '他流動負債', taxType: '対象外', taxFraction: '切り捨て', statementItem: '未払金', borrowLend: '貸方' },
  { code: '321', name: '未 払 配 当 金', category: '負債', subCategory: '他流動負債', taxType: '対象外', taxFraction: '切り捨て', statementItem: '未払配当金', borrowLend: '貸方' },
  { code: '322', name: '未 払 役 員 賞 与', category: '負債', subCategory: '他流動負債', taxType: '対象外', taxFraction: '切り捨て', statementItem: '未払役員賞与', borrowLend: '貸方' },
  { code: '323', name: '未 払 法 人 税 等', category: '負債', subCategory: '他流動負債', taxType: '対象外', taxFraction: '切り捨て', statementItem: '未払法人税等', borrowLend: '貸方' },
  { code: '913', name: '未 払 消 費 税', category: '負債', subCategory: '他流動負債', taxType: '対象外', taxFraction: '切り捨て', statementItem: '未払金', borrowLend: '貸方' },
  { code: '319', name: '未 払 費 用', category: '負債', subCategory: '他流動負債', taxType: '対象外', taxFraction: '切り捨て', statementItem: '未払費用', borrowLend: '貸方' },
  { code: '316', name: '預 り 金', category: '負債', subCategory: '他流動負債', taxType: '対象外', taxFraction: '切り捨て', statementItem: '預り金', borrowLend: '貸方' },
  { code: '317', name: '預 り 金 ②', category: '負債', subCategory: '他流動負債', taxType: '対象外', taxFraction: '指定なし', statementItem: '預り金', borrowLend: '貸方' },
  { code: '318', name: '仮 受 金', category: '負債', subCategory: '他流動負債', taxType: '対象外', taxFraction: '切り捨て', statementItem: '仮受金', borrowLend: '貸方' },
  { code: '315', name: '前 受 金', category: '負債', subCategory: '他流動負債', taxType: '対象外', taxFraction: '切り捨て', statementItem: '前受金', borrowLend: '貸方' },
  { code: '324', name: '割 引 手 形', category: '負債', subCategory: '他流動負債', taxType: '対象外', taxFraction: '切り捨て', statementItem: '割引手形', borrowLend: '貸方' },

  // --- 3頁: 負債 / 固定負債 ---
  { code: '352', name: '長 期 借 入 金', category: '負債', subCategory: '固定負債', taxType: '対象外', taxFraction: '切り捨て', statementItem: '長期借入金', borrowLend: '貸方' },
  { code: '354', name: '個 人 借 入 金', category: '負債', subCategory: '固定負債', taxType: '対象外', taxFraction: '切り捨て', statementItem: '長期借入金', borrowLend: '貸方' },
  { code: '353', name: '退 職 給 与 引 当 金', category: '負債', subCategory: '固定負債', taxType: '対象外', taxFraction: '切り捨て', statementItem: '退職給与引当金', borrowLend: '貸方' },

  // --- 3-4頁: 純資産 / 株主資本 ---
  { code: '411', name: '資 本 金', category: '純資産', subCategory: '資本金', taxType: '対象外', taxFraction: '切り捨て', statementItem: '資本金', borrowLend: '貸方' },
  { code: '510', name: '新 株 式 申 込 証 拠 金', category: '純資産', subCategory: '新株式申込証拠金', taxType: '対象外', taxFraction: '指定なし', statementItem: '新株式申込証拠金', borrowLend: '貸方' },
  { code: '421', name: '資 本 準 備 金', category: '純資産', subCategory: '資本準備金', taxType: '対象外', taxFraction: '切り捨て', statementItem: '資本準備金', borrowLend: '貸方' },
  { code: '565', name: '他 資 本 剰 余 金', category: '純資産', subCategory: 'その他資本剰余金', taxType: '対象外', taxFraction: '切り捨て', statementItem: 'その他資本剰余金', borrowLend: '貸方' },
  { code: '422', name: '利 益 準 備 金', category: '純資産', subCategory: '利益準備金', taxType: '対象外', taxFraction: '切り捨て', statementItem: '利益準備金', borrowLend: '貸方' },
  { code: '431', name: '別 途 積 立 金', category: '純資産', subCategory: '任意積立金', taxType: '対象外', taxFraction: '切り捨て', statementItem: '別途積立金', borrowLend: '貸方' },
  { code: '443', name: '繰 越 利 益', category: '純資産', subCategory: '繰越利益剰余金', taxType: '対象外', taxFraction: '指定なし', statementItem: '繰越利益剰余金', borrowLend: '貸方' },
  { code: '590', name: '自 己 株 式', category: '純資産', subCategory: '自己株式', taxType: '対象外', taxFraction: '切り捨て', statementItem: '自己株式', borrowLend: '貸方' },
  { code: '580', name: '株 式 評 価 差 額 金', category: '純資産', subCategory: '評価・換算差額等', taxType: '対象外', taxFraction: '切り捨て', statementItem: 'その他有価証券評価差額金', borrowLend: '貸方' },

  // --- 4-5頁: 売上高 ---
  { code: '511', name: '売 上 高 （ 5 種 ）', category: '売上高', subCategory: '売上高', taxType: '課税売上', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '売上高', borrowLend: '貸方' },
  { code: '513', name: '売 上 高 （ 3 種 ）', category: '売上高', subCategory: '売上高', taxType: '課税売上', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '売上高', borrowLend: '貸方' },
  { code: '514', name: '売 上 高 （ 2 種 ）', category: '売上高', subCategory: '売上高', taxType: '課税売上', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '売上高', borrowLend: '貸方' },
  { code: '515', name: '売 上 高 （ 1 種 ）', category: '売上高', subCategory: '売上高', taxType: '課税売上', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '売上高', borrowLend: '貸方' },
  { code: '512', name: '売 上 高 ②', category: '売上高', subCategory: '売上高', taxType: '課税売上', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '売上高', borrowLend: '貸方' },
  { code: '516', name: '携 帯 手 数 料 売 上', category: '売上高', subCategory: '売上高', taxType: '課税売上', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '売上高', borrowLend: '貸方' },
  { code: '517', name: '携 帯 現 金 売 上', category: '売上高', subCategory: '売上高', taxType: '課税売上', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '売上高', borrowLend: '貸方' },
  { code: '518', name: 'ﾊ ﾟ ｿ ｺ ﾝ ｽ ｸ ｰ ﾙ 売 上', category: '売上高', subCategory: '売上高', taxType: '課税売上', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '売上高', borrowLend: '貸方' },
  { code: '519', name: 'ﾊ ﾟ ｿ ｺ ﾝ 販 売 売 上', category: '売上高', subCategory: '売上高', taxType: '課税売上', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '売上高', borrowLend: '貸方' },
  { code: '521', name: '売 上 値 引 高', category: '売上高', subCategory: '売上高', taxType: '課税売上', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '売上高', borrowLend: '借方' },
  { code: '522', name: '売 上 戻 り 高', category: '売上高', subCategory: '売上高', taxType: '課税売返', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '売上高', borrowLend: '借方' },

  // --- 5頁: 売上原価 / 当期商品仕入 ---
  { code: '611', name: '期 首 商 品 棚 卸 高', category: '売上原価', subCategory: '期首商品棚卸', taxType: '対象外', taxFraction: '切り捨て', statementItem: '期首商品棚卸高', borrowLend: '借方' },
  { code: '550', name: '仕 入 高 　 1', category: '売上原価', subCategory: '当期商品仕入', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '当期商品仕入高', borrowLend: '借方' },
  { code: '551', name: '仕 入 高 　 2', category: '売上原価', subCategory: '当期商品仕入', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '当期商品仕入高', borrowLend: '借方' },
  { code: '552', name: '仕 入 高 　 3', category: '売上原価', subCategory: '当期商品仕入', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '当期商品仕入高', borrowLend: '借方' },
  { code: '553', name: '仕 入 高 　 4', category: '売上原価', subCategory: '当期商品仕入', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '当期商品仕入高', borrowLend: '借方' },
  { code: '615', name: '仕 入 値 引 高', category: '売上原価', subCategory: '当期商品仕入', taxType: '課対仕返', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '当期商品仕入高', borrowLend: '貸方' },
  { code: '616', name: '仕 入 戻 し 高', category: '売上原価', subCategory: '当期商品仕入', taxType: '課対仕返', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '当期商品仕入高', borrowLend: '貸方' },
  { code: '617', name: '期 末 商 品 棚 卸 高', category: '売上原価', subCategory: '期末商品棚卸', taxType: '対象外', taxFraction: '切り捨て', statementItem: '期末商品棚卸高', borrowLend: '貸方' },
  { code: '612', name: '期 首 製 品 棚 卸 高', category: '売上原価', subCategory: '期首製品棚卸', taxType: '対象外', taxFraction: '切り捨て', statementItem: '期首製品棚卸高', borrowLend: '借方' },
  { code: '618', name: '期 末 製 品 棚 卸 高', category: '売上原価', subCategory: '期末製品棚卸', taxType: '対象外', taxFraction: '切り捨て', statementItem: '期末製品棚卸高', borrowLend: '貸方' },

  // --- 5-6頁: 販売管理費 ---
  { code: '711', name: '役 員 報 酬', category: '販売管理費', subCategory: '人件費', taxType: '対象外', taxFraction: '切り捨て', statementItem: '役員報酬', borrowLend: '借方' },
  { code: '712', name: '給 料 手 当', category: '販売管理費', subCategory: '人件費', taxType: '対象外', taxFraction: '切り捨て', statementItem: '給料手当', borrowLend: '借方' },
  { code: '713', name: '賞 　 与', category: '販売管理費', subCategory: '人件費', taxType: '対象外', taxFraction: '切り捨て', statementItem: '賞与', borrowLend: '借方' },
  { code: '714', name: '退 職 金', category: '販売管理費', subCategory: '人件費', taxType: '対象外', taxFraction: '切り捨て', statementItem: '退職金', borrowLend: '借方' },
  { code: '715', name: '雑 　 給', category: '販売管理費', subCategory: '人件費', taxType: '対象外', taxFraction: '切り捨て', statementItem: '雑給', borrowLend: '借方' },
  { code: '716', name: '法 定 福 利 費', category: '販売管理費', subCategory: '人件費', taxType: '対象外', taxFraction: '切り捨て', statementItem: '法定福利費', borrowLend: '借方' },
  { code: '717', name: '福 利 厚 生 費', category: '販売管理費', subCategory: '福利厚生', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '福利厚生費', borrowLend: '借方' },
  { code: '719', name: '運 　 賃', category: '販売管理費', subCategory: '販売費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '運賃', borrowLend: '借方' },
  { code: '718', name: '広 告 宣 伝 費', category: '販売管理費', subCategory: '販売費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '広告宣伝費', borrowLend: '借方' },
  { code: '727', name: '交 際 費', category: '販売管理費', subCategory: '管理費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '交際費', borrowLend: '借方' },
  { code: '722', name: '旅 費 交 通 費', category: '販売管理費', subCategory: '管理費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '旅費交通費', borrowLend: '借方' },
  { code: '724', name: '通 信 費', category: '販売管理費', subCategory: '管理費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '通信費', borrowLend: '借方' },
  { code: '728', name: '消 耗 品 費', category: '販売管理費', subCategory: '管理費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '消耗品費', borrowLend: '借方' },
  { code: '729', name: '事 務 用 品 費', category: '販売管理費', subCategory: '管理費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '事務用品費', borrowLend: '借方' },
  { code: '732', name: '修 繕 費', category: '販売管理費', subCategory: '管理費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '修繕費', borrowLend: '借方' },
  { code: '725', name: '水 道 光 熱 費', category: '販売管理費', subCategory: '管理費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '水道光熱費', borrowLend: '借方' },
  { code: '726', name: '租 税 公 課', category: '販売管理費', subCategory: '公課', taxType: '対象外', taxFraction: '切り捨て', statementItem: '租税公課', borrowLend: '借方' },
  { code: '738', name: '会 議 費', category: '販売管理費', subCategory: '管理費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '会議費', borrowLend: '借方' },
  { code: '739', name: '図 書 費', category: '販売管理費', subCategory: '管理費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '図書費', borrowLend: '借方' },
  { code: '734', name: '支 払 手 数 料', category: '販売管理費', subCategory: '手数料', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '支払手数料', borrowLend: '借方' },
  { code: '737', name: 'リ ー ス 料', category: '販売管理費', subCategory: '管理費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: 'リース料', borrowLend: '借方' },
  { code: '733', name: '保 険 料', category: '販売管理費', subCategory: '管理費', taxType: '対象外', taxFraction: '切り捨て', statementItem: '保険料', borrowLend: '借方' },
  { code: '735', name: '減 価 償 却 費', category: '販売管理費', subCategory: '償却費', taxType: '対象外', taxFraction: '切り捨て', statementItem: '減価償却費', borrowLend: '借方' },
  { code: '731', name: '賃 借 料', category: '販売管理費', subCategory: '管理費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '賃借料', borrowLend: '借方' },
  { code: '743', name: '顧 問 料', category: '販売管理費', subCategory: '報酬', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '業務委託報酬', borrowLend: '借方' },
  { code: '736', name: '貸 倒 繰 入 額 ( 販 )', category: '販売管理費', subCategory: '繰入', taxType: '対象外', taxFraction: '切り捨て', statementItem: '貸倒引当金繰入額', borrowLend: '借方' },
  { code: '745', name: '雑 　 費', category: '販売管理費', subCategory: '管理費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '雑費', borrowLend: '借方' },
  { code: '914', name: '消 費 税', category: '販売管理費', subCategory: '公課', taxType: '対象外', taxFraction: '切り捨て', statementItem: '租税公課', borrowLend: '借方' },
  { code: '790', name: '役 員 賞 与', category: '販売管理費', subCategory: '人件費', taxType: '対象外', taxFraction: '指定なし', statementItem: '役員賞与', borrowLend: '借方' },

  // --- 6頁: 営業外収益 ---
  { code: '811', name: '受 取 利 息', category: '営業外収益', subCategory: '営業外収益', taxType: '非課売上', taxFraction: '切り捨て', statementItem: '受取利息', borrowLend: '貸方' },
  { code: '812', name: '受 取 配 当 金', category: '営業外収益', subCategory: '営業外収益', taxType: '対象外', taxFraction: '切り捨て', statementItem: '受取配当金', borrowLend: '貸方' },
  { code: '813', name: '雑 収 入', category: '営業外収益', subCategory: '営業外収益', taxType: '課税売上', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '雑収入', borrowLend: '貸方' },
  { code: '814', name: '受 取 手 数 料', category: '営業外収益', subCategory: '営業外収益', taxType: '課税売上', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '受取手数料', borrowLend: '貸方' },

  // --- 6頁: 営業外費用 ---
  { code: '821', name: '支 払 利 息', category: '営業外費用', subCategory: '金融費用', taxType: '対象外', taxFraction: '切り捨て', statementItem: '支払利息', borrowLend: '借方' },
  { code: '822', name: '手 形 売 却 損', category: '営業外費用', subCategory: '金融費用', taxType: '対象外', taxFraction: '切り捨て', statementItem: '手形売却損', borrowLend: '借方' },
  { code: '825', name: '支 払 保 証 料', category: '営業外費用', subCategory: '金融費用', taxType: '対象外', taxFraction: '切り捨て', statementItem: '支払保証料', borrowLend: '借方' },
  { code: '827', name: '売 上 割 引', category: '営業外費用', subCategory: '金融費用', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '売上割引', borrowLend: '借方' },
  { code: '824', name: '貸 倒 損 失 ( 営 )', category: '営業外費用', subCategory: '損失', taxType: '課税売倒', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '貸倒損失', borrowLend: '借方' },
  { code: '834', name: '有 価 証 券 売 却 損', category: '営業外費用', subCategory: '損失', taxType: '対象外', taxFraction: '切り捨て', statementItem: '有価証券売却損', borrowLend: '借方' },
  { code: '823', name: '雑 損 失', category: '営業外費用', subCategory: '雑費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '雑損失', borrowLend: '借方' },

  // --- 7頁: 特別損益 ---
  { code: '853', name: '固 定 資 産 売 却 益', category: '特別利益', subCategory: '特別利益', taxType: '課税売上', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '固定資産売却益', borrowLend: '貸方' },
  { code: '851', name: '貸 倒 引 当 金 戻 入', category: '特別利益', subCategory: '特別利益', taxType: '対象外', taxFraction: '切り捨て', statementItem: '貸倒引当金戻入額', borrowLend: '貸方' },
  { code: '854', name: '前 期 損 益 修 正 益', category: '特別利益', subCategory: '特別利益', taxType: '対象外', taxFraction: '切り捨て', statementItem: '前期損益修正益', borrowLend: '貸方' },
  { code: '862', name: '固 定 資 産 売 却 損', category: '特別損失', subCategory: '特別損失', taxType: '対象外', taxFraction: '切り捨て', statementItem: '固定資産売却損', borrowLend: '借方' },
  { code: '864', name: '固 定 資 産 除 却 損', category: '特別損失', subCategory: '特別損失', taxType: '対象外', taxFraction: '切り捨て', statementItem: '固定資産除却損', borrowLend: '借方' },
  { code: '863', name: '前 期 損 益 修 正 損', category: '特別損失', subCategory: '特別損失', taxType: '対象外', taxFraction: '切り捨て', statementItem: '前期損益修正損', borrowLend: '借方' },
  { code: '871', name: '法 人 税 等', category: '特別損失', subCategory: '法人税等', taxType: '対象外', taxFraction: '切り捨て', statementItem: '法人税、住民税及び事業税', borrowLend: '借方' },

  // --- 7-8頁: 製造原価 ---
  { code: '621', name: '[製] 期 首 材 料', category: '製造原価', subCategory: '材料費', taxType: '対象外', taxFraction: '切り捨て', statementItem: '期首材料棚卸高', borrowLend: '借方' },
  { code: '622', name: '[製] 材 料 仕 入 高', category: '製造原価', subCategory: '材料費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '当期材料仕入高', borrowLend: '借方' },
  { code: '624', name: '[製] 期 末 材 料', category: '製造原価', subCategory: '材料費', taxType: '対象外', taxFraction: '切り捨て', statementItem: '期末材料棚卸高', borrowLend: '貸方' },
  { code: '631', name: '[製] 給 料 手 当', category: '製造原価', subCategory: '労務費', taxType: '対象外', taxFraction: '切り捨て', statementItem: '給料手当', borrowLend: '借方' },
  { code: '632', name: '[製] 賞 　 与', category: '製造原価', subCategory: '労務費', taxType: '対象外', taxFraction: '切り捨て', statementItem: '賞与', borrowLend: '借方' },
  { code: '633', name: '[製] 退 職 金', category: '製造原価', subCategory: '労務費', taxType: '対象外', taxFraction: '切り捨て', statementItem: '退職金', borrowLend: '借方' },
  { code: '634', name: '[製] 雑 　 給', category: '製造原価', subCategory: '労務費', taxType: '対象外', taxFraction: '切り捨て', statementItem: '雑給', borrowLend: '借方' },
  { code: '635', name: '[製] 法 定 福 利 費', category: '製造原価', subCategory: '労務費', taxType: '対象外', taxFraction: '切り捨て', statementItem: '法定福利費', borrowLend: '借方' },
  { code: '636', name: '[製] 福 利 厚 生 費', category: '製造原価', subCategory: '労務費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '福利厚生費', borrowLend: '借方' },
  { code: '641', name: '[製] 外 注 加 工 費', category: '製造原価', subCategory: '製造経費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '外注加工費', borrowLend: '借方' },
  { code: '651', name: '[製] 動 力 費', category: '製造原価', subCategory: '製造経費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '動力費', borrowLend: '借方' },
  { code: '661', name: '[製] 旅 費 交 通 費', category: '製造原価', subCategory: '製造経費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '旅費交通費', borrowLend: '借方' },
  { code: '662', name: '[製] 通 信 費', category: '製造原価', subCategory: '製造経費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '通信費', borrowLend: '借方' },
  { code: '658', name: '[製] 消 耗 品 費', category: '製造原価', subCategory: '製造経費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '消耗品費', borrowLend: '借方' },
  { code: '659', name: '[製] 車 両 費', category: '製造原価', subCategory: '製造経費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '車両費', borrowLend: '借方' },
  { code: '654', name: '[製] 修 繕 費', category: '製造原価', subCategory: '製造経費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '修繕費', borrowLend: '借方' },
  { code: '652', name: '[製] 水 道 光 熱 費', category: '製造原価', subCategory: '製造経費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '水道光熱費', borrowLend: '借方' },
  { code: '663', name: '[製] 減 価 償 却 費', category: '製造原価', subCategory: '製造経費', taxType: '対象外', taxFraction: '切り捨て', statementItem: '減価償却費', borrowLend: '借方' },
  { code: '656', name: '[製] 賃 借 料', category: '製造原価', subCategory: '製造経費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '賃借料', borrowLend: '借方' },
  { code: '655', name: '[製] 租 税 公 課', category: '製造原価', subCategory: '製造経費', taxType: '対象外', taxFraction: '切り捨て', statementItem: '租税公課', borrowLend: '借方' },
  { code: '657', name: '[製] 保 険 料', category: '製造原価', subCategory: '製造経費', taxType: '対象外', taxFraction: '切り捨て', statementItem: '保険料', borrowLend: '借方' },
  { code: '673', name: '[製] 雑 　 費', category: '製造原価', subCategory: '製造経費', taxType: '課対仕入', taxRate: '標準自動', taxFraction: '切り捨て', statementItem: '雑費', borrowLend: '借方' },
  { code: '681', name: '[製] 期 首 仕 掛 品', category: '製造原価', subCategory: '仕掛品', taxType: '対象外', taxFraction: '切り捨て', statementItem: '期首仕掛品棚卸高', borrowLend: '借方' },
  { code: '682', name: '[製] 期 末 仕 掛 品', category: '製造原価', subCategory: '仕掛品', taxType: '対象外', taxFraction: '切り捨て', statementItem: '期末仕掛品棚卸高', borrowLend: '貸方' },
  { code: '683', name: '[製] 他 勘 定 振 替', category: '製造原価', subCategory: '仕掛品', taxType: '対象外', taxFraction: '切り捨て', statementItem: '他勘定振替高', borrowLend: '借方' },
];

// 弥生正式コードに準拠した初期自動仕訳ルール
const initialRulesData = [
  { keyword: 'ラクテンカ−ド', accountCode: '314', accountName: '未払金', subAccountCode: '156', subAccountName: '楽天カード', taxType: '課対仕入10%', priority: 100 },
  { keyword: 'エスビ－', accountCode: '550', accountName: '仕入高', subAccountCode: '010', subAccountName: 'SB C&S', taxType: '課対仕入10%', priority: 90 },
  { keyword: 'ＳＢＣ＆Ｓ', accountCode: '550', accountName: '仕入高', subAccountCode: '010', subAccountName: 'SB C&S', taxType: '課対仕入10%', priority: 90 },
  { keyword: 'コニカ', accountCode: '728', accountName: '消耗品費', subAccountCode: '020', subAccountName: 'コニカミノルタ', taxType: '課対仕入10%', priority: 90 },
  { keyword: 'トヨタフアイナンス', accountCode: '737', accountName: 'リース料', subAccountCode: '050', subAccountName: 'トヨタファイナンス', taxType: '課対仕入10%', priority: 90 },
  { keyword: 'ETC', accountCode: '722', accountName: '旅費交通費', subAccountCode: null, subAccountName: 'ETC利用', taxType: '課対仕入10%', priority: 85 },
  { keyword: 'キユウヨ', accountCode: '712', accountName: '給料手当', subAccountCode: null, subAccountName: null, taxType: '対象外', priority: 80 },
  { keyword: '給与', accountCode: '712', accountName: '給料手当', subAccountCode: null, subAccountName: null, taxType: '対象外', priority: 80 },
  { keyword: 'シヤカイホケン', accountCode: '716', accountName: '法定福利費', subAccountCode: null, subAccountName: null, taxType: '対象外', priority: 70 },
  { keyword: 'ご融資利息', accountCode: '821', accountName: '支払利息', subAccountCode: null, subAccountName: null, taxType: '対象外', priority: 60 },
  { keyword: '利息', accountCode: '821', accountName: '支払利息', subAccountCode: null, subAccountName: null, taxType: '対象外', priority: 60 },
  { keyword: 'オリツクス', accountCode: '737', accountName: 'リース料', subAccountCode: '030', subAccountName: 'オリックス', taxType: '課対仕入10%', priority: 50 },
  { keyword: 'アフラツク', accountCode: '733', accountName: '保険料', subAccountCode: '040', subAccountName: 'アフラック', taxType: '対象外', priority: 50 },
  { keyword: 'ドコモ', accountCode: '724', accountName: '通信費', subAccountCode: null, subAccountName: null, taxType: '課対仕入10%', priority: 40 },
  { keyword: '手数料', accountCode: '734', accountName: '支払手数料', subAccountCode: null, subAccountName: null, taxType: '課対仕入10%', priority: 30 },
  { keyword: 'ＢＺ手数料', accountCode: '734', accountName: '支払手数料', subAccountCode: '122', subAccountName: '三菱UFJ BZ', taxType: '課対仕入10%', priority: 35 },
  { keyword: 'ニコス', accountCode: '314', accountName: '未払金', subAccountCode: '155', subAccountName: 'NICOSカード', taxType: '課対仕入10%', priority: 30 },
  { keyword: 'ＤＣ', accountCode: '314', accountName: '未払金', subAccountCode: null, subAccountName: 'DCカード', taxType: '課対仕入10%', priority: 30 },
  { keyword: 'ナゴヤカイギシヨ', accountCode: '738', accountName: '会議費', subAccountCode: null, subAccountName: '名古屋商工会議所', taxType: '対象外', priority: 30 },
  { keyword: 'ニホンカラリング', accountCode: '166', accountName: '売掛金', subAccountCode: '001', subAccountName: '日本カラリング', taxType: '対象外', priority: 50 },
  { keyword: 'ハマジマシヨテン', accountCode: '166', accountName: '売掛金', subAccountCode: '002', subAccountName: '浜島書店', taxType: '対象外', priority: 50 },
  { keyword: 'イセコンブ', accountCode: '166', accountName: '売掛金', subAccountCode: '003', subAccountName: '伊勢昆布', taxType: '対象外', priority: 50 },
  { keyword: 'ヒカリシステム', accountCode: '166', accountName: '売掛金', subAccountCode: '004', subAccountName: 'ヒカリシステム', taxType: '対象外', priority: 50 },
  { keyword: 'トウカイオ－トメ－シヨン', accountCode: '166', accountName: '売掛金', subAccountCode: '005', subAccountName: '東海オートメーション', taxType: '対象外', priority: 50 },
];

// 小口現金用科目マスタ
const initialAccountSubjects = [
  { name: '旅費交通費', code: '722', isForCash: true, displayOrder: 10, description: '電車・バス・タクシー・新幹線等' },
  { name: '消耗品費', code: '728', isForCash: true, displayOrder: 20, description: '文具・日用品・小額什器等' },
  { name: '会議費', code: '738', isForCash: true, displayOrder: 30, description: '社内会議・打合せ時の茶菓子等' },
  { name: '交際費', code: '727', isForCash: true, displayOrder: 40, description: '取引先接待・贈答等' },
  { name: '雑費', code: '745', isForCash: true, displayOrder: 50, description: '少額の手数料・ゴミ処理等' },
  { name: '水道光熱費', code: '725', isForCash: true, displayOrder: 60, description: '水道・電気・ガス代等' },
  { name: '通信費', code: '724', isForCash: true, displayOrder: 70, description: '切手・郵送代等' },
  { name: '新聞図書費', code: '739', isForCash: true, displayOrder: 80, description: '新聞・書籍・雑誌等' },
  { name: '運賃', code: '719', isForCash: true, displayOrder: 90, description: '宅配便・小包配送料等' },
  { name: '売上高', code: '511', isForCash: false, displayOrder: 100, description: '商品・役務の売上' },
  { name: '売掛金', code: '166', isForCash: false, displayOrder: 110, description: '売掛債権' },
  { name: '買掛金', code: '312', isForCash: false, displayOrder: 120, description: '仕入未払金' },
  { name: '仕入高', code: '550', isForCash: false, displayOrder: 130, description: '仕入費用' },
  { name: '賃借料', code: '731', isForCash: false, displayOrder: 140, description: '事務所・倉庫等の賃料' },
  { name: '役員報酬', code: '711', isForCash: false, displayOrder: 150, description: '役員報酬' },
  { name: '給料手当', code: '712', isForCash: false, displayOrder: 160, description: '従業員給料' },
];

async function main() {
  console.log('=== Prisma Database Seeding 開始 ===');

  // 1. 弥生会計 勘定科目マスタ (AccountMaster)
  console.log('1. 弥生会計 勘定科目マスタ (AccountMaster) 投入中...');
  let masterCount = 0;
  for (const master of accountMastersData) {
    await prisma.accountMaster.upsert({
      where: { code: master.code },
      update: master,
      create: master,
    });
    masterCount++;
  }
  console.log(`   ✔ 勘定科目マスタ: ${masterCount}件 登録・更新完了`);

  // 2. 摘要自動仕訳ルール (AccountCodeRule)
  console.log('2. 摘要自動仕訳ルール (AccountCodeRule) 投入中...');
  let ruleCount = 0;
  for (const rule of initialRulesData) {
    await prisma.accountCodeRule.upsert({
      where: { keyword: rule.keyword },
      update: rule,
      create: rule,
    });
    ruleCount++;
  }
  console.log(`   ✔ 自動仕訳ルール: ${ruleCount}件 登録・更新完了`);

  // 3. 小口現金用科目マスタ (AccountSubject)
  console.log('3. 小口現金科目マスタ (AccountSubject) 投入中...');
  for (const s of initialAccountSubjects) {
    await prisma.accountSubject.upsert({
      where: { name: s.name },
      update: {
        code: s.code,
        isForCash: s.isForCash,
        displayOrder: s.displayOrder,
        description: s.description,
        isActive: true,
      },
      create: {
        name: s.name,
        code: s.code,
        isForCash: s.isForCash,
        displayOrder: s.displayOrder,
        description: s.description,
        isActive: true,
      },
    });
  }
  console.log(`   ✔ 小口現金科目マスタ: ${initialAccountSubjects.length}件 登録完了`);

  // 4. 既存取引明細への最新仕訳ルールの再バインド
  console.log('4. 既存の銀行取引明細への最新仕訳ルール再バインド中...');
  const activeRules = await prisma.accountCodeRule.findMany({
    where: { isActive: true },
    orderBy: [{ priority: 'desc' }, { id: 'asc' }],
  });

  const txs = await prisma.bankTransaction.findMany();
  let rebindCount = 0;
  for (const tx of txs) {
    let matchedRule = null;
    for (const rule of activeRules) {
      if (tx.description.includes(rule.keyword)) {
        matchedRule = rule;
        break;
      }
    }

    if (matchedRule) {
      await prisma.bankTransaction.update({
        where: { id: tx.id },
        data: {
          accountCode: matchedRule.accountCode,
          accountName: matchedRule.accountName,
          subAccountCode: matchedRule.subAccountCode,
          subAccountName: matchedRule.subAccountName,
          taxType: matchedRule.taxType,
        },
      });
      rebindCount++;
    } else if (tx.bankName === 'SMBC') {
      await prisma.bankTransaction.update({
        where: { id: tx.id },
        data: {
          accountCode: '821',
          accountName: '支払利息',
          taxType: '対象外',
        },
      });
      rebindCount++;
    }
  }
  console.log(`   ✔ 取引明細再バインド: ${rebindCount}/${txs.length}件 完了`);

  console.log('=== Prisma Database Seeding 完了 ===');
}

main()
  .catch((e) => {
    console.error('シード処理中にエラーが発生しました:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
