# タスク指示書: 銀行残高照会・買掛管理画面および取込APIの実装（Local開発環境）

## 1. 前提状況
- DBにはすでに弥生会計の勘定科目マスタ (`AccountMaster`) および推論ルール (`AccountCodeRule`) が登録済みです。
- 先ほど `npx prisma db seed` 実行時に `prisma.config.ts` 側の設定不足エラーが発生したため、今後のサーバー反映に備えて設定を整えておいてください。

---

## 2. 実施タスク

### タスク1: `prisma.config.ts` のシード設定修正
CTEJ-Serverでも `npx prisma db seed` がそのまま通るよう、プロジェクト直下の `prisma.config.ts` の `migrations` ブロックにシードコマンドを追加してください。
```typescript
migrations: {
  seed: 'npx tsx ./prisma/seed.ts',
},
