'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // モーダル用ステート
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingProjects, setPendingProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  const [employees, setEmployees] = useState([]);
  const [partners, setPartners] = useState([]);
  const [filterStaff, setFilterStaff] = useState('');
  const [filterStatus, setFilterStatus] = useState('納品済');
  const [filterPartner, setFilterPartner] = useState('');
  
  const [formData, setFormData] = useState({
    issueDate: new Date().toISOString().split('T')[0],
  });
  const [items, setItems] = useState<any[]>([]);

  const fetchInvoices = () => {
    fetch('/api/invoices')
      .then(res => res.json())
      .then(data => {
        setInvoices(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchInvoices();
    fetch('/api/employees', { cache: 'no-store' }).then(res => res.json()).then(setEmployees);
    fetch('/api/partners', { cache: 'no-store' }).then(res => res.json()).then(setPartners);
  }, []);

  let filteredInvoices = invoices;
  if (filterStaff) {
    filteredInvoices = filteredInvoices.filter((i: any) => i.project?.leadStaff === filterStaff);
  }
  if (filterStatus) {
    filteredInvoices = filteredInvoices.filter((i: any) => i.project?.status === filterStatus);
  }
  if (filterPartner) {
    filteredInvoices = filteredInvoices.filter((i: any) => String(i.project?.partnerId) === filterPartner);
  }

  const openModal = async () => {
    setIsModalOpen(true);
    const res = await fetch('/api/invoices/pending-projects');
    const data = await res.json();
    setPendingProjects(data);
  };

  const handleProjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pid = e.target.value;
    setSelectedProjectId(pid);
    
    if (pid) {
      const proj = pendingProjects.find(p => String(p.id) === pid);
      if (proj && proj.deliveries && proj.deliveries.length > 0) {
        const deliv = proj.deliveries[0];
        const newItems = deliv.items.map((i: any) => ({
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

    const proj = pendingProjects.find(p => String(p.id) === selectedProjectId);
    if (!proj) return;

    const { subtotal, tax, totalAmount } = calculateTotals();

    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: selectedProjectId,
        partnerId: proj.partnerId,
        issueDate: formData.issueDate,
        items,
        subtotal,
        tax,
        totalAmount
      })
    });

    if (res.ok) {
      const data = await res.json();
      alert(`請求書を発行しました（№ ${data.invoiceNo}）`);
      setIsModalOpen(false);
      setSelectedProjectId('');
      setItems([]);
      fetchInvoices();
    } else {
      alert('エラーが発生しました');
    }
  };


  const updateStatus = async (id: number, status: string) => {
    await fetch('/api/invoices', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, paymentStatus: status })
    });
    fetchInvoices();
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">請求・入金台帳</h1>
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
            新規請求登録
          </button>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-3">請求日</th>
              <th className="p-3">請求№</th>
              <th className="p-3">相手先</th>
              <th className="p-3">件名 (案件)</th>
              <th className="p-3 text-right">請求額(税込)</th>
              <th className="p-3 text-center">入金状況</th>
              <th className="p-3 text-center">ステータス更新</th>
              <th className="p-3 text-center">印刷</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-4 text-center">Loading...</td></tr>
            ) : filteredInvoices.map((i: any) => (
              <tr key={i.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{format(new Date(i.issueDate), 'yyyy/MM/dd')}</td>
                <td className="p-3">{i.invoiceNo}</td>
                <td className="p-3">{i.partner?.name}</td>
                <td className="p-3">{i.project?.name}</td>
                <td className="p-3 text-right font-bold">¥{Number(i.totalAmount || 0).toLocaleString()}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded text-sm ${
                    i.paymentStatus === '入金済' ? 'bg-green-100 text-green-800' :
                    i.paymentStatus === '一部入金' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {i.paymentStatus}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <select 
                    className="border text-sm p-1 rounded bg-white"
                    value={i.paymentStatus}
                    onChange={(e) => updateStatus(i.id, e.target.value)}
                  >
                    <option value="未入金">未入金</option>
                    <option value="一部入金">一部入金</option>
                    <option value="入金済">入金済</option>
                  </select>
                </td>
                <td className="p-3 text-center">
                  <Link href={`/print/invoice/${i.id}`} className="text-gray-600 hover:text-gray-900 border px-2 py-1 rounded text-sm bg-gray-50">
                    PDF/印刷
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 新規請求登録モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">新規請求登録</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded border">
                <div>
                  <label className="block text-sm font-bold mb-1">対象案件 (納品済)</label>
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
                  <label className="block text-sm font-bold mb-1">請求日</label>
                  <input 
                    type="date" 
                    className="w-full border p-2 rounded" 
                    value={formData.issueDate}
                    onChange={e => setFormData({...formData, issueDate: e.target.value})}
                    required
                  />
                </div>
              </div>

              {selectedProjectId && (
                <div>
                  <h3 className="font-bold mb-2">請求明細（納品内容からコピー、または手動入力）</h3>
                  <table className="w-full text-left border-collapse mb-4">
                    <thead>
                      <tr className="bg-gray-200 border-b text-sm">
                        <th className="p-2 w-1/3">品名・摘要</th>
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
                  請求登録
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
