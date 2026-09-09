# タスク指示書: 弥生会計勘定科目マスタのシード投入および仕訳自動バインド・銀行残高照会UIの実装

## 1. 目的と概要
受領した弥生会計の勘定科目一覧表（㈱コムテックエンタープライズ・全8ページ）に基づき、勘定科目マスタ (`AccountMaster`) および自動仕訳ルール (`AccountCodeRule`) の初期シードを作成・投入します。
UFJ CSV取込時や楽天カード取込時にこれらの科目コード（例: UFJ=122, SMBC=125, 旅費交通費=722, 通信費=724）が自動適用され、現行Excel風の画面で確認・編集できるようにします。

---

## 2. データベース拡張 (`prisma/schema.prisma`)

既存のスキーマに `AccountMaster` を追加し、`AccountCodeRule` と紐付けられるようにします。

```prisma
// 弥生会計 勘定科目マスタ
model AccountMaster {
  id             String            @id @default(cuid())
  code           String            @unique // 例: "122", "722", "724"
  name           String            // 例: "三菱UFJ銀行", "旅費交通費"
  category       String            // "流動資産", "販売管理費", "営業外費用" 等
  taxType        String            @default("対象外") // "課対仕入", "課税売上", "対象外"
  statementItem  String?           // 決算書項目 (例: "普通預金", "旅費交通費")
  borrowLend     String?           // "借方" / "貸方"
  rules          AccountCodeRule[]
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
}

// 摘要マッチングルール
model AccountCodeRule {
  id             Int            @id @default(autoincrement())
  keyword        String         @unique // "ETC", "コニカミノルタ", "トヨタフアイナンス"
  accountCode    String?        // 弥生コード (例: "722")
  accountName    String         // 科目名
  subAccountCode String?        // 補助コード
  subAccountName String?        // 補助名
  taxType        String         @default("課対仕入")
  priority       Int            @default(0)
  isActive       Boolean        @default(true)
  accountMaster  AccountMaster? @relation(fields: [accountCode], references: [code], onDelete: SetNull)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
}
```

---

## 3. 運用の前提条件（SMBC・UFJ・Excel踏襲UI）
- **UFJ銀行**: 明細CSVをドラッグ＆ドロップして自動取り込み（最新ルールで自動科目バインド）。
- **SMBC上前津**: 借入金の引き落とし等のみのため、**画面上のテーブルから直接セル編集（手入力）して保存**できる仕様（`src/app/api/bank-transactions/manual/route.ts`）。
- 画面レイアウトは `銀行残高2025.xlsx` に準拠し、UFJ列・SMBC列・合算残高計を横並びで表示する。
- 画面上で科目を編集する際、弥生会計勘定科目マスタ (`AccountMaster`) の候補から選択・補完できる。