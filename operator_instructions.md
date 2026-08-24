以下の要件で、C-TERP (Next.js 14 / App Router / Tailwind CSS / Prisma or PostgreSQL) に
「モック・プロトタイプ カタログ画面 (/mocks)」を新規実装してください。

### 1. 画面仕様 (`app/mocks/page.tsx`)
- 社員が客先ヒアリング時にデモ用モックを検索・即座に起動するためのカタログ画面
- **ヘッダーエリア**:
  - タイトル「モック・プロトタイプ カタログ」
  - キーワード検索バー（モック名、業種、タグでフィルタ）
  - カテゴリ/業種タグフィルター（製造、受発注、不動産、管理系など）
- **モック一覧（グリッドカード表示）**:
  - モック名 / バージョン
  - ターゲット業種・業務タグ（Badge）
  - 概要説明（2〜3行）
  - ポート番号 / デフォルトログイン情報（例: admin / admin）
  - **起動コマンドエリア**（黒背景コードブロック）:
    - 例: `git clone <URL> && cd <DIR> && docker compose up -d`
    - **「📋 コピー」ボタン**: クリックで即座にクリップボードへコピーし、トースト通知（"コピーしました"）を表示
  - 外部リンク: Gitリポジトリへのリンクボタン

### 2. データ構造 / モックデータ
- DB（Prisma / SQL）に `Mock` モデルを作成（または初期状態として `mocks` 定数データを作成）:
  - id, title, description, category, tags, repoUrl, composeCmd, port, defaultCreds, thumbnailUrl
- 3〜4件のリアルな初期シードデータを登録（例: 「受発注・承認フローモック」「バーコード在庫管理モック」等）

### 3. デザイン・UI
- 既存の C-TERP のテーマ（Tailwind CSS / ダーク・ライト対応）に合わせる
- lucide-react のアイコン（Copy, Check, ExternalLink, Terminal, Search 等）を活用
- レスポンシブ対応

実装後、ビルドエラーがないことを確認し、ブラウザで `/mocks` の表示とコピー機能の動作確認を行ってください。
