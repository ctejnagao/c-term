'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewProjectPage() {
  const router = useRouter();
  const [partners, setPartners] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    partnerId: '',
    status: '案件',
    leadStaff: '',
    approximateAmount: '',
  });

  useEffect(() => {
    fetch('/api/partners').then(res => res.json()).then(setPartners);
    fetch('/api/employees').then(res => res.json()).then(setEmployees);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partnerId) return alert('取引先を選択してください');

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      router.push('/');
    } else {
      alert('エラーが発生しました');
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">新規案件登録</h1>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">取引先</label>
          <select 
            className="w-full border p-2 rounded" 
            value={formData.partnerId}
            onChange={e => setFormData({...formData, partnerId: e.target.value})}
            required
          >
            <option value="">選択してください</option>
            {partners.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">案件名/件名</label>
          <input 
            type="text" 
            className="w-full border p-2 rounded" 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            required
          />
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
          <label className="block text-sm font-medium mb-1">概算金額</label>
          <input 
            type="number" 
            className="w-full border p-2 rounded" 
            value={formData.approximateAmount}
            onChange={e => setFormData({...formData, approximateAmount: e.target.value})}
            placeholder="例: 1000000"
          />
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <button type="button" onClick={() => router.back()} className="px-6 py-2 border rounded hover:bg-gray-50">キャンセル</button>
          <button type="submit" className="bg-blue-600 text-white px-8 py-2 rounded hover:bg-blue-700 font-bold">登録する</button>
        </div>
      </form>
    </div>
  );
}
