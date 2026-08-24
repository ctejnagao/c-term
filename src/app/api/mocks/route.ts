import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const count = await prisma.mockPrototype.count();

    if (count === 0) {
      // Seed data if none exist
      await prisma.mockPrototype.createMany({
        data: [
          {
            title: '受発注・承認フローモック',
            description: '社内承認ワークフローと電子発注書自動発行機能の動作確認用デモ。',
            category: '受発注',
            tags: '承認フロー, 電子帳簿保存法, 製造業',
            repoUrl: 'https://github.com/example/cterp-order-mock',
            composeCmd: 'git clone https://github.com/example/cterp-order-mock.git && cd cterp-order-mock && docker compose up -d',
            port: '8081',
            defaultCreds: 'ID: admin / Pass: admin',
            version: 'v1.2.0',
          },
          {
            title: 'バーコード在庫管理モック',
            description: 'スマホやハンディターミナルでのバーコード読み取りによる入出庫・棚卸管理のモック。',
            category: '管理系',
            tags: '在庫管理, バーコード, ハンディターミナル',
            repoUrl: 'https://github.com/example/cterp-inventory-mock',
            composeCmd: 'git clone https://github.com/example/cterp-inventory-mock.git && cd cterp-inventory-mock && docker compose up -d',
            port: '8082',
            defaultCreds: 'ID: user1 / Pass: password',
            version: 'v2.0.1',
          },
          {
            title: '不動産物件管理・契約システムモック',
            description: '賃貸物件の空室状況、契約書PDF自動生成、更新時期アラートのデモンストレーション。',
            category: '不動産',
            tags: '不動産, 契約管理, PDF生成',
            repoUrl: 'https://github.com/example/cterp-realestate-mock',
            composeCmd: 'git clone https://github.com/example/cterp-realestate-mock.git && cd cterp-realestate-mock && docker compose up -d',
            port: '8083',
            defaultCreds: 'ID: demo / Pass: demo',
            version: 'v0.9.5',
          },
        ]
      });
    }

    const mocks = await prisma.mockPrototype.findMany({
      orderBy: { id: 'asc' },
    });

    return NextResponse.json(mocks);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch mocks' }, { status: 500 });
  }
}
