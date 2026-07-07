'use client';

import { PanelScrollShell, type PanelScrollModalSize } from '@simple/ui/panel';

type PanelSheetProps = {
    children: React.ReactNode;
    onClose: () => void;
    ariaLabel: string;
    maxWidthClass?: string;
    /** @deprecated Siempre usa layout restringido con scroll interno. */
    scrollOnMobileOnly?: boolean;
    /** Formularios largos: el hijo define header, scroll y footer. */
    constrainHeight?: boolean;
};

function resolveSize(maxWidthClass: string): PanelScrollModalSize {
    if (maxWidthClass.includes('max-w-sm')) return 'sm';
    if (maxWidthClass.includes('max-w-md')) return 'md';
    if (maxWidthClass.includes('max-w-lg')) return 'lg';
    if (maxWidthClass.includes('max-w-3xl')) return '3xl';
    if (maxWidthClass.includes('max-w-4xl')) return '5xl';
    if (maxWidthClass.includes('max-w-2xl')) return '2xl';
    return '2xl';
}

export function PanelSheet({
    children,
    onClose,
    ariaLabel,
    maxWidthClass = 'sm:max-w-3xl',
    constrainHeight = true,
}: PanelSheetProps) {
    return (
        <PanelScrollShell
            ariaLabel={ariaLabel}
            onClose={onClose}
            size={resolveSize(maxWidthClass)}
            zIndexClass="z-[90]"
            constrainContent={constrainHeight}
            overlayClassName="panel-sheet-scrim cursor-default"
            panelClassName="panel-sheet-panel rounded-t-3xl sm:rounded-3xl"
        >
            {children}
        </PanelScrollShell>
    );
}
