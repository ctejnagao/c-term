"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CreditCard, ShoppingCart, Plus, Filter, Search, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

export default function PurchasesPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // デモ用の支払・発注データ
  const samplePurchases = [
    {
      id: "PO-260801",
      orderDate: "2026-08-20",
      supplierName: "日本カラリング株式会社",
      title: "原料・資材調達 (ロットA-40)",
      amount: 1250000,
      paymentDueDate: "2026-09-20",
      status: "支払承認済",
      statusColor: "bg-emerald-100 text-emerald-800",
    },
    {
      id: "PO-260802",
      orderDate: "2026-08-25",
      supplierName: "東日本通信機器サービス",
      title: "通信ネットワーク保守・機器更改",
      amount: 324000,
      paymentDueDate: "2026-09-30",
      status: "支払予定",
      statusColor: "bg-blue-100 text-blue-800",
    },
    {
      id: "PO-260901",
      orderDate: "2026-09-02",
      supplierName: "オフィスサプライ東京",
      title: "消耗品・印刷用紙一式",
      amount: 48500,
      paymentDueDate: "2026-10-15",
      status: "確認中",
      statusColor: "bg-amber-100 text-amber-800",
    },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <ShoppingCart className="w-7 h-7 text-indigo-600" />
              発注・支払管理（買掛・外注）
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              仕入先への発注内容、支払予定期日、買掛金残高をセキュアに管理します。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/pdf-imports"
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              PDF自動取込へ
            </Link>
            <button
              onClick={() => alert("新規発注書の作成機能は近日公開です。")}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              新規発注登録
            </button>
          </div>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">今月支払予定額 (9月)</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">&yen;1,574,000</div>
            <span className="text-[11px] text-emerald-600 flex items-center gap-1 mt-2">
              <CheckCircle2 className="w-3.5 h-3.5" /> 資金繰り確認済
            </span>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">翌月以降支払予定</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">&yen;48,500</div>
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-2">
              <Clock className="w-3.5 h-3.5" /> 10月支払分
            </span>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">未処理・確認待ち</span>
            <div className="text-2xl font-bold text-amber-600 mt-1">1 件</div>
            <span className="text-[11px] text-amber-600 flex items-center gap-1 mt-2">
              <AlertTriangle className="w-3.5 h-3.5" /> 承認待ち伝票あり
            </span>
          </div>
        </div>

        {/* 一覧テーブル */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="発注番号・仕入先名で検索..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="text-xs text-slate-400">
              全 3 件の支払予定
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-3.5">発注番号</th>
                  <th className="p-3.5">発注日</th>
                  <th className="p-3.5">仕入先 / 取引先</th>
                  <th className="p-3.5">件名・内容</th>
                  <th className="p-3.5 text-right">金額 (税込)</th>
                  <th className="p-3.5">支払期日</th>
                  <th className="p-3.5 text-center">ステータス</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {samplePurchases.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-semibold text-indigo-600">{po.id}</td>
                    <td className="p-3.5 text-slate-500">{po.orderDate}</td>
                    <td className="p-3.5 font-medium text-slate-900">{po.supplierName}</td>
                    <td className="p-3.5 text-slate-600">{po.title}</td>
                    <td className="p-3.5 text-right font-bold text-slate-900">&yen;{po.amount.toLocaleString()}</td>
                    <td className="p-3.5 font-medium text-slate-800">{po.paymentDueDate}</td>
                    <td className="p-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${po.statusColor}`}>
                        {po.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );
}
