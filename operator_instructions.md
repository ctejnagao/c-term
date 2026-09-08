# タスク指示書: 銀行残高照会・買掛管理（SMBC手入力対応・Excel踏襲UI）

## 1. 運用の前提条件
- **UFJ銀行**: 明細CSVをドラッグ＆ドロップして自動取り込み（自動反映）。
- **SMBC上前津**: 借入金の引き落とし等のみのため、**画面上のテーブルから直接セル編集（手入力）して保存**できる仕様とする。
- 画面レイアウトは `銀行残高2025.xlsx` に準拠し、UFJ列・SMBC列・合算残高計を横並びで表示する。

---

## 2. 実装要件

### A. データモデル (`BankTransaction`) の扱い
- UFJデータ: `bankName = "UFJ"`（CSVから作成）
- SMBCデータ: `bankName = "SMBC"`（画面からの手入力で作成・更新）
  - 手入力項目: `txDate` (日付), `description` (摘要: 例「借入返済」), `withdrawal` (出金額), `deposit` (入金額), `balance` (残高)

### B. 手入力APIの実装 (`src/app/api/bank-transactions/manual/route.ts`)
- SMBC用のレコードを新規追加・更新・削除するエンドポイントを作成。
- リクエスト例:
  ```json
  {
    "id": "（更新時のみ指定）",
    "bankName": "SMBC",
    "txDate": "2026-04-20",
    "description": "借入金返済",
    "withdrawal": 50000,
    "deposit": 0,
    "balance": 150000
  }
  