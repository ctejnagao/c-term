"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  TrendingUp,
  CreditCard,
  CalendarCheck,
  Landmark,
  Database,
  Brain,
  Layers,
  Activity,
  Lock,
  Unlock,
  ChevronsUpDown,
  ExternalLink,
} from "lucide-react";
import { useBankAuth } from "@/context/BankAuthContext";
import BankAuthModal from "./BankAuthModal";

interface MenuItem {
  label: string;
  href: string;
  color?: string;
  isExternal?: boolean;
  isProtected?: boolean; // パスワード保護フラグ
}

interface MenuSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: MenuItem[];
}

const MENU_SECTIONS: MenuSection[] = [
  {
    id: "receivables",
    title: "売掛管理",
    icon: TrendingUp,
    items: [
      { label: "案件・プロジェクト", href: "/" },
      { label: "見積管理", href: "/estimates" },
      { label: "納品管理", href: "/deliveries" },
      { label: "請求・入金管理", href: "/invoices" },
    ],
  },
  {
    id: "payables",
    title: "買掛・外注管理",
    icon: CreditCard,
    items: [
      { label: "受注・分納管理", href: "/orders", color: "text-teal-300" },
      { label: "発注・支払管理", href: "/purchases" },
      { label: "PDF自動取込", href: "/pdf-imports", color: "text-yellow-300" },
    ],
  },
  {
    id: "contracts",
    title: "定期契約管理",
    icon: CalendarCheck,
    items: [
      { label: "定期契約・一括請求", href: "/contracts", color: "text-blue-300" },
    ],
  },
  {
    id: "funds",
    title: "資金・出納管理",
    icon: Landmark,
    items: [
      { 
        label: "銀行残高・明細取込", 
        href: "/bank-transactions", 
        color: "text-emerald-400 font-medium",
        isProtected: true, // パスワード保護対象
      },
      { label: "社員現金出納", href: "/cash-transactions" },
    ],
  },
  {
    id: "masters",
    title: "マスタ管理",
    icon: Database,
    items: [
      { label: "取引先マスタ", href: "/partners" },
      { label: "社員マスタ", href: "/employees" },
      { label: "勘定科目マスタ", href: "/account-subjects", color: "text-teal-300" },
      { label: "自社基本マスタ", href: "/settings/company" },
    ],
  },
  {
    id: "knowledge",
    title: "社内AI・備忘録",
    icon: Brain,
    items: [
      { label: "社内AI・備忘録", href: "/knowledge" },
      { label: "システム概要 (PDF)", href: "/c-terp-overview.pdf", isExternal: true, color: "text-orange-300" },
    ],
  },
  {
    id: "mocks",
    title: "営業・提案ツール",
    icon: Layers,
    items: [
      { label: "モックカタログ", href: "/mocks", color: "text-teal-300" },
    ],
  },
  {
    id: "system",
    title: "システム管理",
    icon: Activity,
    items: [
      { label: "サーバー監視", href: "/system/monitor", color: "text-blue-300" },
    ],
  },
];

const STORAGE_KEY = "ctej_sidebar_accordion_states";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, openLoginModal } = useBankAuth();

  // 初期値：すべてのセクションを展開
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    return MENU_SECTIONS.reduce((acc, sec) => {
      acc[sec.id] = true;
      return acc;
    }, {} as Record<string, boolean>);
  });

  // localStorage から開閉状態の復元
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setOpenSections((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const toggleAll = () => {
    const anyOpen = Object.values(openSections).some(Boolean);
    const nextState = MENU_SECTIONS.reduce((acc, sec) => {
      acc[sec.id] = !anyOpen;
      return acc;
    }, {} as Record<string, boolean>);

    setOpenSections(nextState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch {
      // ignore
    }
  };

  const handleItemClick = (e: React.MouseEvent, item: MenuItem) => {
    if (item.isProtected && !isAuthenticated) {
      e.preventDefault();
      openLoginModal(item.href);
    }
  };

  return (
    <>
      <aside className="w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col print:hidden select-none border-r border-slate-800 shrink-0">
        {/* ロゴ */}
        <div className="mb-4 px-2">
          <Link href="/" className="hover:opacity-90 transition-opacity block">
            <img
              src="/logo.png"
              alt="C-TERP"
              className="w-44 h-auto object-contain drop-shadow-md brightness-110"
            />
          </Link>
        </div>

        {/* コントロールバー（一括開閉のみシンプルに配置） */}
        <div className="mb-3 px-2 flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2.5">
          <button
            onClick={toggleAll}
            className="w-full flex items-center justify-center gap-1.5 hover:text-slate-200 transition-colors py-1.5 px-2 rounded-md bg-slate-800/40 hover:bg-slate-800 border border-slate-800"
            title="メニューを一括開閉"
          >
            <ChevronsUpDown className="w-3.5 h-3.5 text-indigo-400" />
            <span>{Object.values(openSections).some(Boolean) ? "メニューをすべて閉じる" : "メニューをすべて開く"}</span>
          </button>
        </div>

        {/* アコーディオンナビゲーション */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
          <nav className="flex flex-col gap-2">
            {MENU_SECTIONS.map((section) => {
              const isOpen = !!openSections[section.id];
              const Icon = section.icon;

              return (
                <div key={section.id} className="rounded-lg bg-slate-900/50">
                  {/* アコーディオン見出し */}
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      isOpen
                        ? "text-slate-200 bg-slate-800/50"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-indigo-400/90" />
                      <span className="tracking-wider">{section.title}</span>
                    </div>
                    <div>
                      {isOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform duration-200" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 transition-transform duration-200" />
                      )}
                    </div>
                  </button>

                  {/* サブメニュー項目 */}
                  {isOpen && (
                    <div className="flex flex-col gap-0.5 pl-4 pr-1 py-1 border-l-2 border-slate-800 ml-3 mt-1 animate-fadeIn">
                      {section.items.map((item) => {
                        const isActive = pathname === item.href;
                        const isProtectedLocked = item.isProtected && !isAuthenticated;

                        if (item.isExternal) {
                          return (
                            <a
                              key={item.href}
                              href={item.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded transition-colors hover:bg-slate-800 ${
                                item.color || "text-slate-300"
                              }`}
                            >
                              <span>{item.label}</span>
                              <ExternalLink className="w-3 h-3 opacity-60 ml-1" />
                            </a>
                          );
                        }

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={(e) => handleItemClick(e, item)}
                            className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded transition-colors ${
                              isActive
                                ? "bg-indigo-600 text-white font-medium shadow-sm"
                                : "hover:bg-slate-800/80 text-slate-300"
                            } ${!isActive && item.color ? item.color : ""}`}
                          >
                            <span className="truncate">{item.label}</span>
                            {item.isProtected && (
                              isProtectedLocked ? (
                                <span title="パスワード保護">
                                  <Lock className="w-3 h-3 text-slate-400 shrink-0 ml-1.5" />
                                </span>
                              ) : (
                                <span title="認証済み">
                                  <Unlock className="w-3 h-3 text-emerald-400 shrink-0 ml-1.5 opacity-80" />
                                </span>
                              )
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* フッター情報 */}
        <div className="mt-auto pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between px-2">
          <span>C-TERP v1.0</span>
          <span className="text-[10px] text-slate-600">自社用ERP</span>
        </div>
      </aside>

      {/* 銀行認証モーダル */}
      <BankAuthModal />
    </>
  );
}
