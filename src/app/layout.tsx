import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { BankAuthProvider } from "@/context/BankAuthContext";
import "./globals.css";

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
        <BankAuthProvider>
          <Sidebar />
          <main className="flex-1 overflow-auto flex flex-col min-w-0">
            {children}
          </main>
        </BankAuthProvider>
      </body>
    </html>
  );
}
