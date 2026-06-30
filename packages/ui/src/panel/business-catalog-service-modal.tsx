'use client';

import type { ReactNode } from 'react';
import { IconX } from '@tabler/icons-react';
import { PanelIconButton } from './panel-display.js';

export type BusinessCatalogServiceModalProps = {
    open: boolean;
    title: string;
    description?: string;
    onClose: () => void;
    children: ReactNode;
    actions?: ReactNode;
};

/** Modal único del constructor de servicios (todas las verticales). */
export function BusinessCatalogServiceModal({
    open,
    title,
    description,
    onClose,
    children,
    actions,
}: BusinessCatalogServiceModalProps) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="flex max-h-[min(90vh,52rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="catalog-service-modal-title"
            >
                <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5 sm:py-4">
                    <div className="min-w-0">
                        <h3 id="catalog-service-modal-title" className="text-base font-semibold text-fg">{title}</h3>
                        {description ? <p className="mt-1 text-sm text-fg-muted">{description}</p> : null}
                    </div>
                    <PanelIconButton label="Cerrar" onClick={onClose}>
                        <IconX size={16} />
                    </PanelIconButton>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                    <div className="grid gap-4 md:grid-cols-2">{children}</div>
                </div>

                {actions ? (
                    <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3 sm:px-5 sm:py-4">
                        {actions}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
