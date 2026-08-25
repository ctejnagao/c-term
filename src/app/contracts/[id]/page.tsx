"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";

export default function ContractDetailPage() {
  const { id } = useParams();
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContract();
  }, [id]);

  const fetchContract = async () => {
    try {
      const res = await fetch(`/api/contracts/${id}`);
      if (res.ok) {
        const data = await res.json();
        setContract(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">読み込み中...</div>;
  if (!contract) return <div className="p-8">データが見つかりません。</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <Link href="/contracts" className="flex items-center text-blue-600 hover:underline mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          契約一覧に戻る
        </Link>
        <h1 className="text-2xl font-bold mb-2">契約詳細 ＆ 請求履歴</h1>
        <p className="text-gray-600">契約番号: {contract.contractNumber} ({contract.partner?.name})</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white border rounded shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4 border-b pb-2">基本情報</h2>
          <dl className="space-y-4 text-sm">
            <div className="flex">
              <dt className="w-32 font-medium text-gray-500">件名</dt>
              <dd className="font-bold text-gray-800">{contract.title}</dd>
            </div>
            <div className="flex">
              <dt className="w-32 font-medium text-gray-500">取引先</dt>
              <dd>{contract.partner?.name}</dd>
            </div>
            <div className="flex">
              <dt className="w-32 font-medium text-gray-500">月額（税込）</dt>
              <dd className="font-bold text-blue-600 text-lg">&yen;{Number(contract.amount).toLocaleString()}</dd>
            </div>
            <div className="flex">
              <dt className="w-32 font-medium text-gray-500">サイクル</dt>
              <dd>{contract.billingCycle === 'MONTHLY' ? '毎月' : '毎年'}</dd>
            </div>
            <div className="flex">
              <dt className="w-32 font-medium text-gray-500">締日/請求日</dt>
              <dd>{contract.billingDay}日</dd>
            </div>
            <div className="flex">
              <dt className="w-32 font-medium text-gray-500">契約開始日</dt>
              <dd>{new Date(contract.startDate).toLocaleDateString()}</dd>
            </div>
            <div className="flex">
              <dt className="w-32 font-medium text-gray-500">ステータス</dt>
              <dd>
                <span className={`px-2 py-1 rounded text-xs ${
                    contract.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                    contract.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {contract.status === 'ACTIVE' ? '有効' : 
                     contract.status === 'PAUSED' ? '一時停止' : '終了'}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white border rounded shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4 border-b pb-2">請求データ生成履歴</h2>
          {contract.recurringInvoices && contract.recurringInvoices.length > 0 ? (
            <div className="space-y-3">
              {contract.recurringInvoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between p-3 border rounded bg-gray-50">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <div>
                      <div className="font-bold text-gray-800">対象年月: {inv.targetPeriod}</div>
                      <div className="text-xs text-gray-500">生成日: {new Date(inv.issuedDate).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="font-bold text-blue-700">
                    &yen;{Number(inv.amount).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">まだ自動生成された請求データはありません。</p>
          )}
        </div>
      </div>
    </div>
  );
}
