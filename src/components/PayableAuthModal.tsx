"use client";

import React, { useState } from "react";
import { Lock, KeyRound, X, AlertCircle, Eye, EyeOff } from "lucide-react";
import { usePayableAuth } from "@/context/PayableAuthContext";

interface PayableAuthModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  title?: string;
  description?: string;
}

export default function PayableAuthModal({
  isOpen,
  onClose,
  onSuccess,
  title = "買掛・外注管理の保護エリア",
  description = "機密情報保護のため、閲覧・操作には認証パスワードが必要です。",
}: PayableAuthModalProps) {
  const { loginModalOpen, closeLoginModal, login } = usePayableAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 引数で制御される場合とContextで制御される場合の両方に対応
  const show = isOpen !== undefined ? isOpen : loginModalOpen;
  const handleClose = () => {
    setError(null);
    setPassword("");
    if (onClose) onClose();
    else closeLoginModal();
  };

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("パスワードを入力してください");
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await login(password);
    setSubmitting(false);

    if (result.success) {
      setPassword("");
      if (onSuccess) onSuccess();
      handleClose();
    } else {
      setError(result.message || "パスワードが一致しません");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー装飾 */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white text-center relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center mb-3 text-indigo-300 shadow-inner">
            <Lock className="w-7 h-7 text-indigo-200" />
          </div>
          <h3 className="text-xl font-bold tracking-wide">{title}</h3>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed px-4">
            {description}
          </p>
        </div>

        {/* フォーム部分 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              アクセスパスワード
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                autoFocus
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              ※ 初期パスワード: ctej8077
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 rounded-lg shadow-md hover:shadow transition-all flex items-center gap-2"
            >
              {submitting ? "認証中..." : "ロック解除"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
