'use client';

import type { ReactNode } from 'react';

type PanelSheetProps = {
    children: ReactNode;
    onClose: () => void;
    ariaLabel: string;
    maxWidthClass?: string;
};

export function PanelSheet({
    children,
    onClose,
    ariaLabel,
    maxWidthClass = 'sm:max-w-3xl',
}: PanelSheetProps) {
    return (
        <div
            className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4"
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
                className={`panel-sheet-panel relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl ${maxWidthClass} sm:rounded-3xl`}
            >
                {children}
            </div>
        </div>
    );
}
