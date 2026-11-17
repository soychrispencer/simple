'use client';

import type { ReactElement } from 'react';
import type { OperatorSiteLayout } from '@simple/utils';

type PreviewProps = {
    imageUrl?: string;
    name?: string;
    profession?: string;
    accentColor?: string;
    compact?: boolean;
};

const PREVIEW_BASE = 'relative mb-3 overflow-hidden rounded-xl border border-[var(--border)]';

function ImageBlock({ imageUrl, className = '' }: { imageUrl?: string; className?: string }) {
    return (
        <div
            className={`bg-cover bg-center ${className}`}
            style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}
            aria-hidden="true"
        />
    );
}

function BookingLayoutPreview({ imageUrl, name, profession, accentColor }: PreviewProps) {
    return (
        <div className={`${PREVIEW_BASE} grid grid-cols-[1.15fr_.85fr] bg-white`}>
            <div className="flex min-w-0 flex-col justify-center p-3">
                <span className="mb-1 text-[8px] font-semibold uppercase tracking-[.12em] text-slate-500">Reserva online</span>
                <strong className="truncate text-[13px] leading-tight text-slate-950">{name}</strong>
                <span className="mt-0.5 truncate text-[9px] text-slate-600">{profession}</span>
                <span className="mt-2 inline-flex w-fit rounded-full px-2.5 py-1 text-[8px] font-semibold text-white" style={{ backgroundColor: accentColor }}>Ver horas disponibles</span>
                <div className="mt-2 flex gap-1" aria-hidden="true">
                    {[0, 1, 2].map((key) => <span key={key} className="h-1.5 flex-1 rounded-full bg-slate-200" />)}
                </div>
            </div>
            <ImageBlock imageUrl={imageUrl} className="m-2 rounded-lg" />
        </div>
    );
}

function PortfolioLayoutPreview({ imageUrl, name, profession }: PreviewProps) {
    return (
        <div className={`${PREVIEW_BASE} bg-slate-950`}>
            <ImageBlock imageUrl={imageUrl} className="absolute inset-0 opacity-75" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                <span className="text-[8px] font-medium uppercase tracking-[.14em] text-white/75">Atención personalizada</span>
                <strong className="mt-0.5 block truncate text-[15px] leading-tight">{name}</strong>
                <span className="mt-0.5 block truncate text-[9px] text-white/80">{profession} <span aria-hidden="true">·</span> Conoce el espacio</span>
            </div>
        </div>
    );
}

function StudioLayoutPreview({ imageUrl, name, profession, accentColor }: PreviewProps) {
    return (
        <div className={`${PREVIEW_BASE} grid grid-cols-[.9fr_1.1fr] gap-2 bg-[#f3f4f1] p-2`}>
            <ImageBlock imageUrl={imageUrl} className="rounded-lg" />
            <div className="flex min-w-0 flex-col justify-center">
                <span className="text-[8px] font-semibold uppercase tracking-[.12em]" style={{ color: accentColor }}>Tu espacio</span>
                <strong className="mt-0.5 truncate text-[13px] leading-tight text-slate-950">{name}</strong>
                <span className="mt-0.5 truncate text-[9px] text-slate-600">{profession}</span>
                <div className="mt-2 grid grid-cols-2 gap-1" aria-hidden="true">
                    <span className="rounded-md bg-white px-1.5 py-1 text-[7px] text-slate-600">Servicios</span>
                    <span className="rounded-md bg-white px-1.5 py-1 text-[7px] text-slate-600">Ubicación</span>
                </div>
            </div>
        </div>
    );
}

const PREVIEWS: Record<OperatorSiteLayout, (props: PreviewProps) => ReactElement> = {
    booking: BookingLayoutPreview,
    portfolio: PortfolioLayoutPreview,
    studio: StudioLayoutPreview,
};

export function OperatorSiteLayoutPreview({
    layout,
    imageUrl,
    name = 'Tu nombre o negocio',
    profession = 'Tu especialidad',
    accentColor = '#0F766E',
    compact = false,
}: PreviewProps & { layout: OperatorSiteLayout }) {
    const Preview = PREVIEWS[layout];
    return (
        <div role="img" aria-label={`Vista previa de ${name}: ${layout}`}>
            <div className={compact ? '[&>div]:h-24' : '[&>div]:h-36'}>
                <Preview imageUrl={imageUrl} name={name} profession={profession} accentColor={accentColor} />
            </div>
        </div>
    );
}
