# C-TERP Phase 1 実装タスク指示書（日本カラリング・JAトービス・Antigravity）

以下の仕様に基づき、Prismaスキーマの更新、マイグレーションの作成、およびNext.js (App Router) のAPIエンドポイントを実装してください。

---

## 1. データベース・型設計の前提条件
- **DB環境**: `ctej-dev-db` (PostgreSQL 16) / データベース名: `ctej_erp_db`
- **重要**: 既存の `Partner.id` は `Int` 型（オートインクリメント）を維持し、新規モデルの `partnerId` も `Int` 型で統一すること。

---

## 2. Prismaスキーマ定義 (`prisma/schema.prisma`)

以下のスキーマを反映してください。

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// 既存テーブル：Partner (IDはInt型を維持)
model Partner {
  id           Int                @id @default(autoincrement())
  code         String             @unique
  name         String
  partnerType  String             // "CUSTOMER" | "VENDOR"
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt
  deletedAt    DateTime?

  orders       Order[]
  contracts    RecurringContract[]
}

// -------------------------------------------------------------
// 1. 日本カラリング要件（PDF取込・発注・分納管理）
// -------------------------------------------------------------
model PdfImport {
  id           String       @id @default(uuid())
  fileName     String
  fileUrl      String
  rawText      String?      @db.Text
  parsedData   Json?
  status       String       @default("PENDING") // PENDING, PROCESSED, FAILED
  createdAt    DateTime     @default(now())
  deletedAt    DateTime?

  orders       Order[]
}

model Order {
  id              String         @id @default(uuid())
  orderNumber     String         @unique
  partnerId       Int            // Partner.id (Int) に合わせた外部キー
  partner         Partner        @relation(fields: [partnerId], references: [id])
  pdfImportId     String?
  pdfImport       PdfImport?     @relation(fields: [pdfImportId], references: [id])
  totalAmount     Decimal        @db.Decimal(12, 2)
  status          String         @default("OPEN") // OPEN, PARTIALLY_DELIVERED, COMPLETED, CANCELLED
  orderDate       DateTime
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  deletedAt       DateTime?

  orderItems      OrderItem[]
  deliveries      Delivery[]
}

model OrderItem {
  id              String         @id @default(uuid())
  orderId         String
  order           Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)
  itemName        String
  quantity        Int            // 総発注数量
  unitPrice       Decimal        @db.Decimal(10, 2)
  deliveredQty    Int            @default(0) // 納品済累計数量
  createdAt       DateTime       @default(now())
  deletedAt       DateTime?

  deliveryItems   DeliveryItem[]
}

model Delivery {
  id              String         @id @default(uuid())
  deliveryNumber  String         @unique // 分納伝票番号
  orderId         String
  order           Order          @relation(fields: [orderId], references: [id])
  deliveryDate    DateTime
  status          String         @default("SCHEDULED") // SCHEDULED, DELIVERED, CANCELLED
  createdAt       DateTime       @default(now())
  deletedAt       DateTime?

  deliveryItems   DeliveryItem[]
}

model DeliveryItem {
  id              String         @id @default(uuid())
  deliveryId      String
  delivery        Delivery       @relation(fields: [deliveryId], references: [id], onDelete: Cascade)
  orderItemId     String
  orderItem       OrderItem      @relation(fields: [orderItemId], references: [id])
  quantity        Int            // 今回納品数
  createdAt       DateTime       @default(now())
  deletedAt       DateTime?
}

// -------------------------------------------------------------
// 2. JAトービス要件（定期契約・自動請求）
// -------------------------------------------------------------
model RecurringContract {
  id               String       @id @default(uuid())
  contractNumber   String       @unique
  partnerId        Int          // Partner.id (Int) に合わせた外部キー
  partner          Partner      @relation(fields: [partnerId], references: [id])
  title            String
  billingCycle     String       @default("MONTHLY")
  billingDay       Int          @default(25)
  amount           Decimal      @db.Decimal(12, 2)
  startDate        DateTime
  endDate          DateTime?
  autoRenew        Boolean      @default(true)
  status           String       @default("ACTIVE") // ACTIVE, PAUSED, TERMINATED
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
  deletedAt        DateTime?

  recurringInvoices RecurringInvoice[]
}

model RecurringInvoice {
  id               String            @id @default(uuid())
  contractId       String
  contract         RecurringContract @relation(fields: [contractId], references: [id])
  targetPeriod     String            // 例: "2026-09"
  amount           Decimal           @db.Decimal(12, 2)
  issuedDate       DateTime
  status           String            @default("ISSUED") // ISSUED, PAID, CANCELLED
  createdAt        DateTime          @default(now())
  deletedAt        DateTime?
}

// -------------------------------------------------------------
// 3. Antigravity要件（不変監査ログ）
// -------------------------------------------------------------
model AuditLog {
  id         String   @id @default(uuid())
  entityName String   // "Order", "Delivery", "PdfImport", "RecurringContract" 等
  entityId   String
  action     String   // "PDF_IMPORT_ORDER_CREATE", "SPLIT_DELIVERY", "AUTO_GENERATE" 等
  diff       Json?    // 変更データ・ペイロード
  userId     String?
  ipAddress  String?
  createdAt  DateTime @default(now())
}
3. 実装対象APIエンドポイント
① PDF取込・注文生成API: app/api/pdf-import/order/route.ts
メソッド: POST

処理内容:

受信したパース済みデータをもとに PdfImport、Order、OrderItem（deliveredQty = 0）をトランザクション内で作成。

発注番号（orderNumber）の重複を検証。

AuditLog に action: "PDF_IMPORT_ORDER_CREATE" で監査ログを追記。

② 分納登録API: app/api/deliveries/split/route.ts
メソッド: POST

処理内容:

トランザクション内で実行。

各明細の残数バリデーション（quantity - deliveredQty < request.quantity の場合はロールバック）。

Delivery および DeliveryItem を作成し、OrderItem.deliveredQty を加算。

全明細が満了した場合は Order.status を COMPLETED、残数がある場合は PARTIALLY_DELIVERED に更新。

AuditLog に action: "SPLIT_DELIVERY" で監査ログを追記。

③ 定期契約一括請求API: app/api/contracts/recurring-batch/route.ts
メソッド: POST

処理内容:

指定された targetPeriod（例: "2026-09"）の請求が未作成のアクティブな RecurringContract（deletedAt: null）を抽出。

RecurringInvoice を一括作成。

各契約ごとに AuditLog に action: "AUTO_GENERATE" で監査ログを追記。

4. Antigravity 開発・実装規約（厳守）
論理削除 (Soft Delete):

全てのデータ参照クエリに where: { deletedAt: null } を適用すること。

削除処理は物理削除（DELETE）ではなく deletedAt: new Date() の更新を行うこと。

監査ログの不変性:

AuditLog への更新（UPDATE）および削除（DELETE）操作は禁止（追記のみ）。

トランザクション整合性:

複数テーブルの更新・ステータス連動は必ず prisma.$transaction 内で実行すること。

5. 成果物
prisma/schema.prisma

各APIルートの実装コード

マイグレーション実行コマンド（npx prisma migrate dev ...）
