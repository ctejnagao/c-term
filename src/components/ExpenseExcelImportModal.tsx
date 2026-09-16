'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle2, FileSpreadsheet, Trash2, ArrowRight } from 'lucide-react';

export interface ParsedItem {
  tempId: string;
  date: string;
  day: number;
  projectName: string;
  matchedProjectId: number | null;
  matchedProjectName: string | null;
  transportType: string;
  description: string;
  amount: number;
  accountName: string;
  accountCode: string;
  accountSubjectId: number | null;
  taxType: string;
}

export interface ParseResult {
  summary: {
    employeeName: string;
    matchedEmployeeId: number | null;
    matchedEmployeeName: string | null;
    targetYearMonth: string;
    totalAmount: number;
    itemCount: number;
  };
  items: ParsedItem[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: ParseResult | null;
  employees: { id: number; name: string }[];
  projects: { id: number; projectCode?: string; name: string }[];
  accountSubjects: { id: number; name: string }[];
  onSuccess: (importedCount: number, targetMonth: string) => void;
}

export default function ExpenseExcelImportModal({
  isOpen,
  onClose,
  data,
  employees,
  projects,
  accountSubjects,
  onSuccess,
}: Props) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [targetYearMonth, setTargetYearMonth] = useState<string>('');
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (data) {
      setSelectedEmployeeId(data.summary.matchedEmployeeId ? String(data.summary.matchedEmployeeId) : '');
      setTargetYearMonth(data.summary.targetYearMonth || '');
      setItems(data.items.map(item => ({ ...item })));
      setErrorMessage('');
    }
  }, [data]);

  if (!isOpen || !data) return null;

  const handleItemChange = (tempId: string, field: keyof ParsedItem, value: any) => {
    setItems(prev =>
      prev.map(item => {
        if (item.tempId !== tempId) return item;

        if (field === 'matchedProjectId') {
          const numVal = value ? Number(value) : null;
          const foundProj = projects.find(p => p.id === numVal);
          return {
            ...item,
            matchedProjectId: numVal,
            matchedProjectName: foundProj ? foundProj.name : null,
          };
        }

        if (field === 'accountName') {
          const foundSubj = accountSubjects.find(s => s.name === value);
          return {
            ...item,
            accountName: value,
            accountSubjectId: foundSubj ? foundSubj.id : item.accountSubjectId,
          };
        }

        return {
          ...item,
          [field]: field === 'amount' ? Number(value) || 0 : value,
        };
      })
    );
  };

  const handleRemoveItem = (tempId: string) => {
    setItems(prev => prev.filter(i => i.tempId !== tempId));
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const unmatchedProjectsCount = items.filter(i => !i.matchedProjectId).length;

  const handleSubmit = async () => {
    if (!selectedEmployeeId) {
      setErrorMessage('社員（申請者）を選択してください。');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('登録対象の明細がありません。');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        transactions: items.map(item => ({
          transactionDate: item.date,
          type: 'OUT',
          employeeId: Number(selectedEmployeeId),
          projectId: item.matchedProjectId || null,
          categoryType: item.transportType || null,
          description: item.description || '',
          amount: item.amount,
          accountSubject: item.accountName || '旅費交通費',
          accountSubjectId: item.accountSubjectId || null,
          taxCategory: item.taxType || '仕入10％',
        })),
      };

      const res = await fetch('/api/cash-transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '登録処理に失敗しました。');
      }

      onSuccess(items.length, targetYearMonth);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || '一括登録中にエラーが発生しました。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">交通費等請求明細書 取込プレビュー</h3>
              <p className="text-xs text-gray-500">
                Excelから抽出したデータを照合・確認し、小口現金の出金データとして一括登録します
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Top Summary Bar */}
        <div className="p-6 bg-white border-b space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Employee Selection */}
            <div className="p-3.5 rounded-xl border bg-slate-50 border-slate-200">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                申請者（Excel記載: <span className="text-gray-900 font-bold">{data.summary.employeeName || '未記載'}</span>）
              </label>
              <select
                value={selectedEmployeeId}
                onChange={e => setSelectedEmployeeId(e.target.value)}
                className="w-full border bg-white rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">-- 社員を選択 --</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              <div className="mt-1.5 flex items-center gap-1 text-[11px]">
                {selectedEmployeeId ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 size={12} /> マスタ照合済
                  </span>
                ) : (
                  <span className="text-amber-700 font-medium flex items-center gap-1">
                    <AlertTriangle size={12} /> 社員を選択してください
                  </span>
                )}
              </div>
            </div>

            {/* Target Year Month */}
            <div className="p-3.5 rounded-xl border bg-slate-50 border-slate-200">
              <label className="block text-xs font-semibold text-gray-600 mb-1">対象年月</label>
              <div className="text-lg font-bold text-gray-800 pt-0.5">
                {targetYearMonth || '未設定'}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">※登録完了後に対象月の台帳を表示します</p>
            </div>

            {/* Item Count */}
            <div className="p-3.5 rounded-xl border bg-slate-50 border-slate-200">
              <label className="block text-xs font-semibold text-gray-600 mb-1">明細件数</label>
              <div className="text-lg font-bold text-gray-800 pt-0.5">
                {items.length} <span className="text-sm font-normal text-gray-600">件</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">不要な行は行末のゴミ箱で除外可能</p>
            </div>

            {/* Total Amount */}
            <div className="p-3.5 rounded-xl border bg-emerald-50/70 border-emerald-200">
              <label className="block text-xs font-semibold text-emerald-800 mb-1">出金精算 合計金額</label>
              <div className="text-xl font-extrabold text-emerald-700 pt-0.5">
                ¥ {totalAmount.toLocaleString()}
              </div>
              <p className="text-[11px] text-emerald-600 mt-1">
                Excel記載合計: ¥ {data.summary.totalAmount.toLocaleString()}
                {totalAmount === data.summary.totalAmount ? ' (一致)' : ' (差異あり)'}
              </p>
            </div>

          </div>

          {/* Alert for unmatched projects */}
          {unmatchedProjectsCount > 0 && (
            <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">未登録物件が {unmatchedProjectsCount} 件あります：</span>
                プロジェクトマスタに該当がない物件は「未登録物件」として表示されています。既存案件に手動紐付けするか、「物件指定なし（一般管理費）」のままでも登録できます。
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Item Table */}
        <div className="flex-1 overflow-auto p-6">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-gray-50 text-gray-700 sticky top-0 uppercase text-[11px] border-b">
              <tr>
                <th className="px-3 py-2.5 whitespace-nowrap">日付</th>
                <th className="px-3 py-2.5 min-w-[220px]">物件名 / プロジェクト紐付け</th>
                <th className="px-3 py-2.5 whitespace-nowrap">交通機関等</th>
                <th className="px-3 py-2.5 min-w-[180px]">摘要</th>
                <th className="px-3 py-2.5 min-w-[130px]">勘定科目</th>
                <th className="px-3 py-2.5 whitespace-nowrap">税区分</th>
                <th className="px-3 py-2.5 text-right whitespace-nowrap">金額</th>
                <th className="px-2 py-2.5 text-center whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, idx) => {
                const isUnmatched = !item.matchedProjectId;
                return (
                  <tr key={item.tempId} className="hover:bg-gray-50/70 transition-colors">
                    {/* Date */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <input
                        type="date"
                        value={item.date}
                        onChange={e => handleItemChange(item.tempId, 'date', e.target.value)}
                        className="border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                    </td>

                    {/* Project mapping */}
                    <td className="px-3 py-2.5">
                      <div className="space-y-1">
                        <div className="text-[11px] text-gray-500 truncate" title={item.projectName}>
                          元: {item.projectName || '(空欄)'}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={item.matchedProjectId || ''}
                            onChange={e => handleItemChange(item.tempId, 'matchedProjectId', e.target.value)}
                            className={`w-full border rounded px-2 py-1 text-xs font-medium outline-none ${
                              isUnmatched
                                ? 'border-amber-300 bg-amber-50/50 text-amber-900 focus:border-amber-500'
                                : 'border-gray-200 bg-white text-gray-800 focus:border-emerald-500'
                            }`}
                          >
                            <option value="">-- 物件指定なし (一般管理費) --</option>
                            {projects.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          {isUnmatched ? (
                            <span className="inline-block text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                              未登録物件
                            </span>
                          ) : (
                            <span className="inline-block text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                              マスタ照合済
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Transport Type */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <input
                        type="text"
                        value={item.transportType}
                        onChange={e => handleItemChange(item.tempId, 'transportType', e.target.value)}
                        className="w-20 border border-gray-200 rounded px-2 py-1 text-xs bg-white outline-none focus:border-emerald-500"
                        placeholder="高速 等"
                      />
                    </td>

                    {/* Description */}
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => handleItemChange(item.tempId, 'description', e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-xs bg-white outline-none focus:border-emerald-500"
                        placeholder="摘要を入力"
                      />
                    </td>

                    {/* Account Subject */}
                    <td className="px-3 py-2.5">
                      <select
                        value={item.accountName}
                        onChange={e => handleItemChange(item.tempId, 'accountName', e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-xs bg-white outline-none focus:border-emerald-500"
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
                    </td>

                    {/* Tax Type */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-block text-[11px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                        {item.taxType || '仕入10％'}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-gray-400 text-xs">¥</span>
                        <input
                          type="number"
                          value={item.amount}
                          onChange={e => handleItemChange(item.tempId, 'amount', e.target.value)}
                          className="w-24 text-right font-bold border border-gray-200 rounded px-2 py-1 text-xs bg-white outline-none focus:border-emerald-500"
                        />
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-2 py-2.5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveItem(item.tempId);
                        }}
                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                        title="この行を削除"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            全 <span className="font-bold text-gray-700">{items.length}</span> 件の明細 | 合計金額:{' '}
            <span className="font-bold text-emerald-700 text-sm">¥ {totalAmount.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-medium text-xs transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || items.length === 0}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md hover:shadow transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? '一括登録中...' : `${items.length}件を出金データとして一括登録`}
              {!submitting && <ArrowRight size={15} />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
