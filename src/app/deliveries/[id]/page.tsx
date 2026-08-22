'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

export default function EditDeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const deliveryId = resolvedParams.id;
  
  const [loading, setLoading] = useState(true);
  const [delivery, setDelivery] = useState<any>(null);
  
  const [employees, setEmployees] = useState([]);
  
  const [formData, setFormData] = useState({
    deliveryDate: '',
    expectedPayDate: '',
    leadStaff: '',
  });
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/deliveries/${deliveryId}`).then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      }),
      fetch('/api/employees').then(res => res.json())
    ])
      .then(([data, empData]) => {
        setEmployees(empData);
        setDelivery(data);
        setFormData({
          deliveryDate: data.deliveryDate ? new Date(data.deliveryDate).toISOString().split('T')[0] : '',
          expectedPayDate: data.expectedPayDate ? new Date(data.expectedPayDate).toISOString().split('T')[0] : '',
          leadStaff: data.project?.leadStaff || '',
        });
        setItems(data.items.map((i: any) => ({
          itemName: i.itemName,
          quantity: Number(i.quantity),
          unit: i.unit,
          unitPrice: Number(i.unitPrice),
          amount: Number(i.amount)
        })));
        setLoading(false);
      })
      .catch(err => {
        alert('納品データが見つかりません');
        router.push('/deliveries');
      });
  }, [deliveryId, router]);

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const calculateTotals = () => {
    let subtotal = 0;
    items.forEach(i => {
      subtotal += Number(i.quantity) * Number(i.unitPrice);
    });
    return { subtotal, tax: Math.floor(subtotal * 0.1), totalAmount: subtotal + Math.floor(subtotal * 0.1) };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { subtotal, tax, totalAmount } = calculateTotals();

    const res = await fetch(`/api/deliveries/${deliveryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: delivery.projectId,
        deliveryDate: formData.deliveryDate,
        expectedPayDate: formData.expectedPayDate,
        leadStaff: formData.leadStaff,
        items,
        subtotal,
        tax,
        totalAmount
      })
    });

    if (res.ok) {
      router.push('/deliveries');
    } else {
      alert('エラーが発生しました');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('本当にこの納品データを削除しますか？')) return;
    const res = await fetch(`/api/deliveries/${deliveryId}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/deliveries');
    } else {
      alert('削除に失敗しました');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">納品データ 編集</h1>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow space-y-6">
        
        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded border">
          <div className="col-span-2">
            <p className="text-sm font-bold text-gray-500 mb-1">対象案件</p>
            <p className="font-bold text-lg">
              {delivery.project?.projectCode} - {delivery.project?.name} ({delivery.project?.partner?.name})
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-1">納品日</label>
            <input 
              type="date" 
              className="w-full border p-2 rounded" 
              value={formData.deliveryDate}
              onChange={e => setFormData({...formData, deliveryDate: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-1">入金予定日 (任意)</label>
            <input 
              type="date" 
              className="w-full border p-2 rounded" 
              value={formData.expectedPayDate}
              onChange={e => setFormData({...formData, expectedPayDate: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-1">自社担当者</label>
            <select 
              className="w-full border p-2 rounded" 
              value={formData.leadStaff}
              onChange={e => setFormData({...formData, leadStaff: e.target.value})}
            >
              <option value="">選択してください</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.name}>{emp.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <h3 className="font-bold mb-2">納品明細</h3>
          <table className="w-full text-left border-collapse mb-4">
            <thead>
              <tr className="bg-gray-200 border-b text-sm">
                <th className="p-2 w-1/3">品名</th>
                <th className="p-2 w-20">数量</th>
                <th className="p-2 w-20">単位</th>
                <th className="p-2 w-32">単価</th>
                <th className="p-2 w-32 text-right">金額</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="p-2">
                    <input type="text" required className="w-full border p-1 rounded" value={item.itemName || ''} onChange={e => handleItemChange(index, 'itemName', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <input type="number" required min="0.01" step="0.01" className="w-full border p-1 rounded" value={item.quantity ?? 1} onChange={e => handleItemChange(index, 'quantity', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <input type="text" className="w-full border p-1 rounded" value={item.unit || ''} onChange={e => handleItemChange(index, 'unit', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <input type="number" required className="w-full border p-1 rounded" value={item.unitPrice ?? 0} onChange={e => handleItemChange(index, 'unitPrice', e.target.value)} />
                  </td>
                  <td className="p-2 text-right align-middle">
                    ¥{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="flex justify-end">
            <div className="w-64 border rounded p-4 bg-gray-50 text-sm space-y-2">
              {(() => {
                const { subtotal, tax, totalAmount } = calculateTotals();
                return (
                  <>
                    <div className="flex justify-between">
                      <span>小計:</span>
                      <span>¥{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>消費税:</span>
                      <span>¥{tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2 text-lg">
                      <span>合計:</span>
                      <span>¥{totalAmount.toLocaleString()}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <button 
            type="button" 
            onClick={handleDelete} 
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-bold"
          >
            削除
          </button>
          <div className="flex gap-4">
            <button type="button" onClick={() => router.back()} className="px-6 py-2 border rounded hover:bg-gray-50">キャンセル</button>
            <button type="submit" className="bg-green-600 text-white px-8 py-2 rounded hover:bg-green-700 font-bold">更新する</button>
          </div>
        </div>
      </form>
    </div>
  );
}
