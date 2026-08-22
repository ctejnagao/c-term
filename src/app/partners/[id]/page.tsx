'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function EditPartnerPage() {
  const router = useRouter();
  const params = useParams();
  const partnerId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    shortName: '',
    department: '',
    postalCode: '',
    address: '',
    tel: '',
    fax: '',
    closingDay: '',
    paymentTerm: '',
    isCustomer: true,
    isSupplier: false,
  });

  useEffect(() => {
    fetch(`/api/partners/${partnerId}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setFormData({
          name: data.name || '',
          code: data.code || '',
          shortName: data.shortName || '',
          department: data.department || '',
          postalCode: data.postalCode || '',
          address: data.address || '',
          tel: data.tel || '',
          fax: data.fax || '',
          closingDay: data.closingDay || '',
          paymentTerm: data.paymentTerm || '',
          isCustomer: data.isCustomer,
          isSupplier: data.isSupplier,
        });
        setLoading(false);
      })
      .catch(err => {
        alert('取引先が見つかりません');
        router.push('/partners');
      });
  }, [partnerId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch(`/api/partners/${partnerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      router.push('/partners');
    } else {
      alert('エラーが発生しました');
    }
  };
  
  const handleDelete = async () => {
    if (!window.confirm('本当にこの取引先を削除しますか？')) return;
    const res = await fetch(`/api/partners/${partnerId}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/partners');
    } else {
      alert('削除に失敗しました（関連する案件や見積がある可能性があります）');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">取引先 編集</h1>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow space-y-4">
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">取引先名 <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              className="w-full border p-2 rounded" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">取引先コード</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded" 
              value={formData.code}
              onChange={e => setFormData({...formData, code: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">略称</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded" 
              value={formData.shortName}
              onChange={e => setFormData({...formData, shortName: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">部署・担当宛先</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded" 
              value={formData.department}
              onChange={e => setFormData({...formData, department: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1">郵便番号</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded" 
              value={formData.postalCode}
              onChange={e => setFormData({...formData, postalCode: e.target.value})}
              placeholder="例: 460-0002"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">住所</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded" 
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">TEL</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded" 
              value={formData.tel}
              onChange={e => setFormData({...formData, tel: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">FAX</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded" 
              value={formData.fax}
              onChange={e => setFormData({...formData, fax: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">締め日</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded" 
              value={formData.closingDay}
              onChange={e => setFormData({...formData, closingDay: e.target.value})}
              placeholder="例: 20日締め"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">支払期日</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded" 
              value={formData.paymentTerm}
              onChange={e => setFormData({...formData, paymentTerm: e.target.value})}
              placeholder="例: 翌月20日払い"
            />
          </div>
        </div>

        <div className="flex gap-6 py-2 border-t mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={formData.isCustomer}
              onChange={e => setFormData({...formData, isCustomer: e.target.checked})}
              className="w-4 h-4"
            />
            得意先として登録
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={formData.isSupplier}
              onChange={e => setFormData({...formData, isSupplier: e.target.checked})}
              className="w-4 h-4"
            />
            仕入先として登録
          </label>
        </div>

        <div className="flex justify-between items-center pt-4 border-t mt-4">
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
