'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { IconCheck, IconX, IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import { joinClasses } from '../shared/join-classes';

type ToastTone = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: number;
    message: string;
    tone: ToastTone;
}

interface ToastContextValue {
    toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timeoutRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

    const remove = useCallback((id: number) => {
        const timer = timeoutRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timeoutRef.current.delete(id);
        }
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = useCallback((message: string, tone: ToastTone = 'info') => {
        const id = ++toastId;
        setToasts((prev) => [...prev, { id, message, tone }]);
        const timer = setTimeout(() => remove(id), 4000);
        timeoutRef.current.set(id, timer);
    }, [remove]);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm" role="status" aria-live="polite">
                {toasts.map((t) => (
                    <ToastItem key={t.id} toast={t} onDismiss={() => remove(t.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const toneConfig = {
        success: { icon: IconCheck, bg: 'var(--color-success-bg)', border: 'var(--color-success-border)', color: 'var(--color-success-text)' },
        error: { icon: IconX, bg: 'var(--color-error-bg)', border: 'var(--color-error-border)', color: 'var(--color-error-text)' },
        warning: { icon: IconAlertCircle, bg: 'var(--color-warning-bg)', border: 'var(--color-warning-border)', color: 'var(--color-warning-text)' },
        info: { icon: IconInfoCircle, bg: 'var(--color-info-bg)', border: 'var(--color-info-border)', color: 'var(--color-info-text)' },
    };
    const config = toneConfig[t.tone];
    const Icon = config.icon;

    return (
        <div
            className={joinClasses(
                'flex items-center gap-2.5 rounded-card border px-4 py-3 text-sm shadow-lg animate-slide-up',
            )}
            style={{ background: config.bg, borderColor: config.border, color: config.color }}
        >
            <Icon size={16} className="shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button
                type="button"
                onClick={onDismiss}
                className="shrink-0 rounded-full p-0.5 opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Cerrar"
            >
                <IconX size={14} />
            </button>
        </div>
    );
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
