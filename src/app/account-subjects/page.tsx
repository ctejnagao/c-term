'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, Tag, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

interface AccountSubject {
  id: number;
  code: string | null;
  name: string;
  isForCash: boolean;
  isActive: boolean;
  displayOrder: number;
  description: string | null;
}

export default function AccountSubjectsPage() {
  const [subjects, setSubjects] = useState<AccountSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'cashOnly' | 'generalOnly'>('all');

  // 新規登録フォーム状態
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    isForCash: true,
    displayOrder: 100,
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // 編集状態
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<AccountSubject>>({});

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/account-subjects');
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/account-subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setFormData({
          name: '',
          code: '',
          isForCash: true,
          displayOrder: (subjects.length + 1) * 10,
          description: '',
        });
        fetchSubjects();
      } else {
        const err = await res.json();
        alert(err.error || '登録に失敗しました');
      }
    } catch (error) {
      alert('通信エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (s: AccountSubject) => {
    setEditingId(s.id);
    setEditData({
      name: s.name,
      code: s.code || '',
      isForCash: s.isForCash,
      isActive: s.isActive,
      displayOrder: s.displayOrder,
      description: s.description || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleUpdate = async (id: number) => {
    if (!editData.name?.trim()) return;

    try {
      const res = await fetch(`/api/account-subjects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (res.ok) {
        setEditingId(null);
        fetchSubjects();
      } else {
        const err = await res.json();
        alert(err.error || '更新に失敗しました');
      }
    } catch (error) {
      alert('通信エラーが発生しました');
    }
  };

  const toggleCashFlag = async (s: AccountSubject) => {
    try {
      const res = await fetch(`/api/account-subjects/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: s.name,
          isForCash: !s.isForCash,
        }),
      });
      if (res.ok) {
        fetchSubjects();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleActive = async (s: AccountSubject) => {
    try {
      const res = await fetch(`/api/account-subjects/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: s.name,
          isActive: !s.isActive,
        }),
      });
      if (res.ok) {
        fetchSubjects();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`勘定科目「${name}」を削除しますか？\n（過去の出納履歴データはそのまま保持されます）`)) return;

    try {
      const res = await fetch(`/api/account-subjects/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchSubjects();
      } else {
        alert('削除に失敗しました');
      }
    } catch (error) {
      alert('通信エラーが発生しました');
    }
  };

  const filteredSubjects = subjects.filter(s => {
    if (filter === 'cashOnly') return s.isForCash;
    if (filter === 'generalOnly') return !s.isForCash;
    return true;
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="w-6 h-6 text-blue-600" />
            勘定科目マスタ
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            小口現金出納や会計処理で使用する勘定科目を管理します。「小口現金」のフラグを有効にした科目のみが小口現金画面の選択肢に表示されます。
          </p>
        </div>
        <button
          onClick={fetchSubjects}
          className="flex items-center gap-1.5 px-3 py-1.5 border rounded text-xs text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          更新
        </button>
      </div>

      {/* 新規登録フォーム */}
      <div className="bg-white p-5 rounded-xl border shadow-sm mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
          <Plus className="w-4 h-4 text-blue-600" />
          新規勘定科目の追加
        </h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">コード (任意)</label>
            <input
              type="text"
              placeholder="例: 6111"
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value })}
              className="w-full border rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">勘定科目名 <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              placeholder="例: 旅費交通費"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">摘要・説明</label>
            <input
              type="text"
              placeholder="例: 電車・タクシー代"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">表示順</label>
            <input
              type="number"
              value={formData.displayOrder}
              onChange={e => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
              className="w-full border rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div className="md:col-span-2 flex items-center h-9">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.isForCash}
                onChange={e => setFormData({ ...formData, isForCash: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                小口現金対象
              </span>
            </label>
          </div>
          <div className="md:col-span-1">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 px-3 rounded text-sm transition-colors"
            >
              追加
            </button>
          </div>
        </form>
      </div>

      {/* Filter Tabs & Summary */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            すべて ({subjects.length})
          </button>
          <button
            onClick={() => setFilter('cashOnly')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === 'cashOnly'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            小口現金対象 ({subjects.filter(s => s.isForCash).length})
          </button>
          <button
            onClick={() => setFilter('generalOnly')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === 'generalOnly'
                ? 'bg-gray-600 text-white'
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            一般・小口対象外 ({subjects.filter(s => !s.isForCash).length})
          </button>
        </div>
        <div className="text-xs text-gray-500">
          ※ バッジをクリックすると「小口現金対象」の切替が可能です
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 w-16">順序</th>
              <th className="px-4 py-3 w-24">コード</th>
              <th className="px-4 py-3">科目名</th>
              <th className="px-4 py-3">説明</th>
              <th className="px-4 py-3 text-center w-32">小口現金対象</th>
              <th className="px-4 py-3 text-center w-24">状態</th>
              <th className="px-4 py-3 text-right w-24">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  読み込み中...
                </td>
              </tr>
            ) : filteredSubjects.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  該当する勘定科目がありません
                </td>
              </tr>
            ) : (
              filteredSubjects.map(s => {
                const isEditing = editingId === s.id;

                if (isEditing) {
                  return (
                    <tr key={s.id} className="bg-blue-50/50">
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={editData.displayOrder || 0}
                          onChange={e => setEditData({ ...editData, displayOrder: Number(e.target.value) })}
                          className="w-16 border rounded px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editData.code || ''}
                          onChange={e => setEditData({ ...editData, code: e.target.value })}
                          className="w-20 border rounded px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editData.name || ''}
                          onChange={e => setEditData({ ...editData, name: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-xs font-semibold"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editData.description || ''}
                          onChange={e => setEditData({ ...editData, description: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={editData.isForCash || false}
                          onChange={e => setEditData({ ...editData, isForCash: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-600"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={editData.isActive !== false}
                          onChange={e => setEditData({ ...editData, isActive: e.target.checked })}
                          className="w-4 h-4 rounded text-green-600"
                        />
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleUpdate(s.id)}
                          className="text-green-600 hover:text-green-800 p-1 mr-1"
                          title="保存"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-gray-400 hover:text-gray-600 p-1"
                          title="キャンセル"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={s.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400">{s.displayOrder}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{s.code || '-'}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{s.description || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleCashFlag(s)}
                        title="クリックして切り替え"
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          s.isForCash
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200'
                        }`}
                      >
                        {s.isForCash ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-blue-600" />
                            小口対象
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-gray-400" />
                            対象外
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActive(s)}
                        className={`text-xs px-2 py-0.5 rounded ${
                          s.isActive
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                      >
                        {s.isActive ? '有効' : '無効'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => startEdit(s)}
                        className="text-gray-500 hover:text-blue-600 p-1 mr-1"
                        title="編集"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        className="text-gray-400 hover:text-red-600 p-1"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
