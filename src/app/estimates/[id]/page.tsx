'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function EditEstimatePage() {
  const router = useRouter();
  const params = useParams();
  const estimateId = params.id as string;

  const [projects, setProjects] = useState([]);
  const [partners, setPartners] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    projectId: '',
    partnerId: '',
    issueDate: new Date().toISOString().split('T')[0],
    validUntil: '二ケ月',
    paymentTerm: '別途御相談',
    leadStaff: '',
  });
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 受注登録モーダル用ステート
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [projectStatus, setProjectStatus] = useState('見積中');
  const [orderAcceptanceId, setOrderAcceptanceId] = useState<string | null>(null);
  const [orderData, setOrderData] = useState({
    orderedAt: new Date().toISOString().split('T')[0],
    clientOrderNo: '',
    orderAmount: 0,
    expectedDeliveryDate: '',
    leadStaff: ''
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then(res => res.json()),
      fetch('/api/partners').then(res => res.json()),
      fetch('/api/employees').then(res => res.json()),
      fetch(`/api/estimates/${estimateId}`).then(res => res.json())
    ]).then(([projectsData, partnersData, employeesData, estimateData]) => {
      setProjects(projectsData);
      setPartners(partnersData);
      setEmployees(employeesData);
      
      if (estimateData && !estimateData.error) {
        setFormData({
          projectId: String(estimateData.projectId),
          partnerId: String(estimateData.partnerId),
          issueDate: new Date(estimateData.issueDate).toISOString().split('T')[0],
          validUntil: estimateData.validUntil || '',
          paymentTerm: estimateData.paymentTerm || '',
          leadStaff: estimateData.project?.leadStaff || '',
        });
        
        if (estimateData.items && estimateData.items.length > 0) {
          setItems(estimateData.items);
        } else {
          setItems([{ itemName: '', quantity: 1, unit: '式', unitPrice: 0, costPrice: 0 }]);
        }

        setProjectStatus(estimateData.project?.status || '見積中');
        if (estimateData.project?.orderAccepts?.[0]) {
          setOrderAcceptanceId(String(estimateData.project.orderAccepts[0].id));
        }

        setOrderData(prev => ({
          ...prev,
          orderAmount: estimateData.totalAmount || 0,
          leadStaff: estimateData.project?.leadStaff || ''
        }));
      } else {
        alert('見積データの取得に失敗しました。');
      }
      setLoading(false);
    });
  }, [estimateId]);

  const handleAddItem = () => {
    setItems([...items, { itemName: '', quantity: 1, unit: '式', unitPrice: 0, costPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
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

    const res = await fetch(`/api/estimates/${estimateId}`, {
      method: 'PUT',
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

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/estimates/${estimateId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    if (res.ok) {
      setProjectStatus('受注');
      setIsOrderModalOpen(false);
      alert('受注登録と注文請書の作成が完了しました。');
    } else {
      alert('エラーが発生しました');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('本当にこの見積書を削除しますか？')) return;
    const res = await fetch(`/api/estimates/${estimateId}`, { method: 'DELETE' });
    if (res.ok) {
      window.location.href = '/estimates';
    } else {
      alert('削除に失敗しました');
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">見積書 編集</h1>
          {['受注', '一部納品', '納品済', '完了'].includes(projectStatus) && (
            <>
              <span className="bg-green-100 text-green-800 text-sm font-bold px-3 py-1 rounded-full border border-green-300">
                受注済
              </span>
              {orderAcceptanceId && (
                <a 
                  href={`/print/order_accept/${orderAcceptanceId}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-purple-100 text-purple-800 text-sm font-bold px-3 py-1 rounded-full border border-purple-300 hover:bg-purple-200 inline-flex items-center gap-1 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  注文請書の印刷
                </a>
              )}
            </>
          )}
        </div>
        
        {projectStatus !== '受注' && (
          <button 
            onClick={() => setIsOrderModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-bold"
          >
            受注登録
          </button>
        )}
      </div>
      
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
              <label className="block text-sm font-medium mb-1">自社担当者</label>
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
                  <td className="p-2">
                    <input type="number" className="w-full border p-1 rounded" value={item.costPrice ?? ''} onChange={e => handleItemChange(index, 'costPrice', e.target.value)} />
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

        <div className="flex justify-between items-center mt-6">
          <button 
            type="button" 
            onClick={handleDelete} 
            className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 font-bold"
          >
            削除
          </button>
          <div className="flex gap-4">
            <button type="button" onClick={() => router.back()} className="px-6 py-2 border rounded hover:bg-gray-50">キャンセル</button>
            <button type="submit" className="bg-blue-600 text-white px-8 py-2 rounded hover:bg-blue-700 font-bold">保存する</button>
          </div>
        </div>
      </form>

      {/* 受注登録モーダル */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">受注情報の入力</h2>
            <form onSubmit={handleOrderSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">受注日</label>
                <input 
                  type="date" 
                  className="w-full border p-2 rounded" 
                  value={orderData.orderedAt}
                  onChange={e => setOrderData({...orderData, orderedAt: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">取引先発注No (任意)</label>
                <input 
                  type="text" 
                  className="w-full border p-2 rounded placeholder-gray-300"
                  placeholder="例: PO-2026-001"
                  value={orderData.clientOrderNo}
                  onChange={e => setOrderData({...orderData, clientOrderNo: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">受注金額 (税抜)</label>
                <input 
                  type="number" 
                  className="w-full border p-2 rounded" 
                  value={orderData.orderAmount}
                  onChange={e => setOrderData({...orderData, orderAmount: Number(e.target.value)})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">納品予定日</label>
                <input 
                  type="date" 
                  className="w-full border p-2 rounded" 
                  value={orderData.expectedDeliveryDate}
                  onChange={e => setOrderData({...orderData, expectedDeliveryDate: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">自社担当者</label>
                <select 
                  className="w-full border p-2 rounded" 
                  value={orderData.leadStaff}
                  onChange={e => setOrderData({...orderData, leadStaff: e.target.value})}
                >
                  <option value="">選択してください</option>
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.name}>{emp.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold"
                >
                  受注確定
                </button>
              </div>
        </form>
          </div>
        </div>
      )}
    </div>
  );
}
