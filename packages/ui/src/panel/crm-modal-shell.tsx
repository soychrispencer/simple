'use client';

import { useEffect, type ReactNode } from 'react';

export type CrmModalShellProps = {
    open: boolean;
    onClose: () => void;
    overlayLabel?: string;
    children: ReactNode;
    maxWidthClass?: string;
    zClass?: string;
};

/** Overlay + panel CRM (rounded-card, scroll). Sin lógica de negocio. */
export function CrmModalShell({
    open,
    onClose,
    overlayLabel = 'Cerrar',
    children,
    maxWidthClass = 'max-w-[1040px]',
    zClass = 'z-80',
}: CrmModalShellProps) {
    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className={`fixed inset-0 ${zClass} flex items-center justify-center px-4 py-5`}>
            <button
                type="button"
                aria-label={overlayLabel}
                onClick={onClose}
                className="absolute inset-0 bg-[color-mix(in_oklab,var(--fg)_44%,transparent)] backdrop-blur-sm"
            />
            <div
                className={`relative z-1 w-full ${maxWidthClass} max-h-[calc(100vh-2.5rem)] overflow-hidden rounded-card border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xl)]`}
            >
                <div className="max-h-[calc(100vh-2.5rem)] overflow-y-auto p-5 sm:p-6">{children}</div>
            </div>
        </div>
    );
}
