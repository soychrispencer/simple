"use client";
import React, { createContext, useContext, useMemo, useState } from "react";

type Toast = { id: string; message: React.ReactNode; type?: "success" | "error" | "info"; duration?: number };

type ToastContextType = {
  addToast: (message: React.ReactNode, opts?: { type?: Toast["type"]; duration?: number }) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: React.ReactNode, opts?: { type?: Toast["type"]; duration?: number }) => {
    const id = crypto.randomUUID();
    const toast: Toast = { id, message, type: opts?.type || "info", duration: opts?.duration ?? 2800 };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, toast.duration);
  };

  const value = useMemo(() => ({ addToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div className="pointer-events-none fixed top-4 right-4 z-[60] flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-lg shadow-popover px-4 py-2 text-sm text-white ${
                t.type === "success" ? "bg-green-600" : t.type === "error" ? "bg-red-600" : "bg-gray-800"
              }`}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
