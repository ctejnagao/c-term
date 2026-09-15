"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Laptop,
  Building2,
  Warehouse,
  Truck,
  Package,
  Search,
  Plus,
  ArrowRightLeft,
  History,
  Copy,
  Check,
  Edit2,
  Calendar,
  Cpu,
  Info,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  Filter,
} from "lucide-react";

interface InventoryLog {
  id: number;
  actionType: "INBOUND" | "OUTBOUND" | "TRANSFER";
  quantity: number;
  date: string;
  fromLocation?: string | null;
  toLocation?: string | null;
  purpose?: string | null;
  handler?: string | null;
  remarks?: string | null;
}

interface InventoryItem {
  id: number;
  itemCode: string | null;
  partnerId: number | null;
  itemName: string;
  serialNumber: string | null;
  os: string | null;
  spec: string | null;
  purchaseDate: string | null;
  inboundDate: string | null;
  location: string;
  initialQty: number;
  currentQty: number;
  shippedQty: number;
  status: "STORED" | "PARTIALLY_DELIVERED" | "DEPLETED" | "DISPOSED";
  remarks: string | null;
  logs: InventoryLog[];
  partner?: {
    id: number;
    name: string;
    shortName: string | null;
  } | null;
}

interface InventorySummary {
  totalInitialQty: number;
  totalCurrentQty: number;
  ourLocationQty: number;
  hikariLocationQty: number;
  totalShippedQty: number;
  itemTypesCount: number;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary>({
    totalInitialQty: 0,
    totalCurrentQty: 0,
    ourLocationQty: 0,
    hikariLocationQty: 0,
    totalShippedQty: 0,
    itemTypesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocationTab, setSelectedLocationTab] = useState<string>("ALL");

  // コピー完了状態
  const [copied, setCopied] = useState(false);

  // モーダル管理
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isOutboundModalOpen, setIsOutboundModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isQuickSummaryModalOpen, setIsQuickSummaryModalOpen] = useState(false);

  // 選択中のアイテム
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // フォームデータ: 新規受託登録
  const [createForm, setCreateForm] = useState({
    itemCode: "",
    itemName: "",
    serialNumber: "",
    os: "Windows 11 Pro 64bit",
    spec: "",
    purchaseDate: "",
    inboundDate: new Date().toISOString().split("T")[0],
    location: "弊社",
    initialQty: 1,
    remarks: "",
  });

  // フォームデータ: 出庫
  const [outboundForm, setOutboundForm] = useState({
    quantity: 1,
    date: new Date().toISOString().split("T")[0],
    toLocation: "JCC様現場（第1工場）",
    purpose: "ライン制御PC障害による緊急代替機交換",
    handler: "コムテック担当",
    remarks: "",
  });

  // フォームデータ: 拠点間移動
  const [transferForm, setTransferForm] = useState({
    toLocation: "仕入先：光システム",
    quantity: 1,
    date: new Date().toISOString().split("T")[0],
    handler: "社内担当",
    remarks: "",
  });

  // フォームデータ: 編集
  const [editForm, setEditForm] = useState({
    itemCode: "",
    itemName: "",
    serialNumber: "",
    os: "",
    spec: "",
    purchaseDate: "",
    inboundDate: "",
    location: "弊社",
    currentQty: 1,
    initialQty: 1,
    status: "STORED",
    remarks: "",
  });

  // 処理中フラグ
  const [submitting, setSubmitting] = useState(false);

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/inventory");
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // フィルタ処理
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // ロケーションタブ
      if (selectedLocationTab === "OUR") {
        if (!item.location.includes("弊社") && !item.location.includes("自社")) {
          return false;
        }
      } else if (selectedLocationTab === "HIKARI") {
        if (!item.location.includes("光システム")) {
          return false;
        }
      } else if (selectedLocationTab === "DEPLETED") {
        if (item.status !== "DEPLETED") {
          return false;
        }
      }

