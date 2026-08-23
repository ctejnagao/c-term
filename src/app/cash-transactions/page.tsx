'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Download, RefreshCw, Calculator, Calendar } from 'lucide-react';

type Transaction = {
  id: number;
  transactionDate: string;
  type: string;
  employeeId: number;
  projectId: number | null;
  categoryType: string;
  description: string;
  amount: number;
  accountSubject: string;
  taxCategory: string;
  employee?: { id: number; name: string };
  project?: { id: number; name: string };
};

export default function CashTransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [yearMonth, setYearMonth] = useState('');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [carryOverAmount, setCarryOverAmount] = useState<number>(0);
  
  const [employees, setEmployees] = useState<{id: number, name: string}[]>([]);
  const [projects, setProjects] = useState<{id: number, name: string}[]>([]);
  
  const [formData, setFormData] = useState({
    transactionDate: '',
    type: 'OUT',
    employeeId: '',
    projectId: '',
    categoryType: '',
    description: '',
    amount: '',
    accountSubject: '旅費交通費',
    taxCategory: '仕入10％'
  });

  useEffect(() => {
    const init = async () => {
      // Fetch default processing month
      try {
        const companyRes = await fetch('/api/company-info');
        const companyData = await companyRes.json();
        
        // Fetch dropdown data
        const [empRes, projRes] = await Promise.all([
          fetch('/api/employees'),
          fetch('/api/projects')
        ]);
        setEmployees(await empRes.json());
        setProjects(await projRes.json());

        const defaultMonth = companyData?.currentProcessingMonth || new Date().toISOString().slice(0, 7);
        setYearMonth(defaultMonth);
        setFormData(prev => ({ ...prev, transactionDate: `${defaultMonth}-01` }));
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (yearMonth) {
      fetchData(yearMonth);
    }
  }, [yearMonth]);

  const fetchData = async (month: string) => {
    setLoading(true);
    try {
      const [txRes, balRes] = await Promise.all([
        fetch(`/api/cash-transactions?yearMonth=${month}`),
        fetch(`/api/cash-balances?yearMonth=${month}`)
      ]);
      setTransactions(await txRes.json());
      const balData = await balRes.json();
      setCarryOverAmount(balData.carryOverAmount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMonth = e.target.value;
    setYearMonth(newMonth);
    setFormData(prev => ({ ...prev, transactionDate: `${newMonth}-01` }));
  };

  const handleCarryOverChange = async (e: React.FocusEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCarryOverAmount(val);
    try {
      await fetch('/api/cash-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearMonth, carryOverAmount: val }),
      });
    } catch (err) {
      console.error('Failed to update balance', err);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/cash-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const newTx = await res.json();
        setTransactions([...transactions, newTx]);
        setFormData(prev => ({ ...prev, description: '', amount: '' })); // reset some fields
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('本当に削除しますか？')) return;
    try {
      const res = await fetch(`/api/cash-transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTransactions(transactions.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const exportCSV = () => {
    if (transactions.length === 0) return;
    
    const headers = ['日付', '区分', '社員名', '案件名', '分類', '摘要', '金額', '勘定科目', '消費税区分'];
    const rows = transactions.map(t => [
      new Date(t.transactionDate).toLocaleDateString('ja-JP'),
      t.type === 'IN' ? '入金' : '出金',
      t.employee?.name || '',
      t.project?.name || '',
      t.categoryType || '',
      t.description || '',
      t.amount.toString(),
      t.accountSubject || '',
      t.taxCategory || ''
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' }); // Add BOM
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `現金出納台帳_${yearMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate totals
  const totalIn = transactions.filter(t => t.type === 'IN').reduce((sum, t) => sum + t.amount, 0);
  const totalOut = transactions.filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.amount, 0);
  const currentBalance = carryOverAmount + totalIn - totalOut;

  if (loading && transactions.length === 0) {
    return <div className="p-8">読み込み中...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg">
            <Calculator size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">社員現金出納管理</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white px-4 py-2 border rounded-lg shadow-sm">
            <Calendar size={18} className="text-gray-500" />
            <input 
              type="month" 
              value={yearMonth} 
              onChange={handleMonthChange} 
              className="outline-none text-gray-700 font-medium"
            />
          </div>
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Download size={18} />
            会計CSV出力
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-between">
          <span className="text-gray-500 text-sm font-medium">前月繰越額</span>
          <div className="mt-2 flex items-center">
            <span className="text-xl font-bold text-gray-800 mr-1">¥</span>
            <input 
              type="number"
              value={carryOverAmount}
              onChange={e => setCarryOverAmount(Number(e.target.value))}
              onBlur={handleCarryOverChange}
              className="text-2xl font-bold text-gray-800 w-full outline-none border-b focus:border-blue-500 bg-transparent"
            />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-between">
          <span className="text-gray-500 text-sm font-medium">当月入金合計</span>
          <div className="mt-2 text-2xl font-bold text-green-600">
            ¥ {totalIn.toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-between">
          <span className="text-gray-500 text-sm font-medium">当月出金合計</span>
          <div className="mt-2 text-2xl font-bold text-red-600">
            ¥ {totalOut.toLocaleString()}
          </div>
        </div>
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-between">
          <span className="text-blue-800 text-sm font-medium">当月残高</span>
          <div className="mt-2 text-3xl font-bold text-blue-900">
            ¥ {currentBalance.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="bg-white rounded-xl border shadow-sm p-6 mb-8 shrink-0">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Plus size={18} /> 新規登録
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
          <div className="w-32">
            <label className="block text-xs text-gray-500 mb-1">日付</label>
            <input type="date" name="transactionDate" value={formData.transactionDate} onChange={handleFormChange} required className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div className="w-24">
            <label className="block text-xs text-gray-500 mb-1">区分</label>
            <select name="type" value={formData.type} onChange={handleFormChange} className="w-full border rounded px-3 py-2 text-sm">
              <option value="OUT">出金</option>
              <option value="IN">入金</option>
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs text-gray-500 mb-1">社員</label>
            <select name="employeeId" value={formData.employeeId} onChange={handleFormChange} required className="w-full border rounded px-3 py-2 text-sm">
              <option value="">選択...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="w-48">
            <label className="block text-xs text-gray-500 mb-1">案件 (任意)</label>
            <select name="projectId" value={formData.projectId} onChange={handleFormChange} className="w-full border rounded px-3 py-2 text-sm">
              <option value="">社内・共通</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs text-gray-500 mb-1">分類</label>
            <input type="text" name="categoryType" value={formData.categoryType} onChange={handleFormChange} placeholder="交通機関 等" className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">摘要</label>
            <input type="text" name="description" value={formData.description} onChange={handleFormChange} required placeholder="内容を入力" className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div className="w-32">
            <label className="block text-xs text-gray-500 mb-1">金額</label>
            <input type="number" name="amount" value={formData.amount} onChange={handleFormChange} required placeholder="¥ 0" className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div className="w-32">
            <label className="block text-xs text-gray-500 mb-1">勘定科目</label>
            <select name="accountSubject" value={formData.accountSubject} onChange={handleFormChange} className="w-full border rounded px-3 py-2 text-sm">
              <option value="旅費交通費">旅費交通費</option>
              <option value="消耗品費">消耗品費</option>
              <option value="雑費">雑費</option>
              <option value="会議費">会議費</option>
              <option value="水道光熱費">水道光熱費</option>
            </select>
          </div>
          <div className="w-28">
            <label className="block text-xs text-gray-500 mb-1">税区分</label>
            <select name="taxCategory" value={formData.taxCategory} onChange={handleFormChange} className="w-full border rounded px-3 py-2 text-sm">
              <option value="仕入10％">仕入10％</option>
              <option value="仕入8％（軽）">仕入8％（軽）</option>
              <option value="対象外">対象外</option>
              <option value="非課税">非課税</option>
            </select>
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm transition-colors mb-[1px]">
            追加
          </button>
        </form>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">日付</th>
                <th className="px-4 py-3 whitespace-nowrap">区分</th>
                <th className="px-4 py-3 whitespace-nowrap">社員名</th>
                <th className="px-4 py-3 whitespace-nowrap">案件名</th>
                <th className="px-4 py-3 whitespace-nowrap">分類</th>
                <th className="px-4 py-3 min-w-[200px]">摘要</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">金額</th>
                <th className="px-4 py-3 whitespace-nowrap">勘定科目 / 税</th>
                <th className="px-4 py-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">データがありません</td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(t.transactionDate).toLocaleDateString('ja-JP')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${t.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {t.type === 'IN' ? '入金' : '出金'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{t.employee?.name}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{t.project?.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{t.categoryType || '-'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{t.description}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">¥ {t.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      <div>{t.accountSubject}</div>
                      <div className="text-gray-400">{t.taxCategory}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors" title="削除">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
