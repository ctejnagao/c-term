"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Truck } from "lucide-react";

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [splitData, setSplitData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<any>(null);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        
        // 分納フォームの初期値を「残数」にセット
        const initialSplit: any = {};
        data.orderItems.forEach((item: any) => {
          initialSplit[item.id] = Math.max(0, item.quantity - item.deliveredQty);
        });
        setSplitData(initialSplit);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (itemId: number, value: string) => {
    const num = parseInt(value) || 0;
    setSplitData({ ...splitData, [itemId]: num });
  };

  const handleSplitSubmit = async () => {
    if (!confirm("入力した数量で納品処理（分納）を実行しますか？")) return;
    setIsSubmitting(true);
    setMessage(null);

    const itemsPayload = order.orderItems
      .filter((item: any) => splitData[item.id] > 0)
      .map((item: any) => ({
        orderItemId: item.id,
        quantity: splitData[item.id]
      }));

    if (itemsPayload.length === 0) {
      setMessage({ type: 'error', text: '納品する数量が0です。' });
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/deliveries/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          deliveryDate: new Date().toISOString(), // 今日
          items: itemsPayload,
          userId: "1" // デモ用
        }),
      });

      const result = await res.json();
      if (result.success) {
        setMessage({ type: 'success', text: '納品処理が完了しました。' });
        fetchOrder(); // 再取得して画面更新
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8">読み込み中...</div>;
  if (!order) return <div className="p-8">データが見つかりません。</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <Link href="/orders" className="flex items-center text-blue-600 hover:underline mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          発注一覧に戻る
        </Link>
        <h1 className="text-2xl font-bold mb-2">発注詳細・分納処理</h1>
        <p className="text-gray-600">発注番号: {order.orderNumber} ({order.partner?.name})</p>
      </div>

      {message && (
        <div className={`p-4 rounded ${message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white border rounded shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">発注明細 ＆ 分納入力</h2>
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-2 font-medium text-gray-600">品名</th>
              <th className="p-2 font-medium text-gray-600 text-right">発注数</th>
              <th className="p-2 font-medium text-gray-600 text-right">納品済数</th>
              <th className="p-2 font-medium text-gray-600 text-right">残数</th>
              <th className="p-2 font-medium text-blue-700 w-32 bg-blue-50 text-center">今回納品数</th>
            </tr>
          </thead>
          <tbody>
            {order.orderItems.map((item: any) => {
              const remaining = item.quantity - item.deliveredQty;
              return (
                <tr key={item.id} className="border-b">
                  <td className="p-2">{item.itemName}</td>
                  <td className="p-2 text-right">{item.quantity}</td>
                  <td className="p-2 text-right text-green-600">{item.deliveredQty}</td>
                  <td className="p-2 text-right font-bold text-gray-800">{remaining}</td>
                  <td className="p-2 bg-blue-50/30">
                    <input
                      type="number"
                      min="0"
                      max={remaining}
                      value={splitData[item.id] || 0}
                      onChange={(e) => handleQtyChange(item.id, e.target.value)}
                      disabled={remaining <= 0}
                      className="w-full border rounded p-1 text-right disabled:bg-gray-200"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSplitSubmit}
            disabled={isSubmitting || order.status === 'COMPLETED'}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            <Truck className="w-5 h-5 mr-2" />
            {isSubmitting ? '処理中...' : '納品処理を実行する'}
          </button>
        </div>
      </div>

      {order.deliveries && order.deliveries.length > 0 && (
        <div className="bg-white border rounded shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">納品履歴 (Deliveries)</h2>
          <div className="space-y-4">
            {order.deliveries.map((delivery: any) => (
              <div key={delivery.id} className="border p-4 rounded bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-800">納品伝票: {delivery.deliveryNo}</span>
                  <span className="text-sm text-gray-500">{new Date(delivery.deliveryDate).toLocaleDateString()}</span>
                </div>
                <ul className="list-disc list-inside text-sm text-gray-700">
                  {delivery.items.map((i: any) => (
                    <li key={i.id}>明細ID: {i.orderItemId} / 納品数: {i.quantity}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
