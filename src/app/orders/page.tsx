"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, ArrowRight } from "lucide-react";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => setOrders(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">受注・分納管理 (Orders)</h1>
        <p className="text-gray-600">
          得意先からの発注（PDF自動取込等）を管理し、納品処理（一括・分納）を行います。
        </p>
      </div>

      <div className="bg-white border rounded overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 font-medium text-gray-600">発注日</th>
              <th className="p-3 font-medium text-gray-600">発注番号</th>
              <th className="p-3 font-medium text-gray-600">取引先</th>
              <th className="p-3 font-medium text-gray-600">金額（税込）</th>
              <th className="p-3 font-medium text-gray-600">ステータス</th>
              <th className="p-3 font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{new Date(order.orderDate).toLocaleDateString()}</td>
                <td className="p-3 font-medium">{order.orderNumber}</td>
                <td className="p-3">{order.partner?.name || '不明'}</td>
                <td className="p-3">&yen;{Number(order.totalAmount).toLocaleString()}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    order.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' : 
                    order.status === 'PARTIALLY_DELIVERED' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-green-100 text-green-800'
                  }`}>
                    {order.status === 'COMPLETED' ? '完納' : 
                     order.status === 'PARTIALLY_DELIVERED' ? '一部納品済' : '未納'}
                  </span>
                </td>
                <td className="p-3">
                  <Link href={`/orders/${order.id}`} className="flex items-center text-blue-600 hover:underline">
                    詳細・分納 <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  発注データがありません。PDF自動取込からデータを生成してください。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
