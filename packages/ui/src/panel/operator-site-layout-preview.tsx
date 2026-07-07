'use client';

import type { ReactElement } from 'react';
import type { OperatorSiteLayout } from '@simple/utils';

const PREVIEW_CLASS =
    'mb-3 h-28 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] overflow-hidden p-2';

const LINE = 'rounded-full bg-[var(--border-strong)]';
const LINE_MUTED = 'rounded-full bg-[var(--border)]';
const SURFACE = 'rounded-md border border-[var(--border)] bg-[var(--surface)]';
const ACCENT = 'rounded-sm bg-[var(--accent)]';

const PREVIEW_LABELS: Record<OperatorSiteLayout, string> = {
    booking: 'Vista previa: texto y reserva arriba, servicios abajo',
    portfolio: 'Vista previa: portada grande y servicios en carrusel',
    studio: 'Vista previa: encabezado compacto y bloques de información',
};

function BookingLayoutPreview() {
    return (
        <div className={`${PREVIEW_CLASS} flex flex-col gap-1.5`}>
            <div className="flex min-h-0 flex-1 gap-1.5">
                <div className="flex flex-1 flex-col justify-center gap-1 px-0.5">
                    <div className={`h-1.5 w-[78%] ${LINE}`} />
                    <div className={`h-1 w-[52%] ${LINE_MUTED}`} />
                    <div className={`mt-1 h-2 w-10 ${ACCENT} opacity-90`} />
                </div>
                <div className={`flex w-[40%] flex-col gap-1 p-1.5 ${SURFACE}`}>
                    <div className={`h-1 w-[70%] ${LINE}`} />
                    <div className="min-h-0 flex-1 rounded-sm bg-[var(--accent-subtle)]" />
                    <div className={`h-2 w-full ${ACCENT} opacity-90`} />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-1">
                {[0, 1, 2].map((key) => (
                    <div key={key} className={`h-5 ${SURFACE}`}>
                        <div className={`m-1 h-1 w-[55%] ${LINE_MUTED}`} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function PortfolioLayoutPreview() {
    return (
        <div className={`${PREVIEW_CLASS} flex flex-col gap-1.5`}>
            <div className="relative h-[48%] overflow-hidden rounded-md bg-[var(--border)]">
                <div className="absolute inset-x-0 bottom-0 space-y-1 p-1.5">
                    <div className={`h-1.5 w-[45%] ${LINE} bg-white/70`} />
                    <div className={`h-1 w-[30%] ${LINE_MUTED} bg-white/50`} />
                </div>
            </div>
            <div className="flex min-h-0 flex-1 gap-1 overflow-hidden">
                <div className={`h-full w-[44%] shrink-0 ${SURFACE}`}>
                    <div className="m-1 h-[55%] rounded-sm bg-[var(--bg-muted)]" />
                    <div className={`m-1 mt-0.5 h-1 w-[60%] ${LINE_MUTED}`} />
                </div>
                <div className={`h-full w-[38%] shrink-0 ${SURFACE} opacity-80`}>
                    <div className="m-1 h-[55%] rounded-sm bg-[var(--bg-muted)]" />
                </div>
                <div className={`h-full w-[30%] shrink-0 ${SURFACE} opacity-50`} />
            </div>
        </div>
    );
}

function StudioLayoutPreview() {
    return (
        <div className={`${PREVIEW_CLASS} grid grid-rows-[auto_1fr] gap-1.5`}>
            <div className={`flex items-center gap-1.5 px-1.5 py-1 ${SURFACE}`}>
                <div className="h-4 w-4 shrink-0 rounded-full bg-[var(--border-strong)]" />
                <div className="flex flex-1 flex-col gap-0.5">
                    <div className={`h-1 w-[62%] ${LINE}`} />
                    <div className={`h-0.5 w-[42%] ${LINE_MUTED}`} />
                </div>
            </div>
            <div className="grid grid-cols-2 grid-rows-2 gap-1">
                <div className={`col-span-2 ${SURFACE} p-1`}>
                    <div className={`mb-1 h-0.5 w-8 ${LINE_MUTED}`} />
                    <div className={`h-1 w-full ${LINE_MUTED}`} />
                    <div className={`mt-0.5 h-1 w-[85%] ${LINE_MUTED}`} />
                </div>
                <div className={SURFACE} />
                <div className={SURFACE} />
            </div>
        </div>
    );
}

const PREVIEWS: Record<OperatorSiteLayout, () => ReactElement> = {
    booking: BookingLayoutPreview,
    portfolio: PortfolioLayoutPreview,
    studio: StudioLayoutPreview,
};

export function OperatorSiteLayoutPreview({ layout }: { layout: OperatorSiteLayout }) {
    const Preview = PREVIEWS[layout];
    return (
        <div role="img" aria-label={PREVIEW_LABELS[layout]}>
            <Preview />
        </div>
    );
}
