'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filterStaff, setFilterStaff] = useState('');
  const [filterStatus, setFilterStatus] = useState('案件');
  const [filterPartner, setFilterPartner] = useState('');

  useEffect(() => {
    fetch('/api/estimates', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setEstimates(data);
        setLoading(false);
      });
    fetch('/api/employees', { cache: 'no-store' }).then(res => res.json()).then(setEmployees);
    fetch('/api/partners', { cache: 'no-store' }).then(res => res.json()).then(setPartners);
  }, []);

  let filteredEstimates = estimates;
  if (filterStaff) {
    filteredEstimates = filteredEstimates.filter((e: any) => e.project?.leadStaff === filterStaff);
  }
  if (filterStatus) {
    filteredEstimates = filteredEstimates.filter((e: any) => e.project?.status === filterStatus);
  }
  if (filterPartner) {
    filteredEstimates = filteredEstimates.filter((e: any) => String(e.partnerId) === filterPartner);
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">見積管理台帳</h1>
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
          <Link href="/estimates/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            新規見積作成
          </Link>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-3">発行日</th>
              <th className="p-3">見積№</th>
              <th className="p-3">相手先</th>
              <th className="p-3">件名 (案件)</th>
              <th className="p-3">ステータス</th>
              <th className="p-3 text-right">金額(税抜)</th>
              <th className="p-3 text-right">TAX</th>
              <th className="p-3 text-right">仕入額</th>
              <th className="p-3 text-right">粗利</th>
              <th className="p-3 text-right">粗利率</th>
              <th className="p-3 text-center">印刷</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="p-4 text-center">Loading...</td></tr>
            ) : filteredEstimates.map((e: any) => {
              const sub = Number(e.subtotal) || 0;
              const gross = Number(e.grossProfit) || 0;
              const profitRate = sub > 0 ? (gross / sub) * 100 : 0;
              return (
                <tr key={e.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{format(new Date(e.issueDate), 'yyyy/MM/dd')}</td>
                  <td className="p-3">
                    <Link href={`/estimates/${e.id}`} className="text-blue-600 hover:underline">
                      {e.estimateNo}
                    </Link>
                  </td>
                  <td className="p-3">{e.partner?.name}</td>
                  <td className="p-3">{e.project?.name}</td>
                  <td className="p-3">
                    {e.project?.status === '受注' ? (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold border border-green-200">
                        受注済
                      </span>
                    ) : (
                      <span className="text-gray-500 text-sm">{e.project?.status || '見積中'}</span>
                    )}
                  </td>
                  <td className="p-3 text-right">¥{sub.toLocaleString()}</td>
                  <td className="p-3 text-right">¥{Number(e.tax).toLocaleString()}</td>
                  <td className="p-3 text-right">¥{Number(e.purchaseCost || 0).toLocaleString()}</td>
                  <td className="p-3 text-right">¥{gross.toLocaleString()}</td>
                  <td className="p-3 text-right">{profitRate.toFixed(1)}%</td>
                  <td className="p-3 text-center">
                    <Link href={`/print/estimate/${e.id}`} className="text-gray-600 hover:text-gray-900 border px-2 py-1 rounded text-sm bg-gray-50">
                      PDF/印刷
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
