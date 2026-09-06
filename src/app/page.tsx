'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { calculateExpectedPayDate, formatToYmd } from '@/lib/dateUtils';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStaff, setFilterStaff] = useState('');
  const [filterStatus, setFilterStatus] = useState('default');
  const [filterPartner, setFilterPartner] = useState('');

  const fetchProjects = () => {
    fetch('/api/projects', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setProjects(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    // 起動時・画面表示時に計上日超過の入金予定を自動で「入金済」へ同期
    fetch('/api/system/sync-payment-status')
      .catch(console.error)
      .finally(() => {
        fetchProjects();
      });

    fetch('/api/employees', { cache: 'no-store' })
      .then(res => res.json())
      .then(setEmployees);
    fetch('/api/partners', { cache: 'no-store' })
      .then(res => res.json())
      .then(setPartners);
  }, []);

  const updateStaff = async (project: any, staff: string) => {
    await fetch(`/api/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadStaff: staff })
    });
    fetchProjects();
  };

  const updateStatus = async (project: any, newStatus: string) => {
    let expectedPayDate = project.expectedPayDate;
    if (newStatus === '入金予定' && !expectedPayDate) {
      // 納品日（最新の納品書）または本日を基準にUFJ稼働日の翌月末を自動算出
      const baseDate = project.deliveries?.[0]?.deliveryDate || new Date();
      expectedPayDate = formatToYmd(calculateExpectedPayDate(baseDate));
    }

    await fetch(`/api/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status: newStatus,
        ...(expectedPayDate ? { expectedPayDate } : {})
      })
    });
    fetchProjects();
  };

  let filteredProjects = projects;
  if (filterStaff) {
    filteredProjects = filteredProjects.filter((p: any) => p.leadStaff === filterStaff);
  }
  if (filterStatus === 'default') {
    filteredProjects = filteredProjects.filter((p: any) => p.status !== '案件' && p.status !== '入金済');
  } else if (filterStatus !== '') {
    filteredProjects = filteredProjects.filter((p: any) => p.status === filterStatus);
  }

  if (filterPartner) {
    filteredProjects = filteredProjects.filter((p: any) => String(p.partnerId) === filterPartner);
  }

  const sortedProjects = [...filteredProjects].sort((a: any, b: any) => {
    const statusWeight: Record<string, number> = {
      '入金済': 9,
      '入金予定': 8,
      '完了': 7,
      '請求済': 6,
      '納品済': 5,
      '一部納品': 4,
      '受注': 3,
      '見積中': 2,
      '案件': 1
    };
    
    const weightA = statusWeight[a.status] || 0;
    const weightB = statusWeight[b.status] || 0;
    
    // 1. ステータス降順 (Desc)
    if (weightA !== weightB) {
      return weightB - weightA;
    }
    
    // 2. 案件No降順 (Desc)
    return b.projectCode.localeCompare(a.projectCode);
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Project台帳</h1>
        <div className="flex gap-4 items-center flex-wrap justify-end mt-4">
          <select 
            className="border p-2 rounded text-sm" 
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="default">デフォルト (案件・入金済以外)</option>
            <option value="">全てのステータス</option>
            <option value="案件">案件</option>
            <option value="見積中">見積中</option>
            <option value="受注">受注</option>
            <option value="一部納品">一部納品</option>
            <option value="納品済">納品済</option>
            <option value="請求済">請求済</option>
            <option value="入金予定">入金予定</option>
            <option value="入金済">入金済</option>
            <option value="完了">完了</option>
          </select>
          <select 
            className="border p-2 rounded text-sm max-w-xs" 
            value={filterPartner}
            onChange={e => setFilterPartner(e.target.value)}
          >
            <option value="">全ての取引先</option>
            {partners.map((pt: any) => (
              <option key={pt.id} value={pt.id}>{pt.name}</option>
            ))}
          </select>
          <select 
            className="border p-2 rounded text-sm" 
            value={filterStaff}
            onChange={e => setFilterStaff(e.target.value)}
          >
            <option value="">全ての自社担当者</option>
            {employees.map((emp: any) => (
              <option key={emp.id} value={emp.name}>{emp.name}</option>
            ))}
          </select>
          <Link 
            href="/projects/new" 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold"
          >
            新規案件登録
          </Link>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-3">案件№</th>
              <th className="p-3">物件名/件名</th>
              <th className="p-3">取引先</th>
              <th className="p-3 text-right">見積金額(税込)</th>
              <th className="p-3 text-center">ステータス更新</th>
              <th className="p-3 text-center">入金予定日 (UFJ)</th>
              <th className="p-3">担当者</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-4 text-center">Loading...</td></tr>
            ) : sortedProjects.map((p: any) => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-mono font-medium">
                  <Link href={`/projects/${p.id}`} className="text-blue-600 hover:underline">
                    {p.projectCode}
                  </Link>
                </td>
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3 text-gray-700">{p.partner?.name}</td>
                <td className="p-3 text-right font-bold">
                  {p.estimates?.[0] ? `¥${Number(p.estimates[0].totalAmount).toLocaleString()}` : '-'}
                </td>
                <td className="p-3 text-center">
                  <select 
                    className={`border text-sm p-1 rounded font-medium ${
                      p.status === '入金済' ? 'bg-green-50 text-green-800 border-green-300' :
                      p.status === '入金予定' ? 'bg-blue-50 text-blue-800 border-blue-300 font-bold' :
                      p.status === '請求済' ? 'bg-yellow-50 text-yellow-800 border-yellow-300' :
                      p.status === '納品済' ? 'bg-purple-50 text-purple-800 border-purple-300' :
                      'bg-white text-gray-700'
                    }`}
                    value={p.status}
                    onChange={(e) => updateStatus(p, e.target.value)}
                  >
                    <option value="案件">案件</option>
                    <option value="見積中">見積中</option>
                    <option value="受注">受注</option>
                    <option value="一部納品">一部納品</option>
                    <option value="納品済">納品済</option>
                    <option value="請求済">請求済</option>
                    <option value="入金予定">入金予定</option>
                    <option value="入金済">入金済</option>
                    <option value="完了">完了</option>
                  </select>
                </td>
                <td className="p-3 text-center text-sm font-mono">
                  {p.expectedPayDate ? (
                    <span className="text-blue-700 bg-blue-50 px-2 py-1 rounded">
                      {new Date(p.expectedPayDate).toISOString().slice(0, 10)}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="p-3">
                  <select 
                    className="border text-sm p-1 rounded bg-white w-full"
                    value={p.leadStaff || ''}
                    onChange={(e) => updateStaff(p, e.target.value)}
                  >
                    <option value="">未設定</option>
                    {employees.map((emp: any) => (
                      <option key={emp.id} value={emp.name}>{emp.name}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
