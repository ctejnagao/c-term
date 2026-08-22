'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PartnersPage() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/partners')
      .then(res => res.json())
      .then(data => {
        setPartners(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">取引先マスタ</h1>
        <Link 
          href="/partners/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          新規取引先登録
        </Link>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-3">ID / コード</th>
              <th className="p-3">取引先名</th>
              <th className="p-3">住所 / TEL</th>
              <th className="p-3">種別</th>
              <th className="p-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="p-4 text-center">Loading...</td></tr>
            ) : partners.map((p: any) => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{p.id} {p.code ? `/ ${p.code}` : ''}</td>
                <td className="p-3 font-bold">{p.name}</td>
                <td className="p-3 text-sm text-gray-600">
                  {p.postalCode ? `〒${p.postalCode} ` : ''}{p.address}<br/>
                  {p.tel ? `TEL: ${p.tel}` : ''}
                </td>
                <td className="p-3">
                  {p.isCustomer && <span className="mr-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">得意先</span>}
                  {p.isSupplier && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">仕入先</span>}
                </td>
                <td className="p-3 text-center">
                  <Link href={`/partners/${p.id}`} className="text-blue-600 hover:underline text-sm font-bold">
                    編集
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
