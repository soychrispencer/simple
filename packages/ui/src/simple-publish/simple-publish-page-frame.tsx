'use client';

import type { ReactNode } from 'react';

export type SimplePublishPageFrameProps = {
    children: ReactNode;
    preview: ReactNode;
};

/** Layout de dos columnas: formulario + vista previa sticky (desktop). */
export function SimplePublishPageFrame({ children, preview }: SimplePublishPageFrameProps) {
    return (
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_272px] xl:gap-8">
            <div className="min-w-0 space-y-5">{children}</div>
            <aside className="xl:sticky xl:top-[7.25rem] xl:self-start">
                <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-(--fg-muted)">
                    Vista previa
                </p>
                {/* En móvil, aspect 3:4 a ancho completo no cabe en viewport; acotar al ancho desktop / alto disponible. */}
                <div className="mx-auto w-full max-w-[min(100%,17rem,calc((100dvh-15rem)*0.75))] xl:max-w-none">
                    {preview}
                </div>
            </aside>
        </div>
    );
}
