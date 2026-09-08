"use client";

import React, { useState } from "react";
import { ShieldAlert, KeyRound, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { usePayableAuth } from "@/context/PayableAuthContext";

interface PayableGateProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export default function PayableGate({ children, pageTitle = "買掛・外注管理" }: PayableGateProps) {
  const { isAuthenticated, isLoading, login } = usePayableAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium">セキュリティ確認中...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const handleUnlock = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password.trim()) {
        setError("パスワードを入力してください");
        return;
      }
      setSubmitting(true);
      setError(null);
      const res = await login(password);
      setSubmitting(false);
      if (!res.success) {
        setError(res.message || "パスワードが正しくありません");
      }
    };

    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-8 text-white text-center relative">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center mb-4 text-indigo-300 shadow-inner">
              <ShieldAlert className="w-8 h-8 text-indigo-300" />
            </div>
            <h2 className="text-xl font-bold">{pageTitle}（保護中）</h2>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              この画面は社内機密・買掛情報を含むためアクセス制限されています。<br />
              閲覧するにはパスワードを入力してください。
            </p>
          </div>

          <form onSubmit={handleUnlock} className="p-8 space-y-5">
            {error && (
              <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                認証パスワード
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
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 rounded-lg shadow-md hover:shadow transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  認証中...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  ロックを解除して表示
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
