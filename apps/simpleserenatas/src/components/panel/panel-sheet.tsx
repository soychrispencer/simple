'use client';

import type { ReactNode } from 'react';

type PanelSheetProps = {
    children: ReactNode;
    onClose: () => void;
    ariaLabel: string;
    maxWidthClass?: string;
    /** En escritorio el panel no hace scroll interno; en móvil sí si el contenido es alto. */
    scrollOnMobileOnly?: boolean;
};

export function PanelSheet({
    children,
    onClose,
    ariaLabel,
    maxWidthClass = 'sm:max-w-3xl',
    scrollOnMobileOnly = true,
}: PanelSheetProps) {
    const panelScrollClass = scrollOnMobileOnly
        ? 'max-h-[92vh] overflow-y-auto sm:max-h-none sm:overflow-visible'
        : 'max-h-[92vh] overflow-y-auto';

    return (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
        >
            <button
                type="button"
                aria-label="Cerrar"
                className="panel-sheet-scrim absolute inset-0 cursor-default"
                onClick={onClose}
            />
            <div
                className={`panel-sheet-panel relative w-full rounded-t-3xl ${maxWidthClass} sm:rounded-3xl ${panelScrollClass}`}
            >
                {children}
            </div>
        </div>
    );
}
