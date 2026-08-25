"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Play, ArrowRight } from "lucide-react";

export default function ContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [targetPeriod, setTargetPeriod] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<any>(null);

  useEffect(() => {
    // デフォルトで来月をセット (例: 2026-09)
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const yyyy = nextMonth.getFullYear();
    const mm = String(nextMonth.getMonth() + 1).padStart(2, '0');
    setTargetPeriod(`${yyyy}-${mm}`);

    fetch('/api/contracts')
      .then(res => res.json())
      .then(data => setContracts(data))
      .catch(err => console.error(err));
  }, []);

  const handleBatchRun = async () => {
    if (!targetPeriod) return;
    if (!confirm(`対象年月「${targetPeriod}」の定期契約一括請求処理を実行しますか？\n(既に作成済みのデータはスキップされます)`)) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/contracts/recurring-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPeriod, userId: "1" }),
      });
      const result = await res.json();
      if (result.success) {
        setMessage({ type: 'success', text: `処理が完了しました。新たに ${result.processedCount} 件の請求データを作成しました。` });
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">定期契約管理 (Contracts)</h1>
        <p className="text-gray-600">
          定期保守や定額契約（JAトービス等）の管理と、月ごとの一括請求データ自動生成を行います。
        </p>
      </div>

      <div className="bg-white border rounded shadow-sm p-6 mb-8 flex items-end gap-4">
        <div className="flex-1 max-w-xs">
          <label className="block font-bold mb-2 text-sm text-gray-700">対象年月 (YYYY-MM)</label>
          <input 
            type="month" 
            value={targetPeriod} 
            onChange={(e) => setTargetPeriod(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>
        <button
          onClick={handleBatchRun}
          disabled={!targetPeriod || isSubmitting}
          className="flex items-center px-6 py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-700 disabled:opacity-50"
        >
          <Play className="w-5 h-5 mr-2" />
          {isSubmitting ? "実行中..." : "一括請求データを生成する"}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded mb-8 ${message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white border rounded overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 font-medium text-gray-600">契約番号</th>
              <th className="p-3 font-medium text-gray-600">件名</th>
              <th className="p-3 font-medium text-gray-600">取引先</th>
              <th className="p-3 font-medium text-gray-600">金額（月額）</th>
              <th className="p-3 font-medium text-gray-600">ステータス</th>
              <th className="p-3 font-medium text-gray-600">詳細</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => (
              <tr key={contract.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{contract.contractNumber}</td>
                <td className="p-3">{contract.title}</td>
                <td className="p-3">{contract.partner?.name || '不明'}</td>
                <td className="p-3">&yen;{Number(contract.amount).toLocaleString()}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    contract.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                    contract.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {contract.status === 'ACTIVE' ? '有効' : 
                     contract.status === 'PAUSED' ? '一時停止' : '終了'}
                  </span>
                </td>
                <td className="p-3">
                  <Link href={`/contracts/${contract.id}`} className="flex items-center text-blue-600 hover:underline">
                    履歴確認 <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  契約データがありません。テスト用にDBに直接追加するか、別のインターフェースから登録してください。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
