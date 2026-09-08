"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface PayableAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  loginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  login: (password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

const PayableAuthContext = createContext<PayableAuthContextType | undefined>(undefined);

export function PayableAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);

  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/payable", { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(!!data.authenticated);
        return !!data.authenticated;
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
      const res = await fetch("/api/auth/payable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.authenticated) {
        setIsAuthenticated(true);
        setLoginModalOpen(false);
        return { success: true };
      } else {
        return { success: false, message: data.message || "パスワードが正しくありません" };
      }
    } catch {
      return { success: false, message: "通信エラーが発生しました" };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/payable", { method: "DELETE" });
      setIsAuthenticated(false);
    } catch (error) {
      console.error("ログアウト処理に失敗しました", error);
      setIsAuthenticated(false);
    }
  };

  const openLoginModal = () => setLoginModalOpen(true);
  const closeLoginModal = () => setLoginModalOpen(false);

  return (
    <PayableAuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        loginModalOpen,
        openLoginModal,
        closeLoginModal,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </PayableAuthContext.Provider>
  );
}

export function usePayableAuth() {
  const context = useContext(PayableAuthContext);
  if (!context) {
    throw new Error("usePayableAuth must be used within a PayableAuthProvider");
  }
  return context;
}
