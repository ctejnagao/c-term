"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface BankAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isModalOpen: boolean;
  pendingUrl: string | null;
  openLoginModal: (targetUrl?: string) => void;
  closeLoginModal: () => void;
  login: (password: string) => Promise<{ success: boolean; message?: string }>;
  checkAuth: () => Promise<boolean>;
}

const BankAuthContext = createContext<BankAuthContextType | undefined>(undefined);

export function BankAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      // sessionStorageをチェック（同一ブラウザセッション内なら高速判定）
      if (typeof window !== "undefined" && sessionStorage.getItem("ctej_bank_session") === "authorized") {
        setIsAuthenticated(true);
        setIsLoading(false);
        return true;
      }

      const res = await fetch("/api/auth/bank", { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        const authed = !!data.authenticated;
        setIsAuthenticated(authed);
        if (authed && typeof window !== "undefined") {
          sessionStorage.setItem("ctej_bank_session", "authorized");
        }
        return authed;
      }
      setIsAuthenticated(false);
      return false;
    } catch {
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch("/api/auth/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.authenticated) {
        setIsAuthenticated(true);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("ctej_bank_session", "authorized");
        }
        setIsModalOpen(false);

        if (pendingUrl) {
          const url = pendingUrl;
          setPendingUrl(null);
          router.push(url);
        }
        return { success: true };
      } else {
        return { success: false, message: data.message || "パスワードが正しくありません" };
      }
    } catch {
      return { success: false, message: "通信エラーが発生しました" };
    }
  };

  const openLoginModal = (targetUrl?: string) => {
    if (targetUrl) setPendingUrl(targetUrl);
    setIsModalOpen(true);
  };

  const closeLoginModal = () => {
    setPendingUrl(null);
    setIsModalOpen(false);
  };

  return (
    <BankAuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        isModalOpen,
        pendingUrl,
        openLoginModal,
        closeLoginModal,
        login,
        checkAuth,
      }}
    >
      {children}
    </BankAuthContext.Provider>
  );
}

export function useBankAuth() {
  const context = useContext(BankAuthContext);
  if (!context) {
    throw new Error("useBankAuth must be used within a BankAuthProvider");
  }
  return context;
}
