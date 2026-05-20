'use client';

import { useEffect } from 'react';
import { IconAlertTriangle } from '@tabler/icons-react';
import { joinClasses } from '../shared/join-classes';
import { PanelButton } from './panel-button';

export type PanelConfirmDialogProps = {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'danger' | 'default';
    busy?: boolean;
    onConfirm: () => void;
    onClose: () => void;
};

export function PanelConfirmDialog({
    open,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    tone = 'default',
    busy = false,
    onConfirm,
    onClose,
}: PanelConfirmDialogProps) {
    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !busy) onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, busy, onClose]);

    if (!open) return null;

    const iconWrapClass =
        tone === 'danger'
            ? 'bg-[color-mix(in_oklab,var(--color-error)_12%,transparent)] text-[var(--color-error)]'
            : 'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent)]';

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="panel-confirm-title"
            aria-describedby="panel-confirm-message"
        >
            <button
                type="button"
                aria-label="Cerrar"
                disabled={busy}
                className="absolute inset-0 cursor-default bg-[color-mix(in_srgb,var(--bg)_55%,transparent)] backdrop-blur-[4px] dark:bg-[color-mix(in_srgb,var(--bg)_38%,transparent)]"
                onClick={onClose}
            />
            <div
                className={joinClasses(
                    'relative w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-md)] sm:rounded-3xl',
                )}
            >
                <div className="mb-5 flex items-start gap-3">
                    <div
                        className={joinClasses(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                            iconWrapClass,
                        )}
                        aria-hidden
                    >
                        <IconAlertTriangle size={20} stroke={1.75} />
                    </div>
                    <div className="min-w-0">
                        <h2 id="panel-confirm-title" className="text-base font-semibold text-[var(--fg)]">
                            {title}
                        </h2>
                        <p id="panel-confirm-message" className="mt-1.5 text-sm leading-snug text-[var(--fg-muted)]">
                            {message}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <PanelButton variant="secondary" size="sm" disabled={busy} onClick={onClose}>
                        {cancelLabel}
                    </PanelButton>
                    <PanelButton
                        variant={tone === 'danger' ? 'danger' : 'primary'}
                        size="sm"
                        disabled={busy}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </PanelButton>
                </div>
            </div>
        </div>
    );
}
