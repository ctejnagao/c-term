'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewEstimatePage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [partners, setPartners] = useState([]);
  const [formData, setFormData] = useState({
    projectId: '',
    partnerId: '',
    issueDate: new Date().toISOString().split('T')[0],
    validUntil: '二ケ月',
    paymentTerm: '別途御相談',
  });
  
  const [items, setItems] = useState([
    { itemName: '', quantity: 1, unit: '式', unitPrice: 0, costPrice: 0 }
  ]);

  useEffect(() => {
    fetch('/api/projects').then(res => res.json()).then(setProjects);
    fetch('/api/partners').then(res => res.json()).then(setPartners);
  }, []);

  const handleAddItem = () => {
    setItems([...items, { itemName: '', quantity: 1, unit: '式', unitPrice: 0, costPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let cost = 0;
    items.forEach(i => {
      subtotal += Number(i.quantity) * Number(i.unitPrice);
      cost += Number(i.quantity) * Number(i.costPrice || 0);
    });
    return { subtotal, tax: Math.floor(subtotal * 0.1), total: subtotal + Math.floor(subtotal * 0.1), cost };
  };

  const { subtotal, tax, total, cost } = calculateTotals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId || !formData.partnerId) return alert('案件と取引先を選択してください');

    const res = await fetch('/api/estimates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        items
      })
    });

    if (res.ok) {
      router.push('/estimates');
    } else {
      alert('エラーが発生しました');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">新規見積作成</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded shadow space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">案件</label>
              <select 
                className="w-full border p-2 rounded" 
                value={formData.projectId}
                onChange={e => {
                  const pid = e.target.value;
                  const proj = projects.find((p: any) => p.id === Number(pid)) as any;
                  setFormData({...formData, projectId: pid, partnerId: proj ? String(proj.partnerId) : ''});
                }}
                required
              >
                <option value="">選択してください</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.projectCode} - {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">取引先 (宛先)</label>
              <select 
                className="w-full border p-2 rounded bg-gray-100" 
                value={formData.partnerId}
                onChange={e => setFormData({...formData, partnerId: e.target.value})}
                required
                disabled
              >
                <option value="">選択してください</option>
                {partners.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">発行日</label>
              <input 
                type="date" 
                className="w-full border p-2 rounded" 
                value={formData.issueDate}
                onChange={e => setFormData({...formData, issueDate: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">有効期限</label>
              <input 
                type="text" 
                className="w-full border p-2 rounded" 
                value={formData.validUntil}
                onChange={e => setFormData({...formData, validUntil: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">支払条件</label>
              <input 
                type="text" 
                className="w-full border p-2 rounded" 
                value={formData.paymentTerm}
                onChange={e => setFormData({...formData, paymentTerm: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-lg font-bold mb-4">明細</h2>
          <table className="w-full text-left border-collapse mb-4">
            <thead>
              <tr className="bg-gray-100 border-b text-sm">
                <th className="p-2 w-1/3">品名</th>
                <th className="p-2 w-20">数量</th>
                <th className="p-2 w-20">単位</th>
                <th className="p-2 w-32">単価</th>
                <th className="p-2 w-32">仕入原価(任意)</th>
                <th className="p-2 w-32 text-right">金額</th>
                <th className="p-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="p-2">
                    <input type="text" required className="w-full border p-1 rounded" value={item.itemName} onChange={e => handleItemChange(index, 'itemName', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <input type="number" required min="0.01" step="0.01" className="w-full border p-1 rounded" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <input type="text" className="w-full border p-1 rounded" value={item.unit} onChange={e => handleItemChange(index, 'unit', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <input type="number" required className="w-full border p-1 rounded" value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <input type="number" className="w-full border p-1 rounded" value={item.costPrice} onChange={e => handleItemChange(index, 'costPrice', e.target.value)} />
                  </td>
                  <td className="p-2 text-right align-middle">
                    ¥{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
                  </td>
                  <td className="p-2 text-center align-middle">
                    <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-600 hover:text-red-800 font-bold">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="flex justify-between items-start">
            <button type="button" onClick={handleAddItem} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 text-sm">
              + 明細追加
            </button>

            <div className="w-64 border rounded p-4 bg-gray-50 text-sm space-y-2">
              <div className="flex justify-between">
                <span>小計:</span>
                <span>¥{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>消費税(10%):</span>
                <span>¥{tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2 text-lg">
                <span>合計:</span>
                <span>¥{total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500 pt-2 border-t mt-2">
                <span>粗利:</span>
                <span>¥{(subtotal - cost).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => router.back()} className="px-6 py-2 border rounded hover:bg-gray-50">キャンセル</button>
          <button type="submit" className="bg-blue-600 text-white px-8 py-2 rounded hover:bg-blue-700 font-bold">保存する</button>
        </div>
      </form>
    </div>
  );
}
