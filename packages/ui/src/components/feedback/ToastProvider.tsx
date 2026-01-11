"use client";
import React, { createContext, useContext, useMemo, useState, useCallback } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export type Toast = {
  id: string;
  message: React.ReactNode;
  type: ToastType;
  duration: number;
};

export type ToastOptions = {
  type?: ToastType;
  duration?: number;
};

type ToastContextType = {
  addToast: (message: React.ReactNode, opts?: ToastOptions) => void;
  success: (message: React.ReactNode, duration?: number) => void;
  error: (message: React.ReactNode, duration?: number) => void;
  info: (message: React.ReactNode, duration?: number) => void;
  warning: (message: React.ReactNode, duration?: number) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);
const noop = () => {};
const noopContext: ToastContextType = {
  addToast: noop,
  success: noop,
  error: noop,
  info: noop,
  warning: noop,
};

/**
 * Hook para usar el sistema de toasts
 * Debe ser usado dentro de un ToastProvider
 * 
 * @example
 * const toast = useToast();
 * toast.success("¡Guardado exitosamente!");
 * toast.error("Error al guardar");
 * toast.info("Información importante");
 * toast.warning("¡Cuidado!");
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ToastProvider] useToast() usado fuera de un ToastProvider; retornando no-ops");
    }
    return noopContext;
  }
  return ctx;
}

export interface ToastProviderProps {
  children: React.ReactNode;
  /** Posición de los toasts en la pantalla */
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
  /** Duración por defecto de los toasts en ms */
  defaultDuration?: number;
}

/**
 * Proveedor del sistema de toasts/notificaciones
 * Renderiza las notificaciones en la posición especificada
 * 
 * @example
 * <ToastProvider position="top-right">
 *   <App />
 * </ToastProvider>
 */
export function ToastProvider({ 
  children, 
  position = "top-right",
  defaultDuration = 3000 
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: React.ReactNode, opts?: ToastOptions) => {
    const id = crypto.randomUUID();
    const toast: Toast = { 
      id, 
      message, 
      type: opts?.type || "info", 
      duration: opts?.duration ?? defaultDuration 
    };
    setToasts((prev) => [...prev, toast]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, toast.duration);
  }, [defaultDuration]);

  const success = useCallback((message: React.ReactNode, duration?: number) => {
    addToast(message, { type: "success", duration });
  }, [addToast]);

  const error = useCallback((message: React.ReactNode, duration?: number) => {
    addToast(message, { type: "error", duration });
  }, [addToast]);

  const info = useCallback((message: React.ReactNode, duration?: number) => {
    addToast(message, { type: "info", duration });
  }, [addToast]);

  const warning = useCallback((message: React.ReactNode, duration?: number) => {
    addToast(message, { type: "warning", duration });
  }, [addToast]);

  const value = useMemo(
    () => ({ addToast, success, error, info, warning }), 
    [addToast, success, error, info, warning]
  );

  // Mapeo de posiciones a clases de Tailwind
  const positionClasses = {
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-center": "top-4 left-1/2 -translate-x-1/2",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  };

  // Mapeo de tipos a colores
  const getToastColor = (type: ToastType) => {
    switch (type) {
      case "success":
        return "bg-[var(--color-success)] text-[var(--color-on-primary)]";
      case "error":
        return "bg-[var(--color-danger)] text-[var(--color-on-primary)]";
      case "warning":
        return "bg-[var(--color-warn)] text-[var(--color-on-primary)]";
      case "info":
      default:
        return "bg-[var(--surface-2)] text-[var(--text-primary)]";
    }
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div 
          className={`pointer-events-none fixed z-[9999] flex flex-col gap-2 ${positionClasses[position]}`}
          role="region"
          aria-live="polite"
          aria-label="Notificaciones"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`
                pointer-events-auto rounded-lg shadow-popover px-4 py-3 text-sm
                ${getToastColor(t.type)}
                animate-fade-in
                transition-all duration-300
              `}
              role="alert"
            >
              <div className="flex items-center gap-2">
                {t.type === "success" && (
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {t.type === "error" && (
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                {t.type === "warning" && (
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                {t.type === "info" && (
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="flex-1">{t.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
