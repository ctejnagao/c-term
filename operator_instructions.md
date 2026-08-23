# 案件: 社員現金出納管理、メインメニュー整理、ローカルLLM備忘録チャットの実装

## 1. メインメニュー（ナビゲーション）の更新
サイドバーまたはヘッダーのナビゲーションメニューを以下の5項目で構成してください：
1. 売掛管理 (`/sales`)
2. 買掛管理 (`/purchases`)
3. 現金出納 (`/cash-transactions`)
4. マスタ管理 (`/masters`)
5. 社内AI・備忘録 (`/knowledge`)

## 2. データベース設計 (Prisma)
`prisma/schema.prisma` に以下の3モデルを追加してください。
既存のユーザー/社員モデル（`User` 等）および物件モデル（`Project` 等）のモデル名を確認し、リレーションを設定してください。

```prisma
// 現金出納トランザクション
model CashTransaction {
  id              Int      @id @default(autoincrement())
  transactionDate DateTime
  type            String   // "OUT"(出金) / "IN"(入金)
  userId          Int
  user            User     @relation(fields: [userId], references: [id])
  projectId       Int?
  project         Project? @relation(fields: [projectId], references: [id])
  categoryType    String?  // 高速代, ガソリン代, 電車代, 備品購入 等
  description     String   // 摘要
  amount          Int
  accountSubject  String   @default("旅費交通費")
  taxCategory     String   @default("仕入10％")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([transactionDate])
  @@index([userId])
  @@index([projectId])
}

// 月次残高・繰越管理
model CashMonthlyBalance {
  id              Int      @id @default(autoincrement())
  yearMonth       String   @unique // "YYYY-MM"
  carryOverAmount Int
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// 社内備忘録・システムメモ
model SystemMemo {
  id        Int      @id @default(autoincrement())
  title     String
  category  String   @default("インフラ")
  content   String
  tags      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([category])
}
