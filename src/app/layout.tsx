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
          <div className="text-xl font-bold mb-8 px-2">C-TERP</div>
          <nav className="flex flex-col gap-2">
            <Link href="/" className="block p-3 rounded hover:bg-gray-800">Project台帳</Link>
            <Link href="/estimates" className="block p-3 rounded hover:bg-gray-800">見積管理</Link>
            <Link href="/deliveries" className="block p-3 rounded hover:bg-gray-800">納品管理</Link>
            <Link href="/invoices" className="block p-3 rounded hover:bg-gray-800">請求・入金管理</Link>
            <Link href="/partners" className="block p-3 rounded hover:bg-gray-800">取引先マスタ</Link>
            <Link href="/employees" className="block p-3 rounded hover:bg-gray-800">社員マスタ</Link>
          </nav>
        </aside>
        <main className="flex-1 overflow-auto flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
