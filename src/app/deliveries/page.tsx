'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // モーダル用ステート
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingProjects, setPendingProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  const [employees, setEmployees] = useState([]);
  const [partners, setPartners] = useState([]);
  const [filterStaff, setFilterStaff] = useState('');
  const [filterStatus, setFilterStatus] = useState('受注');
  const [filterPartner, setFilterPartner] = useState('');
  
  const [formData, setFormData] = useState({
    deliveryDate: new Date().toISOString().split('T')[0],
    expectedPayDate: '',
  });
  const [items, setItems] = useState<any[]>([]);

  const fetchDeliveries = () => {
    fetch('/api/deliveries')
      .then(res => res.json())
      .then(data => {
        setDeliveries(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDeliveries();
    fetch('/api/employees', { cache: 'no-store' }).then(res => res.json()).then(setEmployees);
    fetch('/api/partners', { cache: 'no-store' }).then(res => res.json()).then(setPartners);
  }, []);

  let filteredDeliveries = deliveries;
  if (filterStaff) {
    filteredDeliveries = filteredDeliveries.filter((d: any) => d.project?.leadStaff === filterStaff);
  }
  if (filterStatus) {
    filteredDeliveries = filteredDeliveries.filter((d: any) => d.project?.status === filterStatus);
  }
  if (filterPartner) {
    filteredDeliveries = filteredDeliveries.filter((d: any) => String(d.project?.partnerId) === filterPartner);
  }

  const openModal = async () => {
    setIsModalOpen(true);
    const res = await fetch('/api/deliveries/pending-projects');
    const data = await res.json();
    setPendingProjects(data);
  };

  const handleProjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pid = e.target.value;
    setSelectedProjectId(pid);
    
    if (pid) {
      const proj = pendingProjects.find(p => String(p.id) === pid);
      if (proj && proj.estimates && proj.estimates.length > 0) {
        const est = proj.estimates[0];
        const newItems = est.items.map((i: any) => ({
          ...i,
          amount: Number(i.quantity) * Number(i.unitPrice)
        }));
        setItems(newItems);
      } else {
        setItems([{ itemName: '', quantity: 1, unit: '式', unitPrice: 0 }]);
      }
    } else {
      setItems([]);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { itemName: '', quantity: 1, unit: '式', unitPrice: 0 }]);
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
    items.forEach(i => {
      subtotal += Number(i.quantity) * Number(i.unitPrice);
    });
    return { subtotal, tax: Math.floor(subtotal * 0.1), totalAmount: subtotal + Math.floor(subtotal * 0.1) };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return alert('案件を選択してください');

    const { subtotal, tax, totalAmount } = calculateTotals();

    const res = await fetch('/api/deliveries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: selectedProjectId,
        deliveryDate: formData.deliveryDate,
        expectedPayDate: formData.expectedPayDate,
        items,
        subtotal,
        tax,
        totalAmount
      })
    });

    if (res.ok) {
      const data = await res.json();
      alert(`納品書を発行しました（№ ${data.deliveryNo}）`);
      setIsModalOpen(false);
      setSelectedProjectId('');
      setItems([]);
      fetchDeliveries();
    } else {
      alert('エラーが発生しました');
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">納品管理台帳</h1>
        <div className="flex gap-4 items-center flex-wrap justify-end">
          <select className="border p-2 rounded text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">全てのステータス</option>
            <option value="案件">案件</option>
            <option value="見積中">見積中</option>
            <option value="受注">受注</option>
            <option value="納品済">納品済</option>
            <option value="請求済">請求済</option>
            <option value="入金済">入金済</option>
            <option value="完了">完了</option>
          </select>
          <select className="border p-2 rounded text-sm max-w-xs" value={filterPartner} onChange={e => setFilterPartner(e.target.value)}>
            <option value="">全ての取引先</option>
            {partners.map((pt: any) => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
          </select>
          <select className="border p-2 rounded text-sm" value={filterStaff} onChange={e => setFilterStaff(e.target.value)}>
            <option value="">全ての自社担当者</option>
            {employees.map((emp: any) => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
          </select>
          <button 
            onClick={openModal}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold"
          >
            新規納品登録
          </button>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-3">納品日</th>
              <th className="p-3">納品№</th>
              <th className="p-3">件名 (案件)</th>
              <th className="p-3 text-right">金額(税抜)</th>
              <th className="p-3 text-right">TAX</th>
              <th className="p-3 text-right">合計金額</th>
              <th className="p-3 text-center">印刷</th>
              <th className="p-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-4 text-center">Loading...</td></tr>
            ) : filteredDeliveries.map((d: any) => (
              <tr key={d.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{format(new Date(d.deliveryDate), 'yyyy/MM/dd')}</td>
                <td className="p-3">{d.deliveryNo}</td>
                <td className="p-3">{d.project?.name}</td>
                <td className="p-3 text-right">¥{Number(d.subtotal || 0).toLocaleString()}</td>
                <td className="p-3 text-right">¥{Number(d.tax || 0).toLocaleString()}</td>
                <td className="p-3 text-right font-bold">¥{Number(d.totalAmount || 0).toLocaleString()}</td>
                <td className="p-3 text-center">
                  <Link href={`/print/delivery/${d.id}`} className="text-gray-600 hover:text-gray-900 border px-2 py-1 rounded text-sm bg-gray-50">
                    PDF/印刷
                  </Link>
                </td>
                <td className="p-3 text-center">
                  <Link href={`/deliveries/${d.id}`} className="text-blue-600 hover:underline text-sm font-bold">
                    編集
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 新規納品登録モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">新規納品登録</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded border">
                <div className="col-span-2">
                  <label className="block text-sm font-bold mb-1">対象案件 (受注済)</label>
                  <select 
                    className="w-full border p-2 rounded" 
                    value={selectedProjectId}
                    onChange={handleProjectSelect}
                    required
                  >
                    <option value="">選択してください</option>
                    {pendingProjects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.projectCode} - {p.name} ({p.partner?.name})
                      </option>
                    ))}
                  </select>
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
              </div>

              {selectedProjectId && (
                <div>
                  <h3 className="font-bold mb-2">納品明細（見積内容からコピー、または手動入力）</h3>
                  <table className="w-full text-left border-collapse mb-4">
                    <thead>
                      <tr className="bg-gray-200 border-b text-sm">
                        <th className="p-2 w-1/3">品名</th>
                        <th className="p-2 w-20">数量</th>
                        <th className="p-2 w-20">単位</th>
                        <th className="p-2 w-32">単価</th>
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
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button 
                  type="submit"
                  disabled={!selectedProjectId}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold disabled:bg-gray-400"
                >
                  納品登録
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
