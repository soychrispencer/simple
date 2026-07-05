'use client';

import type { ReactNode } from 'react';

export type SimplePublishPreviewColumnProps = {
    label?: string;
    children: ReactNode;
};

/** Columna de vista previa sticky en desktop; oculta en móvil. */
export function SimplePublishPreviewColumn({
    label = 'Vista previa',
    children,
}: SimplePublishPreviewColumnProps) {
    return (
        <div className="hidden xl:block xl:sticky xl:top-24 xl:self-start">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-(--fg-muted)">{label}</p>
            {children}
        </div>
    );
}
