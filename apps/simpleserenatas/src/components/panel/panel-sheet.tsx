'use client';

import { PanelScrollShell, type PanelScrollModalHeight, type PanelScrollModalSize } from '@simple/ui/panel';

type PanelSheetProps = {
    children: React.ReactNode;
    onClose: () => void;
    ariaLabel: string;
    maxWidthClass?: string;
    size?: PanelScrollModalSize;
    height?: PanelScrollModalHeight;
    /** @deprecated Siempre usa layout restringido con scroll interno. */
    scrollOnMobileOnly?: boolean;
    /** Formularios largos: el hijo define header, scroll y footer. */
    constrainHeight?: boolean;
};

const SIZE_PATTERNS: Array<{ pattern: string; size: PanelScrollModalSize }> = [
    { pattern: 'max-w-6xl', size: '6xl' },
    { pattern: 'max-w-5xl', size: '5xl' },
    { pattern: 'max-w-4xl', size: '5xl' },
    { pattern: 'max-w-3xl', size: '3xl' },
    { pattern: 'max-w-2xl', size: '2xl' },
    { pattern: 'max-w-xl', size: 'xl' },
    { pattern: 'max-w-lg', size: 'lg' },
    { pattern: 'max-w-md', size: 'md' },
    { pattern: 'max-w-sm', size: 'sm' },
];

/** Toma el ancho máximo declarado (p. ej. `sm:max-w-lg lg:max-w-5xl` → `5xl`). */
function resolveSize(maxWidthClass: string): PanelScrollModalSize {
    for (const { pattern, size } of SIZE_PATTERNS) {
        if (maxWidthClass.includes(pattern)) return size;
    }
    return '2xl';
}

export function PanelSheet({
    children,
    onClose,
    ariaLabel,
    maxWidthClass = 'sm:max-w-3xl',
    size,
    height = 'default',
    constrainHeight = true,
}: PanelSheetProps) {
    return (
        <PanelScrollShell
            ariaLabel={ariaLabel}
            onClose={onClose}
            size={size ?? resolveSize(maxWidthClass)}
            height={height}
            zIndexClass="z-[90]"
            constrainContent={constrainHeight}
            overlayClassName="panel-sheet-scrim cursor-default"
            panelClassName="panel-sheet-panel rounded-t-3xl sm:rounded-3xl"
        >
            {children}
        </PanelScrollShell>
    );
}
