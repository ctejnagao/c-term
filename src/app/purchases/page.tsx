"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Printer,
  FileText,
  Trash2,
  ExternalLink,
  X,
  Building2,
  Briefcase,
  Check,
  RefreshCw,
} from "lucide-react";

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // 新規発注モーダル状態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // フォームデータ
  const [formData, setFormData] = useState({
    projectId: "",
    supplierId: "",
    supplierEstimateNo: "",
    orderDate: new Date().toISOString().split("T")[0],
    deliveryDate: "",
    paymentDate: "",
    content: "",
    remarks: "",
    items: [
      {
        itemName: "",
        quantity: 1,
        unit: "式",
        unitPrice: 0,
        amount: 0,
        remarks: "",
      },
    ],
  });

  // データ取得
  const fetchData = async () => {
    setLoading(true);
    try {
      const [purchasesRes, projectsRes, partnersRes] = await Promise.all([
        fetch("/api/purchases"),
        fetch("/api/projects"),
        fetch("/api/partners"),
      ]);

      if (purchasesRes.ok) {
        const data = await purchasesRes.json();
        setPurchases(data);
      }
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data);
      }
      if (partnersRes.ok) {
        const data = await partnersRes.json();
        setPartners(data);
      }
    } catch (err) {
      console.error("データ取得エラー:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 案件選択時の初期補完
  const handleProjectChange = (projectId: string) => {
    const selected = projects.find((p) => p.id === Number(projectId));
    setFormData((prev) => ({
      ...prev,
      projectId,
      content: selected ? `${selected.partner?.shortName || selected.partner?.name || ""}様：${selected.name}` : prev.content,
    }));
  };

  // 明細行の変更
  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    const currentItem = { ...newItems[index], [field]: value };

    if (field === "quantity" || field === "unitPrice") {
      const qty = field === "quantity" ? Number(value) || 0 : Number(currentItem.quantity) || 0;
      const price = field === "unitPrice" ? Number(value) || 0 : Number(currentItem.unitPrice) || 0;
      currentItem.amount = qty * price;
    }

    newItems[index] = currentItem;
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  // 明細行の追加
  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemName: "",
          quantity: 1,
          unit: "式",
          unitPrice: 0,
          amount: 0,
          remarks: "",
        },
      ],
    }));
  };

  // 明細行の削除
  const handleRemoveItem = (index: number) => {
    if (formData.items.length <= 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  // 金額計算
  const subtotal = formData.items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  const tax = Math.floor(subtotal * 0.1);
  const totalAmount = subtotal + tax;

  // 新規発注登録サブミット
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId || !formData.supplierId || !formData.content) {
      setFormMessage({ type: "error", text: "案件、仕入先、件名を入力してください。" });
      return;
    }

    setIsSubmitting(true);
    setFormMessage(null);

    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        // フォームリセット
        setFormData({
          projectId: "",
          supplierId: "",
          supplierEstimateNo: "",
          orderDate: new Date().toISOString().split("T")[0],
          deliveryDate: "",
          paymentDate: "",
          content: "",
          remarks: "",
          items: [
            {
              itemName: "",
              quantity: 1,
              unit: "式",
              unitPrice: 0,
              amount: 0,
              remarks: "",
            },
          ],
        });
        fetchData();
      } else {
        setFormMessage({ type: "error", text: json.error || "登録に失敗しました。" });
      }
    } catch (err: any) {
      setFormMessage({ type: "error", text: err.message || "通信エラーが発生しました。" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 支払消込トグル
  const handleToggleReconcile = async (id: number) => {
    try {
      const res = await fetch(`/api/purchases/${id}/reconcile`, { method: "POST" });
      if (res.ok) {
        setPurchases((prev) =>
          prev.map((p) => {
            if (p.id === id) {
              const nextReconciled = !p.isReconciled;
              return {
                ...p,
                isReconciled: nextReconciled,
                status: nextReconciled ? "支払済" : "手配済",
              };
            }
            return p;
          })
        );
      }
    } catch (err) {
      console.error("消込ステータス変更エラー:", err);
    }
  };

  // 発注伝票の削除
  const handleDelete = async (id: number, orderNo: string) => {
    if (!confirm(`注文番号: ${orderNo} を削除してもよろしいですか？`)) return;
    try {
      const res = await fetch(`/api/purchases/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPurchases((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error("削除エラー:", err);
    }
  };

  // フィルタリング
  const filteredPurchases = purchases.filter((p) => {
    const matchesSearch =
      searchTerm === "" ||
      p.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.supplier?.name && p.supplier.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.content && p.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.supplierEstimateNo && p.supplierEstimateNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.project?.name && p.project.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "RECONCILED" && p.isReconciled) ||
      (statusFilter === "UNRECONCILED" && !p.isReconciled) ||
      p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // 統計計算
  const totalUnreconciledAmount = purchases
    .filter((p) => !p.isReconciled)
    .reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);

  const unreconciledCount = purchases.filter((p) => !p.isReconciled).length;
  const orderedCount = purchases.filter((p) => p.status === "手配済").length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShoppingCart className="w-7 h-7 text-indigo-600" />
            発注・支払管理（買掛・外注）
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            仕入先への発注（注文書発行・印刷 採番:26-01120〜）、外注振込の支払消込を管理します。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            title="再読み込み"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/pdf-imports"
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <FileText className="w-4 h-4 text-amber-600" />
            PDF自動取込へ
          </Link>
          <button
            onClick={() => {
              setIsModalOpen(true);
              setFormMessage(null);
            }}
            className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors flex items-center gap-1.5 shadow-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            新規発注登録
          </button>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">未消込 買掛金総額</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            &yen;{totalUnreconciledAmount.toLocaleString()}
          </div>
          <span className="text-[11px] text-indigo-600 flex items-center gap-1 mt-2">
            <Clock className="w-3.5 h-3.5" /> 支払消込待ち {unreconciledCount} 件
          </span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">手配済（納品・検収待ち）</span>
          <div className="text-2xl font-bold text-blue-600 mt-1">{orderedCount} 件</div>
          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-2">
            仕入先への発注手配完了分
          </span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">当月消込済 / 完了</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {purchases.filter((p) => p.isReconciled).length} 件
          </div>
          <span className="text-[11px] text-emerald-600 flex items-center gap-1 mt-2">
            <CheckCircle2 className="w-3.5 h-3.5" /> 支払振込・消込完了
          </span>
        </div>
      </div>

      {/* 一覧テーブル */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="注文番号・仕入先・見積No・件名で検索..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none"
            >
              <option value="ALL">すべてのステータス</option>
              <option value="UNRECONCILED">未消込（支払前）</option>
              <option value="RECONCILED">消込済（支払完了）</option>
              <option value="手配済">手配済</option>
            </select>
          </div>
          <div className="text-xs text-slate-400">全 {filteredPurchases.length} 件の発注伝票</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="p-3.5">注文番号</th>
                <th className="p-3.5">発注日</th>
                <th className="p-3.5">仕入先 / 外注先</th>
                <th className="p-3.5">件名・対象案件</th>
                <th className="p-3.5 text-center">外注見積No</th>
                <th className="p-3.5 text-right">金額 (税込)</th>
                <th className="p-3.5 text-center">ステータス</th>
                <th className="p-3.5 text-center">消込状態</th>
                <th className="p-3.5 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredPurchases.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5 font-bold font-mono text-indigo-600">
                    <Link
                      href={`/print/purchase_order/${po.id}`}
                      target="_blank"
                      className="hover:underline flex items-center gap-1"
                      title="注文書プレビュー・印刷"
                    >
                      {po.orderNo}
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </Link>
                  </td>
                  <td className="p-3.5 text-slate-500 whitespace-nowrap">
                    {new Date(po.orderDate).toLocaleDateString()}
                  </td>
                  <td className="p-3.5 font-medium text-slate-900 whitespace-nowrap">
                    {po.supplier?.name || "未指定"}
                  </td>
                  <td className="p-3.5 max-w-xs truncate" title={po.content}>
                    <div className="font-medium text-slate-800">{po.content}</div>
                    {po.project && (
                      <div className="text-[11px] text-slate-400">
                        案件: {po.project.projectCode} - {po.project.name}
                      </div>
                    )}
                  </td>
                  <td className="p-3.5 text-center font-mono text-blue-700 font-medium">
                    {po.supplierEstimateNo ? (
                      <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded text-[11px] border border-blue-200">
                        #{po.supplierEstimateNo}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-3.5 text-right font-bold text-slate-900 font-mono whitespace-nowrap">
                    &yen;{Number(po.totalAmount).toLocaleString()}
                  </td>
                  <td className="p-3.5 text-center whitespace-nowrap">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                        po.status === "支払済"
                          ? "bg-emerald-100 text-emerald-800"
                          : po.status === "手配済"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {po.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-center whitespace-nowrap">
                    <button
                      onClick={() => handleToggleReconcile(po.id)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 mx-auto ${
                        po.isReconciled
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300"
                      }`}
                      title={po.isReconciled ? "消込解除する" : "支払消込済にする"}
                    >
                      {po.isReconciled ? (
                        <>
                          <Check className="w-3 h-3" /> 消込済
                        </>
                      ) : (
                        "未消込"
                      )}
                    </button>
                  </td>
                  <td className="p-3.5 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <Link
                        href={`/print/purchase_order/${po.id}`}
                        target="_blank"
                        className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="注文書を印刷"
                      >
                        <Printer className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(po.id, po.orderNo)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    {loading ? "読み込み中..." : "発注データがありません。「新規発注登録」から発注書を発行してください。"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新規発注登録モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 space-y-5 my-8 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-indigo-600" />
                  新規仕入・外注発注登録（注文書発行）
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  受注案件と外注見積書（例: 6398）を紐付けて発注します。注文番号は自動採番（26-01120〜）されます。
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formMessage && (
              <div
                className={`p-3 rounded-lg text-xs font-medium ${
                  formMessage.type === "error" ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"
                }`}
              >
                {formMessage.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* 基本情報 2カラム */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    対象案件（受注） <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.projectId}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">案件を選択してください</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.projectCode} : {p.name} ({p.partner?.name || "取引先未指定"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    発注先（仕入先・外注先） <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">仕入先を選択してください</option>
                    {partners.map((pt) => (
                      <option key={pt.id} value={pt.id}>
                        {pt.name} {pt.shortName ? `(${pt.shortName})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    外注先見積書番号 (例: COM6398 の 6398)
                  </label>
                  <input
                    type="text"
                    value={formData.supplierEstimateNo}
                    onChange={(e) => setFormData({ ...formData, supplierEstimateNo: e.target.value })}
                    placeholder="例: 6398 や 5987"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    発注年月日 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">希望納期 / 作業予定期間</label>
                  <input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">支払予定期日</label>
                  <input
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 件名 & 特記事項 */}
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    件名・注文概要 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="例: JCC様：TPV81号機 PC更新"
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    契約形態 / 特記事項（注文書に印字）
                  </label>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="例: ・対象：81，82号機"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 明細行入力 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">注文内容明細</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> 行を追加
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="p-2 w-8 text-center">#</th>
                        <th className="p-2">注文内容・品名</th>
                        <th className="p-2 w-20 text-center">数量</th>
                        <th className="p-2 w-16 text-center">単位</th>
                        <th className="p-2 w-24 text-right">単価</th>
                        <th className="p-2 w-28 text-right">金額</th>
                        <th className="p-2 w-24">備考</th>
                        <th className="p-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.itemName}
                              onChange={(e) => handleItemChange(idx, "itemName", e.target.value)}
                              placeholder="例: TPV81号機 PC更新"
                              required
                              className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                              className="w-full border border-slate-200 rounded px-2 py-1 text-xs text-center"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                              className="w-full border border-slate-200 rounded px-2 py-1 text-xs text-center"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                              className="w-full border border-slate-200 rounded px-2 py-1 text-xs text-right font-mono"
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-semibold">
                            &yen;{Number(item.amount).toLocaleString()}
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.remarks}
                              onChange={(e) => handleItemChange(idx, "remarks", e.target.value)}
                              placeholder="内訳等"
                              className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
                            />
                          </td>
                          <td className="p-2 text-center">
                            {formData.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-slate-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 合計サマリー */}
                <div className="flex justify-end pt-2">
                  <div className="w-64 space-y-1 text-right bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex justify-between text-slate-600">
                      <span>小計 (税抜):</span>
                      <span className="font-mono font-semibold">&yen;{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>消費税 (10%):</span>
                      <span className="font-mono font-semibold">&yen;{tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1 text-sm">
                      <span>税込合計:</span>
                      <span className="font-mono text-indigo-600">&yen;{totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ボタン */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? "採番・発行中..." : "注文書を発行・手配済にする"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
