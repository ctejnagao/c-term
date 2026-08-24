# C-TERP サーバーシステム監視ダッシュボード機能の実装依頼

C-TERPの管理画面（またはシステム設定画面）内に、ホストサーバー（Windows/Linux共通）の稼働状態、リソース使用率、主要サービス（PostgreSQL、Ollama、Next.js/PM2）のステータスを可視化するダッシュボードウィジェット/ページを実装してください。

---

## 1. 取得・表示する指標（Requirements）

### ① ホストシステムリソース
- **CPU使用率 (%)**: リアルタイム/直近値
- **RAM使用量 / 総容量 / 使用率 (%)**
- **Node.js プロセスのメモリ消費量**

### ② 各サービスの稼働ステータス (Healthy / Degraded / Down)
- **PostgreSQL (Database)**: Prismaの接続確認 (`prisma.$queryRaw`SELECT 1) および応答時間(ms)
- **Ollama (LLM)**: `http://127.0.0.1:11434/api/tags` へのGETリクエスト（稼働状態、モデル一覧、応答時間）
- **Next.js サーバー状態**: 稼働時間 (Uptime)

---

## 2. 実装方針（Architecture）

### バックエンド: API Route (`/api/system/metrics`)
Next.js の Route Handler (`src/app/api/system/metrics/route.ts` または `pages/api`) を新規作成してください。
外部コマンド依存ではなく、Node.js標準の `os` モジュールや内部Fetch/Prismaクライアントを利用してクロスプラットフォーム（Windows/Linux対応）で安全にメトリクスを取得します。

```typescript
// 例: 実装イメージ
import { NextResponse } from 'next/server';
import os from 'os';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const startTime = Date.now();
  
  // 1. OS & Memory
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memoryUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);
  const cpuLoad = os.loadavg(); // または簡易計算

  // 2. DB Health Check
  let dbStatus = 'healthy';
  let dbLatency = 0;
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
  } catch (err) {
    dbStatus = 'down';
  }

  // 3. Ollama Health Check
  let ollamaStatus = 'healthy';
  let models: string[] = [];
  try {
    const res = await fetch('[http://127.0.0.1:11434/api/tags](http://127.0.0.1:11434/api/tags)', { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      models = data.models?.map((m: any) => m.name) || [];
    } else {
      ollamaStatus = 'degraded';
    }
  } catch (err) {
    ollamaStatus = 'down';
  }

  return NextResponse.json({
    system: {
      uptime: os.uptime(),
      platform: os.platform(),
      totalMemGB: (totalMem / 1024 / 1024 / 1024).toFixed(2),
      usedMemGB: (usedMem / 1024 / 1024 / 1024).toFixed(2),
      memoryUsagePercent: Number(memoryUsagePercent),
      cpuCores: os.cpus().length,
    },
    services: {
      database: { status: dbStatus, latencyMs: dbLatency },
      ollama: { status: ollamaStatus, models },
      nextjs: { status: 'healthy', uptimeSeconds: process.uptime() }
    },
    timestamp: new Date().toISOString()
  });
}
