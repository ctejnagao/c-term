'use client';

import { useState, useEffect } from 'react';
import { Building2, Save } from 'lucide-react';

export default function CompanySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [formData, setFormData] = useState({
    companyName: '',
    postalCode: '',
    address: '',
    tel: '',
    fax: '',
    invoiceNumber: '',
    fiscalYearEndMonth: 3,
    currentProcessingMonth: ''
  });

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      const res = await fetch('/api/company-info');
      const data = await res.json();
      if (data) {
        setFormData({
          companyName: data.companyName || '',
          postalCode: data.postalCode || '',
          address: data.address || '',
          tel: data.tel || '',
          fax: data.fax || '',
          invoiceNumber: data.invoiceNumber || '',
          fiscalYearEndMonth: data.fiscalYearEndMonth || 3,
          currentProcessingMonth: data.currentProcessingMonth || ''
        });
      }
    } catch (error) {
      console.error('Failed to fetch company info', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/company-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        setMessage('保存しました');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('保存に失敗しました');
      }
    } catch (error) {
      console.error(error);
      setMessage('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8">読み込み中...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
          <Building2 size={24} />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">自社基本マスタ設定</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">会社名</label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="株式会社〇〇"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">郵便番号</label>
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="100-0001"
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="東京都千代田区..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
              <input
                type="text"
                name="tel"
                value={formData.tel}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">FAX番号</label>
              <input
                type="text"
                name="fax"
                value={formData.fax}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">インボイス登録番号</label>
              <input
                type="text"
                name="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="T1234567890123"
              />
            </div>
            
            <div className="col-span-2 border-t pt-6 mt-2">
              <h3 className="text-lg font-medium text-gray-800 mb-4">システム設定</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">決算月</label>
              <select
                name="fiscalYearEndMonth"
                value={formData.fiscalYearEndMonth}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}月</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">現在の処理年月度</label>
              <input
                type="month"
                name="currentProcessingMonth"
                value={formData.currentProcessingMonth}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-6 border-t">
            {message && (
              <span className={`text-sm ${message.includes('失敗') ? 'text-red-500' : 'text-green-500'}`}>
                {message}
              </span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-70"
            >
              <Save size={18} />
              {saving ? '保存中...' : '保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
