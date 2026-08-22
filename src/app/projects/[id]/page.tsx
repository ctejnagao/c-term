'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [project, setProject] = useState<any>(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    status: '',
    leadStaff: '',
    customerDepartment: '',
    customerStaff: ''
  });

  const fetchProject = () => {
    fetch(`/api/projects/${resolvedParams.id}`)
      .then(res => res.json())
      .then(data => {
        setProject(data);
        setEditForm({
          name: data.name,
          status: data.status,
          leadStaff: data.leadStaff || '',
          customerDepartment: data.customerDepartment || '',
          customerStaff: data.customerStaff || ''
        });
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProject();
    fetch('/api/employees').then(res => res.json()).then(setEmployees);
  }, [resolvedParams.id]);

  const handleUpdate = async () => {
    const res = await fetch(`/api/projects/${resolvedParams.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm)
    });
    if (res.ok) {
      setIsEditing(false);
      fetchProject();
    } else {
      const err = await res.json();
      alert('更新に失敗しました: ' + (err.details || err.error));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('本当にこの案件を削除しますか？')) return;
    const res = await fetch(`/api/projects/${resolvedParams.id}`, { method: 'DELETE' });
    if (res.ok) {
      window.location.href = '/';
    } else {
      alert('削除に失敗しました');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!project || project.error) return <div className="p-8">案件が見つかりません。</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">案件詳細</h1>
        <Link href="/" className="text-blue-600 hover:underline">← 案件台帳に戻る</Link>
      </div>

      <div className="bg-white p-6 rounded shadow relative">
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="absolute top-4 right-4 text-blue-600 hover:underline text-sm">編集</button>
        ) : (
          <div className="absolute top-4 right-4 flex gap-2">
            <button onClick={handleDelete} className="bg-red-600 text-white px-3 py-1 rounded text-sm mr-2 hover:bg-red-700">削除</button>
            <button onClick={handleUpdate} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">保存</button>
            <button onClick={() => { setIsEditing(false); setEditForm({
              name: project.name, status: project.status, leadStaff: project.leadStaff || '', customerDepartment: project.customerDepartment || '', customerStaff: project.customerStaff || ''
            })}} className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600">キャンセル</button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-y-4 gap-x-8 mt-4">
          <div>
            <p className="text-sm text-gray-500">案件№</p>
            <p className="font-bold text-lg">{project.projectCode}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">案件名/件名</p>
            {isEditing ? (
              <input type="text" className="border w-full p-1" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
            ) : (
              <p className="font-bold text-lg">{project.name}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">取引先</p>
            <p>{project.partner?.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">顧客の担当部署 / 担当者</p>
            {isEditing ? (
              <div className="flex gap-2">
                <input type="text" placeholder="部署" className="border w-full p-1" value={editForm.customerDepartment} onChange={e => setEditForm({...editForm, customerDepartment: e.target.value})} />
                <input type="text" placeholder="担当者" className="border w-full p-1" value={editForm.customerStaff} onChange={e => setEditForm({...editForm, customerStaff: e.target.value})} />
              </div>
            ) : (
              <p>
                {project.customerDepartment || '部署未登録'} / {project.customerStaff ? `${project.customerStaff} 様` : '担当者未登録'}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">ステータス / 自社担当者</p>
            {isEditing ? (
              <div className="flex gap-2 mt-1">
                <select className="border p-1" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                  <option value="案件">案件</option>
                  <option value="見積中">見積中</option>
                  <option value="受注">受注</option>
                  <option value="納品済">納品済</option>
                  <option value="請求済">請求済</option>
                  <option value="入金済">入金済</option>
                  <option value="完了">完了</option>
                </select>
                <select className="border p-1 flex-1" value={editForm.leadStaff} onChange={e => setEditForm({...editForm, leadStaff: e.target.value})}>
                  <option value="">担当者選択</option>
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.name}>{emp.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <p>
                <span className="px-2 py-1 bg-gray-100 rounded text-sm mr-2">{project.status}</span>
                {project.leadStaff}
              </p>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">関連見積</h2>
          <Link href="/estimates/new" className="text-sm bg-blue-600 text-white px-3 py-1 rounded">新規見積作成</Link>
        </div>
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-3">発行日</th>
                <th className="p-3">見積№</th>
                <th className="p-3 text-right">合計金額(税込)</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {project.estimates?.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-gray-500">見積はありません</td></tr>
              ) : project.estimates?.map((e: any) => (
                <tr key={e.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{new Date(e.issueDate).toLocaleDateString()}</td>
                  <td className="p-3">{e.estimateNo}</td>
                  <td className="p-3 text-right">¥{Number(e.totalAmount || 0).toLocaleString()}</td>
                  <td className="p-3 text-center">
                    <Link href={`/print/estimate/${e.id}`} className="text-blue-600 hover:underline">印刷</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
