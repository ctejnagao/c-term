'use client';

import { useState, useEffect } from 'react';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  
  // 編集用の状態
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = () => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        setEmployees(data);
        setLoading(false);
      });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    if (res.ok) {
      setName('');
      fetchEmployees();
    } else {
      alert('エラーが発生しました');
    }
  };

  const startEdit = (emp: any) => {
    setEditingId(emp.id);
    setEditName(emp.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;

    const res = await fetch(`/api/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName })
    });

    if (res.ok) {
      setEditingId(null);
      fetchEmployees();
    } else {
      alert('エラーが発生しました');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('この社員を削除しますか？\n（過去のデータには影響しません）')) return;

    const res = await fetch(`/api/employees/${id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      fetchEmployees();
    } else {
      alert('エラーが発生しました');
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">社員マスタ</h1>

      <form onSubmit={handleAdd} className="bg-white p-6 rounded shadow mb-8 flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">新規追加</label>
          <input 
            type="text" 
            className="w-full border p-2 rounded" 
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="例: 社員M"
          />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-bold h-[42px]">
          追加する
        </button>
      </form>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-3 w-20">ID</th>
              <th className="p-3">社員名</th>
              <th className="p-3 w-40 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="p-4 text-center">Loading...</td></tr>
            ) : employees.map((emp: any) => (
              <tr key={emp.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{emp.id}</td>
                <td className="p-3">
                  {editingId === emp.id ? (
                    <input 
                      type="text" 
                      className="w-full border p-1 rounded" 
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      autoFocus
                    />
                  ) : (
                    <span className="font-bold">{emp.name}</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  {editingId === emp.id ? (
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => handleUpdate(emp.id)} 
                        className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                      >
                        保存
                      </button>
                      <button 
                        onClick={cancelEdit} 
                        className="text-sm bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center gap-3">
                      <button 
                        onClick={() => startEdit(emp)} 
                        className="text-blue-600 hover:underline text-sm"
                      >
                        編集
                      </button>
                      <button 
                        onClick={() => handleDelete(emp.id)} 
                        className="text-red-600 hover:underline text-sm"
                      >
                        削除
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {employees.length === 0 && !loading && (
              <tr><td colSpan={3} className="p-4 text-center text-gray-500">社員が登録されていません</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
