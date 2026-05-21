'use client';

import { useEffect, type ReactNode } from 'react';

type PanelSheetProps = {
    children: ReactNode;
    onClose: () => void;
    ariaLabel: string;
    maxWidthClass?: string;
    /** En escritorio el panel no hace scroll interno; en móvil sí si el contenido es alto. */
    scrollOnMobileOnly?: boolean;
    /** Formularios largos: altura máx. viewport y scroll en el hijo (flex column). */
    constrainHeight?: boolean;
};

export function PanelSheet({
    children,
    onClose,
    ariaLabel,
    maxWidthClass = 'sm:max-w-3xl',
    scrollOnMobileOnly = true,
    constrainHeight = false,
}: PanelSheetProps) {
    useEffect(() => {
        if (!constrainHeight) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previous;
        };
    }, [constrainHeight]);

    const panelScrollClass = constrainHeight
        ? 'flex w-full min-h-0 max-h-[min(92dvh,calc(100dvh-0.5rem))] flex-col overflow-hidden sm:max-h-[min(90dvh,calc(100dvh-2rem))]'
        : scrollOnMobileOnly
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
                {constrainHeight ? (
                    <div className="flex min-h-0 flex-1 flex-col">{children}</div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
}
