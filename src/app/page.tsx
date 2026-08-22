'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
    fetchProjects();
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
      body: JSON.stringify({ ...project, leadStaff: staff })
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
      '入金済': 8,
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
            <option value="納品済">納品済</option>
            <option value="請求済">請求済</option>
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
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            新規案件登録
          </Link>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-3">案件№</th>
              <th className="p-3">物件名/件名</th>
              <th className="p-3">取引先</th>
              <th className="p-3 text-right">見積金額(税込)</th>
              <th className="p-3">ステータス</th>
              <th className="p-3">担当者</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-4 text-center">Loading...</td></tr>
            ) : sortedProjects.map((p: any) => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  <Link href={`/projects/${p.id}`} className="text-blue-600 hover:underline">
                    {p.projectCode}
                  </Link>
                </td>
                <td className="p-3">{p.name}</td>
                <td className="p-3">{p.partner?.name}</td>
                <td className="p-3 text-right">
                  {p.estimates?.[0] ? `¥${Number(p.estimates[0].totalAmount).toLocaleString()}` : '-'}
                </td>
                <td className="p-3">
                  <span className="px-2 py-1 bg-gray-100 rounded text-sm">{p.status}</span>
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
