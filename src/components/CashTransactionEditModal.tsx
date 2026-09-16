'use client';

import { useState, useEffect } from 'react';
import { X, Pencil, Trash2, Save, AlertCircle } from 'lucide-react';

export type Transaction = {
  id: number;
  transactionDate: string;
  type: string;
  employeeId: number;
  projectId: number | null;
  categoryType: string;
  description: string;
  amount: number;
  accountSubject: string;
  taxCategory: string;
  employee?: { id: number; name: string };
  project?: { id: number; name: string };
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  employees: { id: number; name: string }[];
  projects: { id: number; name: string }[];
  accountSubjects: { id: number; name: string }[];
  onUpdated: (updated: Transaction) => void;
  onDeleted: (deletedId: number) => void;
}

export default function CashTransactionEditModal({
  isOpen,
  onClose,
  transaction,
  employees,
  projects,
  accountSubjects,
  onUpdated,
  onDeleted,
}: Props) {
  const [formData, setFormData] = useState({
    transactionDate: '',
    type: 'OUT',
    employeeId: '',
    projectId: '',
    categoryType: '',
    description: '',
    amount: '',
    accountSubject: '旅費交通費',
    taxCategory: '仕入10％',
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transaction) {
      // YYYY-MM-DD
      const dateStr = transaction.transactionDate
        ? new Date(transaction.transactionDate).toISOString().slice(0, 10)
        : '';
      setFormData({
        transactionDate: dateStr,
        type: transaction.type || 'OUT',
        employeeId: transaction.employeeId ? String(transaction.employeeId) : '',
        projectId: transaction.projectId ? String(transaction.projectId) : '',
        categoryType: transaction.categoryType || '',
        description: transaction.description || '',
        amount: transaction.amount !== undefined ? String(transaction.amount) : '',
        accountSubject: transaction.accountSubject || '旅費交通費',
        taxCategory: transaction.taxCategory || '仕入10％',
      });
      setError(null);
      setConfirmDelete(false);
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) {
      setError('社員を選択してください。');
      return;
    }
    if (!formData.description) {
      setError('摘要を入力してください。');
      return;
    }
    if (!formData.amount || isNaN(Number(formData.amount))) {
      setError('有効な金額を入力してください。');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/cash-transactions/${transaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: Number(formData.amount),
          employeeId: Number(formData.employeeId),
          projectId: formData.projectId ? Number(formData.projectId) : null,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || '出納データの更新に失敗しました。');
      }

      const updated = await res.json();
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || '更新中にエラーが発生しました。');
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/cash-transactions/${transaction.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || '出納データの削除に失敗しました。');
      }

      onDeleted(transaction.id);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || '削除中にエラーが発生しました。');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Pencil size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">現金出納明細の編集・削除</h3>
              <p className="text-xs text-gray-500">ID: #{transaction.id} の明細データを変更または削除します</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleUpdate} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* 日付 */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">日付</label>
              <input
                type="date"
                name="transactionDate"
                value={formData.transactionDate}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* 区分 (IN / OUT) */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">区分</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="OUT">出金 (OUT)</option>
                <option value="IN">入金 (IN)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 社員 */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">社員</label>
              <select
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">選択してください...</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 案件 */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">案件 (任意)</label>
              <select
                name="projectId"
                value={formData.projectId}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">社内・共通（物件指定なし）</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 分類 / 交通機関等 */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">分類 (交通機関等)</label>
              <input
                type="text"
                name="categoryType"
                value={formData.categoryType}
                onChange={handleChange}
                placeholder="高速、地下鉄 等"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* 金額 */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">金額 (円)</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                placeholder="¥ 0"
                className="w-full border rounded-lg px-3 py-2 text-sm font-bold text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* 摘要 */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">摘要</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              placeholder="支払い内容や用途を入力"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 勘定科目 */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">勘定科目</label>
              <select
                name="accountSubject"
                value={formData.accountSubject}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {accountSubjects.length === 0 ? (
                  <>
                    <option value="旅費交通費">旅費交通費</option>
                    <option value="車両費">車両費</option>
                    <option value="消耗品費">消耗品費</option>
                    <option value="雑費">雑費</option>
                  </>
                ) : (
                  accountSubjects.map(s => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 税区分 */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">税区分</label>
              <select
                name="taxCategory"
                value={formData.taxCategory}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="仕入10％">仕入10％</option>
                <option value="仕入8％（軽）">仕入8％（軽）</option>
                <option value="対象外">対象外</option>
                <option value="非課税">非課税</option>
              </select>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t flex items-center justify-between">
            {/* 削除ボタン / 確認エリア */}
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={deleting || saving}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={15} />
                この明細を削除
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-red-50 border border-red-300 px-3 py-1.5 rounded-lg animate-in fade-in duration-150">
                <span className="text-xs font-bold text-red-700">削除しますか？</span>
                <button
                  type="button"
                  onClick={executeDelete}
                  disabled={deleting}
                  className="px-2.5 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {deleting ? '削除中...' : '削除を確定'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                >
                  取消
                </button>
              </div>
            )}

            {/* キャンセル & 保存 */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving || deleting}
                className="px-4 py-2 border text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-medium transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={saving || deleting}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save size={15} />
                {saving ? '保存中...' : '変更を保存'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