      // 検索クエリ
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.itemName.toLowerCase().includes(q);
        const matchesCode = item.itemCode?.toLowerCase().includes(q);
        const matchesSerial = item.serialNumber?.toLowerCase().includes(q);
        const matchesOs = item.os?.toLowerCase().includes(q);
        const matchesSpec = item.spec?.toLowerCase().includes(q);
        const matchesRemarks = item.remarks?.toLowerCase().includes(q);
        const matchesLoc = item.location.toLowerCase().includes(q);
        return (
          matchesName ||
          matchesCode ||
          matchesSerial ||
          matchesOs ||
          matchesSpec ||
          matchesRemarks ||
          matchesLoc
        );
      }

      return true;
    });
  }, [items, selectedLocationTab, searchQuery]);

  // 「即答テキスト」を生成
  const generateQuickSummaryText = () => {
    const today = new Date().toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const ourItems = items.filter(
      (i) => i.location.includes("弊社") || i.location.includes("自社")
    );
    const hikariItems = items.filter((i) => i.location.includes("光システム"));

    let text = `【日本カラリング（JCC）様 バックアップPC保管状況（${today} 現在）】\n`;
    text += `■ 現在庫台数: 合計 ${summary.totalCurrentQty}台\n`;
    text += `  ・弊社（コムテック）保管: ${summary.ourLocationQty}台\n`;
    text += `  ・仕入先（光システム）保管: ${summary.hikariLocationQty}台\n`;
    text += `  ・出庫済累計: ${summary.totalShippedQty}台\n\n`;

    text += `■ 弊社（コムテック）保管内訳（${summary.ourLocationQty}台）:\n`;
    if (ourItems.length === 0) {
      text += `  なし\n`;
    } else {
      ourItems.forEach((item) => {
        text += `  ・${item.itemName} (${item.os || "OS未記載"}) : ${item.currentQty}台 [管理No: ${item.itemCode || "未設定"}]\n`;
        if (item.spec) text += `    Spec: ${item.spec}\n`;
      });
    }

    text += `\n■ 仕入先（光システム）保管内訳（${summary.hikariLocationQty}台）:\n`;
    if (hikariItems.length === 0) {
      text += `  なし\n`;
    } else {
      hikariItems.forEach((item) => {
        text += `  ・${item.itemName} (${item.os || "OS未記載"}) : ${item.currentQty}台 [管理No: ${item.itemCode || "未設定"}]\n`;
        if (item.spec) text += `    Spec: ${item.spec}\n`;
      });
    }

    // 直近の出庫ログを探す
    const allLogs: Array<InventoryLog & { itemName: string }> = [];
    items.forEach((item) => {
      item.logs.forEach((log) => {
        if (log.actionType === "OUTBOUND") {
          allLogs.push({ ...log, itemName: item.itemName });
        }
      });
    });
    allLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (allLogs.length > 0) {
      text += `\n■ 直近の出庫履歴:\n`;
      allLogs.slice(0, 3).forEach((l) => {
        const d = new Date(l.date).toLocaleDateString("ja-JP");
        text += `  ・${d}: ${l.itemName} ${l.quantity}台 → ${l.toLocation || "現場"} (目的: ${l.purpose || "障害代替"})\n`;
      });
    }

    return text;
  };

  // 即答テキストのコピー処理
  const handleCopyQuickSummary = () => {
    const text = generateQuickSummaryText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // 新規受託PC登録
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateModalOpen(false);
        fetchData();
        // フォームリセット
        setCreateForm({
          itemCode: "",
          itemName: "",
          serialNumber: "",
          os: "Windows 11 Pro 64bit",
          spec: "",
          purchaseDate: "",
          inboundDate: new Date().toISOString().split("T")[0],
          location: "弊社",
          initialQty: 1,
          remarks: "",
        });
      } else {
        alert("登録エラー: " + data.error);
      }
    } catch (err) {
      alert("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  // 出庫処理実行
  const handleOutboundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/inventory/${selectedItem.id}/outbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(outboundForm),
      });
      const data = await res.json();
      if (data.success) {
        setIsOutboundModalOpen(false);
        fetchData();
      } else {
        alert("出庫エラー: " + data.error);
      }
    } catch (err) {
      alert("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  // 拠点間移動実行
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/inventory/${selectedItem.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transferForm),
      });
      const data = await res.json();
      if (data.success) {
        setIsTransferModalOpen(false);
        fetchData();
      } else {
        alert("移動エラー: " + data.error);
      }
    } catch (err) {
      alert("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  // 編集保存実行
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/inventory/${selectedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditModalOpen(false);
        fetchData();
      } else {
        alert("更新エラー: " + data.error);
      }
    } catch (err) {
      alert("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  // モーダルを開くハンドラ群
  const openOutboundModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setOutboundForm({
      quantity: 1,
      date: new Date().toISOString().split("T")[0],
      toLocation: "JCC様現場（第1工場）",
      purpose: "ライン制御PC障害による緊急代替機交換",
      handler: "コムテック担当",
      remarks: "",
    });
    setIsOutboundModalOpen(true);
  };

  const openTransferModal = (item: InventoryItem) => {
    setSelectedItem(item);
    const targetLoc = item.location.includes("弊社")
      ? "仕入先：光システム"
      : "弊社";
    setTransferForm({
      toLocation: targetLoc,
      quantity: Math.min(1, item.currentQty),
      date: new Date().toISOString().split("T")[0],
      handler: "社内担当",
      remarks: "",
    });
    setIsTransferModalOpen(true);
  };

  const openHistoryModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsHistoryModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setEditForm({
      itemCode: item.itemCode || "",
      itemName: item.itemName,
      serialNumber: item.serialNumber || "",
      os: item.os || "",
      spec: item.spec || "",
      purchaseDate: item.purchaseDate
        ? new Date(item.purchaseDate).toISOString().split("T")[0]
        : "",
      inboundDate: item.inboundDate
        ? new Date(item.inboundDate).toISOString().split("T")[0]
        : "",
      location: item.location,
      currentQty: item.currentQty,
      initialQty: item.initialQty,
      status: item.status,
      remarks: item.remarks || "",
    });
    setIsEditModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 space-y-6">
      {/* ページヘッダー */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">
                  JCC預託バックアップPC 在庫管理
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  日本カラリング様 専用台帳
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                JCC様よりお預かりしている予備機・バックアップPCの分散保管状況（弊社／仕入先：光システム）と出庫履歴の即時確認・返答システム
              </p>
            </div>
          </div>
        </div>

        {/* ヘッダーアクションボタン */}
        <div className="flex items-center gap-2.5 self-end md:self-center">
          <button
            onClick={() => setIsQuickSummaryModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm"
          >
            <Copy className="w-4 h-4 text-indigo-600" />
            <span>即答テキスト作成</span>
          </button>

          <button
            onClick={handleCopyQuickSummary}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm ${
              copied
                ? "bg-green-600 text-white"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>コピー完了！</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>最新状況を1秒コピー</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>新規PC受託登録</span>
          </button>
        </div>
      </div>

      {/* KPIサマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* 現在庫合計 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              現在庫 合計
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">
              {summary.totalCurrentQty}{" "}
              <span className="text-sm font-normal text-gray-500">台</span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              全{summary.itemTypesCount}型番 / 受託総数 {summary.totalInitialQty}台
            </div>
          </div>
        </div>

        {/* 弊社保管 */}
        <div className="bg-white p-5 rounded-xl border border-blue-200 shadow-sm flex items-center gap-4 bg-gradient-to-br from-white to-blue-50/30">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
              🏢 弊社保管
            </div>
            <div className="text-2xl font-bold text-blue-900 mt-0.5">
              {summary.ourLocationQty}{" "}
              <span className="text-sm font-normal text-blue-700">台</span>
            </div>
            <div className="text-xs text-blue-600 mt-0.5 font-medium">
              社内ラック・即時出荷可能
            </div>
          </div>
        </div>

        {/* 光システム保管 */}
        <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm flex items-center gap-4 bg-gradient-to-br from-white to-amber-50/30">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              🏭 光システム保管
            </div>
            <div className="text-2xl font-bold text-amber-900 mt-0.5">
              {summary.hikariLocationQty}{" "}
              <span className="text-sm font-normal text-amber-700">台</span>
            </div>
            <div className="text-xs text-amber-600 mt-0.5 font-medium">
              仕入先倉庫・保守メンテ済
            </div>
          </div>
        </div>

        {/* 出庫済累計 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              🚚 累計出庫済
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">
              {summary.totalShippedQty}{" "}
              <span className="text-sm font-normal text-gray-500">台</span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              JCC現場・ライン納品済
            </div>
          </div>
        </div>

        {/* 即時返答スピード指標 */}
        <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm flex items-center gap-4 bg-gradient-to-br from-white to-emerald-50/20 col-span-2 md:col-span-1">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Check className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              状態把握・返答
            </div>
            <div className="text-lg font-bold text-emerald-900 mt-0.5">
              即時返答 OK
            </div>
            <div className="text-xs text-emerald-600 mt-0.5">
              最新履歴まで同期済
            </div>
          </div>
        </div>
      </div>

      {/* フィルタ & 検索バー */}
      <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* ロケーション切り替えタブ */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setSelectedLocationTab("ALL")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedLocationTab === "ALL"
                  ? "bg-white text-gray-900 shadow-sm font-bold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              すべて ({items.length})
            </button>
            <button
              onClick={() => setSelectedLocationTab("OUR")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedLocationTab === "OUR"
                  ? "bg-white text-blue-700 shadow-sm font-bold"
                  : "text-gray-600 hover:text-blue-700"
              }`}
            >
              🏢 弊社保管 ({summary.ourLocationQty}台)
            </button>
            <button
              onClick={() => setSelectedLocationTab("HIKARI")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedLocationTab === "HIKARI"
                  ? "bg-white text-amber-700 shadow-sm font-bold"
                  : "text-gray-600 hover:text-amber-700"
              }`}
            >
              🏭 光システム保管 ({summary.hikariLocationQty}台)
            </button>
            <button
              onClick={() => setSelectedLocationTab("DEPLETED")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedLocationTab === "DEPLETED"
                  ? "bg-white text-purple-700 shadow-sm font-bold"
                  : "text-gray-600 hover:text-purple-700"
              }`}
            >
              出庫完了のみ
            </button>
          </div>

          {/* 検索インプット */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="品名、OS、Spec、管理番号、S/N、備考で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
              >
                クリア
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 在庫一覧テーブル */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            データを読み込み中...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="w-12 h-12 text-gray-300 mx-auto" />
            <div className="text-gray-600 font-medium">
              該当するバックアップPCが見つかりません。
            </div>
            <p className="text-xs text-gray-400">
              検索条件を変更するか、右上の「新規PC受託登録」からデータを追加してください。
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600">
                  <th className="p-3.5">管理No / 品名</th>
                  <th className="p-3.5">置き場所</th>
                  <th className="p-3.5">OS / Spec</th>
                  <th className="p-3.5 text-center">現在庫数</th>
                  <th className="p-3.5 text-center">出庫済</th>
                  <th className="p-3.5">受託日 / 購入日</th>
                  <th className="p-3.5">ステータス / 備考</th>
                  <th className="p-3.5 text-right">アクション</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredItems.map((item) => {
                  const isHikari = item.location.includes("光システム");
                  const isDepleted = item.currentQty === 0;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* 管理No / 品名 */}
                      <td className="p-3.5 align-top">
                        <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                          <Laptop className="w-4 h-4 text-gray-400" />
                          <span>{item.itemName}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-200">
                            {item.itemCode || `ID-${item.id}`}
                          </span>
                          {item.serialNumber && (
                            <span className="text-xs text-gray-500 font-mono">
                              S/N: {item.serialNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 置き場所 */}
                      <td className="p-3.5 align-top">
                        <div className="flex items-center gap-1.5">
                          {isHikari ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Warehouse className="w-3.5 h-3.5 text-amber-600" />
                              仕入先：光システム
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                              <Building2 className="w-3.5 h-3.5 text-blue-600" />
                              弊社（社内）
                            </span>
                          )}
                        </div>
                      </td>

                      {/* OS / Spec */}
                      <td className="p-3.5 align-top max-w-xs">
                        {item.os && (
                          <div className="text-xs font-medium text-gray-800 flex items-center gap-1">
                            <Cpu className="w-3 h-3 text-indigo-500" />
                            <span>{item.os}</span>
                          </div>
                        )}
                        {item.spec ? (
                          <div className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                            {item.spec}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 mt-1">
                            スペック未登録
                          </div>
                        )}
                      </td>

                      {/* 現在庫数 */}
                      <td className="p-3.5 align-top text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                            isDepleted
                              ? "bg-gray-100 text-gray-400"
                              : isHikari
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : "bg-blue-100 text-blue-900 border border-blue-200"
                          }`}
                        >
                          {item.currentQty} 台
                        </span>
                        <div className="text-xs text-gray-400 mt-1">
                          初期: {item.initialQty}台
                        </div>
                      </td>

                      {/* 出庫済 */}
                      <td className="p-3.5 align-top text-center">
                        {item.shippedQty > 0 ? (
                          <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            {item.shippedQty} 台
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">0</span>
                        )}
                      </td>

                      {/* 受託日 / 購入日 */}
                      <td className="p-3.5 align-top text-xs text-gray-600">
                        {item.inboundDate && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400">受託:</span>
                            <span>
                              {new Date(item.inboundDate).toLocaleDateString(
                                "ja-JP"
                              )}
                            </span>
                          </div>
                        )}
                        {item.purchaseDate && (
                          <div className="flex items-center gap-1 mt-0.5 text-gray-500">
                            <span className="text-gray-400">購入:</span>
                            <span>
                              {new Date(item.purchaseDate).toLocaleDateString(
                                "ja-JP"
                              )}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* ステータス / 備考 */}
                      <td className="p-3.5 align-top max-w-xs">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              item.status === "STORED"
                                ? "bg-green-100 text-green-800"
                                : item.status === "PARTIALLY_DELIVERED"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {item.status === "STORED"
                              ? "保管中"
                              : item.status === "PARTIALLY_DELIVERED"
                              ? "一部出庫済"
                              : "出庫完了"}
                          </span>
                        </div>
                        {item.remarks && (
                          <div className="text-xs text-gray-500 line-clamp-2">
                            {item.remarks}
                          </div>
                        )}
                      </td>

                      {/* アクションボタン */}
                      <td className="p-3.5 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 出庫ボタン */}
                          <button
                            disabled={isDepleted}
                            onClick={() => openOutboundModal(item)}
                            className={`px-2.5 py-1.5 text-xs font-medium rounded-md flex items-center gap-1 transition-colors ${
                              isDepleted
                                ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                                : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                            }`}
                            title="JCC現場等への出庫記録"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>出庫</span>
                          </button>

                          {/* 拠点移動ボタン */}
                          <button
                            disabled={isDepleted}
                            onClick={() => openTransferModal(item)}
                            className={`px-2.5 py-1.5 text-xs font-medium rounded-md flex items-center gap-1 transition-colors ${
                              isDepleted
                                ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                                : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                            }`}
                            title="弊社 ⇔ 光システム間の移動"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>移動</span>
                          </button>

                          {/* 履歴ボタン */}
                          <button
                            onClick={() => openHistoryModal(item)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="出入庫・移動履歴ログ"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* 編集ボタン */}
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                            title="スペック・情報編集"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* モーダル群 */}
      {/* ------------------------------------------------------------- */}

      {/* 1. 即答テキスト確認・コピーモーダル */}
      {isQuickSummaryModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">
                  JCC様 問い合わせ即答用サマリー
                </h2>
              </div>
              <button
                onClick={() => setIsQuickSummaryModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕ 閉じる
              </button>
            </div>

            <p className="text-xs text-gray-500">
              日本カラリング様や社内からの電話・メール・チャットでの在庫確認に対し、以下の文面をワンクリックでコピーして即座に返答できます。
            </p>

            <div className="bg-gray-50 p-4 rounded-lg border font-mono text-xs text-gray-800 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
              {generateQuickSummaryText()}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsQuickSummaryModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                閉じる
              </button>
              <button
                onClick={handleCopyQuickSummary}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "コピー完了！" : "クリップボードにコピー"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. 新規PC受託登録モーダル */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">
                  新規バックアップPC受託登録
                </h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    品名・モデル名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="例: Dell OptiPlex 7090 Micro"
                    value={createForm.itemName}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, itemName: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    管理番号 (任意 / 自動生成可)
                  </label>
                  <input
                    type="text"
                    placeholder="例: JCC-PC-004"
                    value={createForm.itemCode}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, itemCode: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    置き場所 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createForm.location}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, location: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="弊社">🏢 弊社（コムテック）</option>
                    <option value="仕入先：光システム">
                      🏭 仕入先：光システム
                    </option>
                    <option value="その他">その他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    受託台数 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={createForm.initialQty}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        initialQty: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    OS (任意)
                  </label>
                  <input
                    type="text"
                    placeholder="例: Windows 11 Pro 64bit"
                    value={createForm.os}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, os: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    シリアル番号 (S/N / 任意)
                  </label>
                  <input
                    type="text"
                    placeholder="例: DL-7090-JCC02"
                    value={createForm.serialNumber}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        serialNumber: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Spec・ハード仕様 (任意)
                </label>
                <textarea
                  rows={2}
                  placeholder="例: Core i7-11700 / 16GB RAM / 512GB SSD / シリアルポート増設"
                  value={createForm.spec}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, spec: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    在庫日・受託日 (任意)
                  </label>
                  <input
                    type="date"
                    value={createForm.inboundDate}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        inboundDate: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    購入日 (任意)
                  </label>
                  <input
                    type="date"
                    value={createForm.purchaseDate}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        purchaseDate: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  備考・特記事項 (任意)
                </label>
                <textarea
                  rows={2}
                  placeholder="例: 81号機制御用バックアップ。キッティング完了済、固定IP設定済。"
                  value={createForm.remarks}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, remarks: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  {submitting ? "登録中..." : "登録する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. 出庫モーダル */}
      {isOutboundModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-bold text-gray-900">
                  出庫処理（JCC現場等への払い出し）
                </h2>
              </div>
              <button
                onClick={() => setIsOutboundModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* 対象PCサマリー */}
            <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-100 text-xs space-y-1">
              <div className="font-bold text-purple-950 text-sm">
                {selectedItem.itemName}
              </div>
              <div className="text-purple-800">
                出庫元: <span className="font-semibold">{selectedItem.location}</span> / 現在庫:{" "}
                <span className="font-bold text-purple-900">
                  {selectedItem.currentQty}台
                </span>
              </div>
              {selectedItem.os && (
                <div className="text-purple-700">OS: {selectedItem.os}</div>
              )}
            </div>

            <form onSubmit={handleOutboundSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    出庫台数 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedItem.currentQty}
                    required
                    value={outboundForm.quantity}
                    onChange={(e) =>
                      setOutboundForm({
                        ...outboundForm,
                        quantity: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-xs text-gray-400">
                    最大: {selectedItem.currentQty}台
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    出庫日 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={outboundForm.date}
                    onChange={(e) =>
                      setOutboundForm({ ...outboundForm, date: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  出庫先・納品場所 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: JCC第1工場 81号機ライン"
                  value={outboundForm.toLocation}
                  onChange={(e) =>
                    setOutboundForm({
                      ...outboundForm,
                      toLocation: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  出庫目的・理由 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: ライン制御PC故障による緊急代替機交換"
                  value={outboundForm.purpose}
                  onChange={(e) =>
                    setOutboundForm({
                      ...outboundForm,
                      purpose: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    担当者 (自社または光システム)
                  </label>
                  <input
                    type="text"
                    value={outboundForm.handler}
                    onChange={(e) =>
                      setOutboundForm({
                        ...outboundForm,
                        handler: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    備考 (任意)
                  </label>
                  <input
                    type="text"
                    placeholder="例: 81号機 正常稼働確認済"
                    value={outboundForm.remarks}
                    onChange={(e) =>
                      setOutboundForm({
                        ...outboundForm,
                        remarks: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsOutboundModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm"
                >
                  {submitting ? "処理中..." : "出庫を記録する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. 拠点間移動モーダル */}
      {isTransferModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-bold text-gray-900">
                  拠点間移動（弊社 ⇔ 光システム）
                </h2>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs space-y-1">
              <div className="font-bold text-amber-950 text-sm">
                {selectedItem.itemName}
              </div>
              <div className="text-amber-800">
                現在地: <span className="font-semibold">{selectedItem.location}</span> / 現在庫:{" "}
                <span className="font-bold">{selectedItem.currentQty}台</span>
              </div>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    移動先場所 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={transferForm.toLocation}
                    onChange={(e) =>
                      setTransferForm({
                        ...transferForm,
                        toLocation: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="仕入先：光システム">
                      🏭 仕入先：光システム
                    </option>
                    <option value="弊社">🏢 弊社（コムテック）</option>
                    <option value="その他">その他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    移動台数 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedItem.currentQty}
                    required
                    value={transferForm.quantity}
                    onChange={(e) =>
                      setTransferForm({
                        ...transferForm,
                        quantity: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-xs text-gray-400">
                    現在庫: {selectedItem.currentQty}台
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    移動日
                  </label>
                  <input
                    type="date"
                    required
                    value={transferForm.date}
                    onChange={(e) =>
                      setTransferForm({ ...transferForm, date: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    担当者
                  </label>
                  <input
                    type="text"
                    value={transferForm.handler}
                    onChange={(e) =>
                      setTransferForm({
                        ...transferForm,
                        handler: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  備考 (任意)
                </label>
                <input
                  type="text"
                  placeholder="例: 光システム様定期メンテのため搬送"
                  value={transferForm.remarks}
                  onChange={(e) =>
                    setTransferForm({
                      ...transferForm,
                      remarks: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm"
                >
                  {submitting ? "移動中..." : "移動を実行する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. 履歴ログモーダル */}
      {isHistoryModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">
                  出入庫・移動履歴
                </h2>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg border text-xs">
              <span className="font-bold text-gray-800 text-sm">
                {selectedItem.itemName}
              </span>
              <span className="ml-2 font-mono text-gray-500">
                ({selectedItem.itemCode || `ID-${selectedItem.id}`})
              </span>
              <div className="mt-1 text-gray-600">
                現在地: {selectedItem.location} / 現在庫:{" "}
                <span className="font-bold text-gray-900">
                  {selectedItem.currentQty}台
                </span>{" "}
                / 累計出庫: {selectedItem.shippedQty}台
              </div>
            </div>

            {/* タイムライン */}
            <div className="space-y-3">
              {selectedItem.logs && selectedItem.logs.length > 0 ? (
                selectedItem.logs.map((log) => {
                  const isOut = log.actionType === "OUTBOUND";
                  const isTransfer = log.actionType === "TRANSFER";
                  const isIn = log.actionType === "INBOUND";

                  return (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-lg border bg-white flex items-start gap-3 shadow-xs"
                    >
                      <div
                        className={`p-2 rounded-lg mt-0.5 ${
                          isOut
                            ? "bg-purple-100 text-purple-700"
                            : isTransfer
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {isOut ? (
                          <Truck className="w-4 h-4" />
                        ) : isTransfer ? (
                          <ArrowRightLeft className="w-4 h-4" />
                        ) : (
                          <Package className="w-4 h-4" />
                        )}
                      </div>

                      <div className="flex-1 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-semibold px-2 py-0.5 rounded text-2xs ${
                              isOut
                                ? "bg-purple-50 text-purple-800 border border-purple-200"
                                : isTransfer
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-green-50 text-green-800 border border-green-200"
                            }`}
                          >
                            {isOut
                              ? "出庫"
                              : isTransfer
                              ? "拠点間移動"
                              : "受託入庫"}
                          </span>
                          <span className="text-gray-400 font-mono">
                            {new Date(log.date).toLocaleDateString("ja-JP")}
                          </span>
                        </div>

                        <div className="text-sm font-semibold text-gray-900">
                          {log.quantity}台 {isOut ? "を出庫" : isTransfer ? "を移動" : "を受託"}
                        </div>

                        <div className="text-gray-600">
                          {log.fromLocation && (
                            <span>元: {log.fromLocation} → </span>
                          )}
                          {log.toLocation && (
                            <span className="font-medium text-gray-800">
                              先: {log.toLocation}
                            </span>
                          )}
                        </div>

                        {log.purpose && (
                          <div className="text-gray-700">
                            目的: {log.purpose}
                          </div>
                        )}

                        {log.handler && (
                          <div className="text-gray-400">
                            担当: {log.handler}
                          </div>
                        )}

                        {log.remarks && (
                          <div className="text-gray-500 bg-gray-50 p-1.5 rounded border border-gray-100 mt-1">
                            備考: {log.remarks}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-gray-400 text-xs">
                  履歴ログはありません。
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. スペック・情報編集モーダル */}
      {isEditModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-bold text-gray-900">
                  PC情報・スペックの編集
                </h2>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    品名・モデル名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.itemName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, itemName: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    管理番号
                  </label>
                  <input
                    type="text"
                    value={editForm.itemCode}
                    onChange={(e) =>
                      setEditForm({ ...editForm, itemCode: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    置き場所
                  </label>
                  <select
                    value={editForm.location}
                    onChange={(e) =>
                      setEditForm({ ...editForm, location: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="弊社">🏢 弊社（コムテック）</option>
                    <option value="仕入先：光システム">
                      🏭 仕入先：光システム
                    </option>
                    <option value="その他">その他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    現在庫数 / 受託総数
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={editForm.currentQty}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          currentQty: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-500">/</span>
                    <input
                      type="number"
                      min="1"
                      value={editForm.initialQty}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          initialQty: parseInt(e.target.value, 10) || 1,
                        })
                      }
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    OS
                  </label>
                  <input
                    type="text"
                    value={editForm.os}
                    onChange={(e) =>
                      setEditForm({ ...editForm, os: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    シリアル番号 (S/N)
                  </label>
                  <input
                    type="text"
                    value={editForm.serialNumber}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        serialNumber: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Spec・ハード仕様
                </label>
                <textarea
                  rows={2}
                  value={editForm.spec}
                  onChange={(e) =>
                    setEditForm({ ...editForm, spec: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    受託日 / 在庫日
                  </label>
                  <input
                    type="date"
                    value={editForm.inboundDate}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        inboundDate: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    購入日
                  </label>
                  <input
                    type="date"
                    value={editForm.purchaseDate}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        purchaseDate: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  備考
                </label>
                <textarea
                  rows={2}
                  value={editForm.remarks}
                  onChange={(e) =>
                    setEditForm({ ...editForm, remarks: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  {submitting ? "保存中..." : "保存する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
