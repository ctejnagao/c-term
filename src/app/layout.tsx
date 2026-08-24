import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from 'next/link';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "C-TERP",
  description: "C-TERP (自社用ERP)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-gray-50 text-gray-900">
        <aside className="w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col print:hidden">
          <div className="mb-8 px-2">
            <Link href="/">
              <img src="/logo.png" alt="C-TERP" className="w-48 h-auto object-contain drop-shadow-md brightness-110" />
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto">
            <nav className="flex flex-col gap-6">
              
              {/* 1. 売掛管理 */}
              <div>
                <h2 className="px-3 text-sm font-bold text-gray-300 border-b border-slate-700 pb-1 mb-2 tracking-wider">売掛管理</h2>
                <div className="flex flex-col gap-1 pl-2">
                  <Link href="/" className="block px-3 py-2 text-sm rounded hover:bg-gray-800">案件・プロジェクト</Link>
                  <Link href="/estimates" className="block px-3 py-2 text-sm rounded hover:bg-gray-800">見積管理</Link>
                  <Link href="/deliveries" className="block px-3 py-2 text-sm rounded hover:bg-gray-800">納品管理</Link>
                  <Link href="/invoices" className="block px-3 py-2 text-sm rounded hover:bg-gray-800">請求・入金管理</Link>
                </div>
              </div>

              {/* 2. 買掛管理 */}
              <div>
                <h2 className="px-3 text-sm font-bold text-gray-300 border-b border-slate-700 pb-1 mb-2 tracking-wider">買掛管理</h2>
                <div className="flex flex-col gap-1 pl-2">
                  <Link href="/purchases" className="block px-3 py-2 text-sm rounded hover:bg-gray-800">発注・支払管理</Link>
                </div>
              </div>

              {/* 3. 現金出納 */}
              <div>
                <h2 className="px-3 text-sm font-bold text-gray-300 border-b border-slate-700 pb-1 mb-2 tracking-wider">現金出納</h2>
                <div className="flex flex-col gap-1 pl-2">
                  <Link href="/cash-transactions" className="block px-3 py-2 text-sm rounded hover:bg-gray-800">社員現金出納</Link>
                </div>
              </div>

              {/* 4. マスタ管理 */}
              <div>
                <h2 className="px-3 text-sm font-bold text-gray-300 border-b border-slate-700 pb-1 mb-2 tracking-wider">マスタ管理</h2>
                <div className="flex flex-col gap-1 pl-2">
                  <Link href="/partners" className="block px-3 py-2 text-sm rounded hover:bg-gray-800">取引先マスタ</Link>
                  <Link href="/employees" className="block px-3 py-2 text-sm rounded hover:bg-gray-800">社員マスタ</Link>
                  <Link href="/settings/company" className="block px-3 py-2 text-sm rounded hover:bg-gray-800">自社基本マスタ</Link>
                </div>
              </div>

              {/* 5. 社内AI・備忘録 */}
              <div>
                <h2 className="px-3 text-sm font-bold text-gray-300 border-b border-slate-700 pb-1 mb-2 tracking-wider">社内AI・備忘録</h2>
                <div className="flex flex-col gap-1 pl-2">
                  <Link href="/knowledge" className="block px-3 py-2 text-sm rounded hover:bg-gray-800">社内AI・備忘録</Link>
                </div>
              </div>

              {/* 6. 営業・提案ツール */}
              <div>
                <h2 className="px-3 text-sm font-bold text-gray-300 border-b border-slate-700 pb-1 mb-2 tracking-wider">営業・提案ツール</h2>
                <div className="flex flex-col gap-1 pl-2">
                  <Link href="/mocks" className="block px-3 py-2 text-sm rounded hover:bg-gray-800 text-teal-300">モックカタログ</Link>
                </div>
              </div>

              {/* 7. システム管理 */}
              <div>
                <h2 className="px-3 text-sm font-bold text-gray-300 border-b border-slate-700 pb-1 mb-2 tracking-wider">システム管理</h2>
                <div className="flex flex-col gap-1 pl-2">
                  <Link href="/system/monitor" className="block px-3 py-2 text-sm rounded hover:bg-gray-800 text-blue-300">サーバー監視</Link>
                </div>
              </div>

            </nav>
          </div>
        </aside>
        <main className="flex-1 overflow-auto flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
