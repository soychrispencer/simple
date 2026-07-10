'use client';

import type { CSSProperties, ReactNode } from 'react';
import { getSimpleAppBrand } from '@simple/config';

export type InstagramTemplatePreviewData = {
    layoutVariant: 'square' | 'portrait';
    overlayVariant: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        surface: string;
        textPrimary: string;
        textSecondary?: string;
        textInverse: string;
    };
    branding: {
        appName: string;
        badgeText: string;
        appId?: 'simpleautos' | 'simplepropiedades';
    };
    eyebrow: string;
    headline: string;
    priceLabel: string;
    offerPriceLabel?: string;
    discountLabel?: string;
    title?: string;
    subtitle?: string;
    locationLabel: string;
    highlights: string[];
    badges?: string[];
    ctaLabel: string;
};

export type InstagramTemplatePreviewProps = {
    imageUrl?: string | null;
    template?: InstagramTemplatePreviewData | null;
    layoutVariant?: 'square' | 'portrait';
    fallback?: ReactNode;
    children?: ReactNode;
    className?: string;
    style?: CSSProperties;
};


function clampPreviewText(value: string | undefined | null, maxLength: number): string {
    if (!value) return '';
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function splitPreviewPrice(value: string | undefined | null): { prefix: string; amount: string } {
    if (!value) return { prefix: '', amount: '' };
    const normalized = value.replace(/\s+/g, ' ').trim();
    const ufMatch = normalized.match(/^(UF)\s*(.+)$/i);
    if (ufMatch) {
        return { prefix: ufMatch[1].toUpperCase(), amount: ufMatch[2].trim() };
    }
    const pesoMatch = normalized.match(/^(\$)\s*(.+)$/);
    if (pesoMatch) {
        return { prefix: pesoMatch[1], amount: pesoMatch[2].trim() };
    }
    const tokens = normalized.split(' ');
    if (tokens.length > 1) {
        return { prefix: tokens[0], amount: tokens.slice(1).join(' ') };
    }
    return { prefix: '', amount: normalized };
}

const PREVIEW_ICON_PATHS: Record<string, string> = {
    venta: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    arriendo: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z',
    usado: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3',
    nuevo: 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z',
    bencina: 'M3 22V6a2 2 0 012-2h6a2 2 0 012 2v16M3 10h10M14 10l3-3 2 2v8a2 2 0 01-2 2h-3',
    diesel: 'M3 22V6a2 2 0 012-2h6a2 2 0 012 2v16M3 10h10M14 10l3-3 2 2v8a2 2 0 01-2 2h-3',
    km: 'M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM12 6v6l4.5 2.5',
    manual: 'M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07',
    automatico: 'M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM12 6v6l4 2',
    servicio: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138c.065.71.327 1.39.806 1.946a3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
};

function getPreviewIconKey(text: string): string {
    const t = text.toLowerCase().trim();
    if (t === 'venta') return 'venta';
    if (t === 'arriendo') return 'arriendo';
    if (t === 'usado' || t === 'semi-nuevo') return 'usado';
    if (t === 'nuevo') return 'nuevo';
    if (t.includes('km')) return 'km';
    if (t.includes('bencina') || t.includes('gasolina')) return 'bencina';
    if (t.includes('diesel') || t.includes('diésel')) return 'diesel';
    if (t.includes('manual')) return 'manual';
    if (t.includes('automá') || t.includes('automat')) return 'automatico';
    return 'servicio';
}

function HighlightIcon({ text, size = 10, color = 'currentColor' }: { text: string; size?: number; color?: string }) {
    const key = getPreviewIconKey(text);
    const d = PREVIEW_ICON_PATHS[key] || PREVIEW_ICON_PATHS['servicio'];
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={d} />
        </svg>
    );
}

const BRAND_TAGLINE = 'Publicado vía';

function BrandWatermarkPill({
    appName,
    brandAccent,
    tagline = BRAND_TAGLINE,
    compact = false,
}: {
    appName: string;
    brandAccent: string;
    tagline?: string;
    compact?: boolean;
}) {
    const logoSize = compact ? 'h-9 w-9' : 'h-11 w-11';
    const padding = compact ? 'px-3 py-2' : 'px-3.5 py-2.5';

    return (
        <div className="absolute inset-x-0 bottom-4 z-[4] flex justify-center px-4">
            <div
                className={`flex max-w-full items-center gap-3 rounded-2xl border shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md ${padding}`}
                style={{ background: 'rgba(12,12,14,0.78)', borderColor: 'rgba(255,255,255,0.16)' }}
            >
                <div
                    className={`flex ${logoSize} shrink-0 items-center justify-center rounded-xl border-2 bg-white/10 p-1.5`}
                    style={{ borderColor: brandAccent }}
                >
                    <img src="/logo-light.png" alt={appName} className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0 text-left leading-tight">
                    <div className="text-[10px] font-semibold tracking-[0.14em] text-white/70 uppercase">
                        {tagline}
                    </div>
                    <div className={`font-extrabold text-white ${compact ? 'text-xs' : 'text-sm'}`}>
                        {appName}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ServiceBadgesColumn({
    template,
    brandAccent,
}: {
    template: InstagramTemplatePreviewData;
    brandAccent: string;
}) {
    if (!template.discountLabel && !(template.badges?.length)) return null;

    return (
        <div className="absolute top-3 right-3 z-[3] flex max-w-[46%] flex-col items-end gap-1.5">
            {template.discountLabel ? (
                <span
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold shadow-lg"
                    style={{ background: brandAccent, color: '#fff' }}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/><path d="M16 8l-8 8"/></svg>
                    {template.discountLabel}
                </span>
            ) : null}
            {template.badges?.map((badge, index) => (
                <span
                    key={`${badge}-${index}`}
                    className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-semibold text-[#111] shadow-md"
                >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
                    {badge}
                </span>
            ))}
        </div>
    );
}

function ListingOverlayPrice({
    template,
    brandAccent,
    light = false,
}: {
    template: InstagramTemplatePreviewData;
    brandAccent: string;
    light?: boolean;
}) {
    const priceColor = light ? '#fff' : brandAccent;

    return (
        <>
            <div
                className="font-black tracking-tight"
                style={{ fontSize: '2.15rem', lineHeight: 1, color: priceColor }}
            >
                {template.offerPriceLabel || template.priceLabel}
            </div>
            {template.offerPriceLabel ? (
                <div className={`mt-1 text-sm line-through ${light ? 'text-white/45' : 'text-(--fg-muted)'}`}>
                    {template.priceLabel}
                </div>
            ) : null}
        </>
    );
}

function describePreviewHighlight(value: string): string {
    const normalized = value.toLowerCase();
    if (normalized.includes('m²') || normalized.includes('m2')) return 'Superficie';
    if (normalized.includes('d')) return 'Dormitorios';
    if (normalized.includes('b')) return 'Banos';
    if (normalized.includes('est')) return 'Estac.';
    if (normalized.includes('bod')) return 'Bodega';
    if (normalized.includes('unidad')) return 'Unidades';
    return 'Detalle';
}

export function InstagramTemplatePreview(props: InstagramTemplatePreviewProps) {
    const { imageUrl, template, layoutVariant, fallback, children, className, style } = props;
    const isPropertyTemplate = template?.overlayVariant.startsWith('property') ?? false;
    const headline = template ? clampPreviewText(template.headline, isPropertyTemplate ? 42 : 34) : '';
    const locationLabel = template ? clampPreviewText(template.locationLabel, isPropertyTemplate ? 28 : 24) : '';
    const ctaLabel = template ? clampPreviewText(template.ctaLabel, 24) : '';
    const priceLockup = template ? splitPreviewPrice(template.priceLabel) : { prefix: '', amount: '' };
    const effectiveLayoutVariant = template?.layoutVariant ?? layoutVariant ?? 'square';
    const brandAccent = getSimpleAppBrand(template?.branding.appId ?? 'simpleautos').accentLight;

    return (
        <div
            className={`relative overflow-hidden rounded-card border ${className ?? ''}`.trim()}
            style={{
                aspectRatio: effectiveLayoutVariant === 'portrait' ? '3 / 4' : '1 / 1',
                borderColor: 'var(--border)',
                background: template?.colors.background ?? 'rgba(0,0,0,0.05)',
                ...style,
            }}
        >
            {imageUrl ? (
                <img src={imageUrl} alt="Vista previa" className="h-full w-full object-cover transition-opacity duration-300" />
            ) : (
                <div className="flex h-full w-full items-center justify-center" style={{ color: 'var(--fg-faint)' }}>
                    {fallback ?? null}
                </div>
            )}

            {template ? (
                <div className="pointer-events-none absolute inset-0">
                    {isPropertyTemplate ? (
                        <>
                            <div
                                className="absolute inset-x-0 top-0 flex items-center justify-between px-5"
                                style={{
                                    height: template.layoutVariant === 'portrait' ? '18%' : '15%',
                                    background: template.colors.secondary,
                                    color: template.colors.textInverse,
                                }}
                            >
                                <div
                                    className="flex min-h-[32px] items-center"
                                >
                                    <img src="/logo.png" alt={template.branding.appName} className="h-6 w-auto object-contain" />
                                </div>
                                <div className="max-w-[52%] text-right text-sm font-extrabold uppercase tracking-[0.2em]">
                                    {template.eyebrow}
                                </div>
                            </div>
                            <div
                                className="absolute left-4 max-w-[70%] rounded-full bg-white px-4 py-2 text-sm font-bold shadow-lg"
                                style={{
                                    top: template.layoutVariant === 'portrait' ? '57%' : '50%',
                                    color: template.colors.secondary,
                                }}
                            >
                                <span className="block truncate">{locationLabel}</span>
                            </div>
                            <div className="absolute inset-x-0 bottom-0">
                                <div
                                    className={`mx-3.5 mb-3.5 rounded-[1.25rem] p-4 ${template.overlayVariant === 'property-conversion' ? '' : 'backdrop-blur-md'}`}
                                    style={{
                                        background: template.overlayVariant === 'property-conversion'
                                            ? 'rgba(255,255,255,0.92)'
                                            : template.colors.surface,
                                        color: template.overlayVariant === 'property-conversion'
                                            ? template.colors.textPrimary
                                            : template.colors.textInverse,
                                    }}
                                >
                                    <div className="mb-2 text-xl font-semibold leading-tight line-clamp-2">
                                        {headline}
                                    </div>
                                    {template.overlayVariant === 'property-conversion' ? (
                                        <>
                                            <div className="mb-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
                                                {template.highlights.slice(0, 4).map((item) => (
                                                    <span
                                                        key={item}
                                                        className="rounded-full px-2.5 py-1"
                                                        style={{
                                                            background: 'rgba(50,50,255,0.12)',
                                                            color: template.colors.textPrimary,
                                                        }}
                                                    >
                                                        {item}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="flex items-end justify-between gap-3">
                                                <div>
                                                    <div className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
                                                        {template.branding.badgeText}
                                                    </div>
                                                    <div className="flex items-end gap-2">
                                                        {priceLockup.prefix ? (
                                                            <span className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: template.colors.accent }}>
                                                                {priceLockup.prefix}
                                                            </span>
                                                        ) : null}
                                                        <div
                                                            className="max-w-[240px] text-3xl font-semibold leading-none"
                                                            style={{ color: template.colors.accent }}
                                                        >
                                                            {priceLockup.amount}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="max-w-[48%] text-right text-sm font-semibold leading-tight">
                                                    {ctaLabel}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="grid grid-cols-[1fr_auto] gap-4 items-end">
                                            <div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {template.highlights.slice(0, 3).map((item) => (
                                                        <div
                                                            key={item}
                                                            className="rounded-[1.05rem] px-2.5 py-2 text-center"
                                                            style={{ background: 'rgba(255,255,255,0.12)' }}
                                                        >
                                                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">
                                                                {describePreviewHighlight(item)}
                                                            </div>
                                                            <div className="mt-1 text-sm font-bold leading-tight">
                                                                {item}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
                                                    {ctaLabel}
                                                </div>
                                            </div>
                                            <div className="min-w-[118px] rounded-[1.25rem] px-3 py-3 text-right" style={{ background: template.colors.accent, color: template.colors.textInverse }}>
                                                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] opacity-90">
                                                    {template.overlayVariant === 'property-project' ? 'Desde' : template.branding.badgeText}
                                                </div>
                                                <div className="mt-1 flex items-end justify-end gap-1">
                                                    {priceLockup.prefix ? (
                                                        <span className="text-sm font-bold uppercase tracking-[0.16em]">
                                                            {priceLockup.prefix}
                                                        </span>
                                                    ) : null}
                                                    <div className="text-[2rem] font-semibold leading-none">
                                                        {priceLockup.amount}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : template.overlayVariant === 'auto-clean' ? null
                    : template.overlayVariant === 'auto-watermark' ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <img src="/logo.png" alt={template.branding.appName} className="h-28 w-28 object-contain opacity-70" />
                        </div>
                    ) : template.overlayVariant === 'auto-focal' ? (
                        <>
                            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.44)' }} />
                            <div
                                className="absolute rounded-[1.8rem] overflow-hidden"
                                style={{ inset: '13.7% 8.3%', background: 'rgba(255,255,255,0.96)' }}
                            >
                                <div
                                    className="flex items-center gap-3 px-5"
                                    style={{ height: '11.7%', background: template.colors.accent }}
                                >
                                    <img src="/logo.png" alt={template.branding.appName} className="h-7 w-7 object-contain" />
                                    <span className="text-sm font-extrabold text-white">{template.branding.appName}</span>
                                </div>
                                <div className="flex flex-col items-center px-6 pt-5 pb-4 text-center" style={{ color: template.colors.textPrimary }}>
                                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] opacity-60">
                                        {template.eyebrow} · {locationLabel}
                                    </div>
                                    <div className="mb-3 text-[1.55rem] font-semibold leading-tight line-clamp-2">
                                        {headline}
                                    </div>
                                    <div className="mb-3 flex flex-wrap justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
                                        {template.highlights.slice(0, 4).map((item) => (
                                            <span key={item} className="rounded-full px-2.5 py-1" style={{ background: 'rgba(0,0,0,0.07)' }}>
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="mb-2 w-full border-t" style={{ borderColor: 'rgba(0,0,0,0.12)' }} />
                                    <div className="text-[1.9rem] font-semibold leading-none" style={{ color: template.colors.accent }}>
                                        {template.priceLabel}
                                    </div>
                                    <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">
                                        {ctaLabel}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : template.overlayVariant === 'auto-titan' ? (
                        <>
                            <div
                                className="absolute inset-x-0 top-0 flex items-center justify-between px-4"
                                style={{ height: '9.3%', background: '#0C0C0E' }}
                            >
                                <div
                                    className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]"
                                    style={{ background: template.colors.accent, color: '#fff' }}
                                >
                                    {template.eyebrow}
                                </div>
                                <img src="/logo.png" alt={template.branding.appName} className="h-7 w-7 object-contain" />
                            </div>
                            <div
                                className="absolute inset-x-0 bottom-0 p-4"
                                style={{ background: '#0C0C0E', color: '#fff', paddingTop: '0.5rem' }}
                            >
                                <div
                                    className="mb-1 h-[3px] w-full"
                                    style={{ background: template.colors.accent }}
                                />
                                <div className="mb-0.5 text-sm font-semibold leading-tight line-clamp-1">
                                    {headline}
                                </div>
                                <div className="mb-2 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">
                                    {template.highlights.slice(0, 3).map((item) => (
                                        <span key={item}>{item}</span>
                                    ))}
                                </div>
                                <div className="text-[2.4rem] font-semibold leading-none" style={{ color: template.colors.accent }}>
                                    {template.priceLabel}
                                </div>
                                <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
                                    {ctaLabel}
                                </div>
                            </div>
                        </>
                    ) : template.overlayVariant === 'auto-studio' ? (
                        <>
                            <div
                                className="absolute inset-x-0 top-0 flex items-center justify-between px-4"
                                style={{ height: '15.5%', background: template.colors.accent }}
                            >
                                <div className="text-lg font-semibold leading-tight text-white line-clamp-2 max-w-[75%]">
                                    {headline}
                                </div>
                                <img src="/logo.png" alt={template.branding.appName} className="h-7 w-7 object-contain" />
                            </div>
                            <div
                                className="absolute inset-x-0 bottom-0 p-4"
                                style={{ background: '#0C0C0E', color: '#fff' }}
                            >
                                <div className="mb-2 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">
                                    {template.highlights.slice(0, 3).map((item) => (
                                        <span key={item}>{item}</span>
                                    ))}
                                </div>
                                <div className="text-[2rem] font-semibold leading-none" style={{ color: template.colors.accent }}>
                                    {template.priceLabel}
                                </div>
                                <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
                                    {ctaLabel} · {locationLabel}
                                </div>
                            </div>
                        </>
                    ) : template.overlayVariant === 'essential-watermark' ? (
                        <BrandWatermarkPill
                            appName={template.branding.appName}
                            brandAccent={brandAccent}
                            tagline={template.branding.badgeText || BRAND_TAGLINE}
                        />
                    ) : template.overlayVariant === 'professional-centered' ? (
                        <>
                            <ServiceBadgesColumn template={template} brandAccent={brandAccent} />
                            <div
                                className="absolute inset-x-0 bottom-0 h-[48%]"
                                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)' }}
                            />
                            <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
                                <div
                                    className="overflow-hidden rounded-[1.15rem] border shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
                                    style={{ background: 'rgba(12,12,14,0.94)', borderColor: 'rgba(255,255,255,0.1)' }}
                                >
                                    <div className="h-1" style={{ background: brandAccent }} />
                                    <div className="px-4 pt-3 pb-4">
                                        <div className="mb-3 flex items-center justify-center gap-2.5">
                                            <div
                                                className="flex h-10 w-10 items-center justify-center rounded-xl border-2 bg-white/5 p-1.5"
                                                style={{ borderColor: brandAccent }}
                                            >
                                                <img src="/logo-light.png" alt={template.branding.appName} className="h-full w-full object-contain" />
                                            </div>
                                            <div className="text-left leading-tight">
                                                <div className="text-[9px] font-semibold tracking-[0.16em] text-white/55 uppercase">
                                                    {BRAND_TAGLINE}
                                                </div>
                                                <div className="text-[11px] font-bold text-white">
                                                    {template.branding.appName}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <ListingOverlayPrice template={template} brandAccent={brandAccent} />
                                            {template.title ? (
                                                <div className="mt-2 line-clamp-2 text-[0.92rem] leading-snug font-semibold text-white uppercase">
                                                    {template.title}
                                                </div>
                                            ) : null}
                                            {template.highlights && template.highlights.length > 0 ? (
                                                <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
                                                    {template.highlights.slice(0, 4).map((highlight, index) => (
                                                        <span
                                                            key={`${highlight}-${index}`}
                                                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase"
                                                            style={{ background: `${brandAccent}22`, color: '#fff' }}
                                                        >
                                                            <HighlightIcon text={highlight} size={9} color="#fff" />
                                                            {highlight}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : null}
                                            {template.locationLabel ? (
                                                <div className="mt-2.5 flex justify-center">
                                                    <span
                                                        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold"
                                                        style={{ color: brandAccent }}
                                                    >
                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
                                                        {template.locationLabel}
                                                    </span>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : template.overlayVariant === 'signature-complete' ? (
                        <>
                            <ServiceBadgesColumn template={template} brandAccent={brandAccent} />
                            <div
                                className="absolute inset-0"
                                style={{ background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.28) 100%)' }}
                            />
                            <div
                                className="absolute inset-x-0 bottom-0 px-4 pt-24 pb-4"
                                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.72) 42%, transparent 100%)' }}
                            >
                                <div className="mb-3 flex justify-center">
                                    <div
                                        className="flex h-12 w-12 items-center justify-center rounded-full border-2 bg-white/10 p-2 shadow-[0_0_0_4px_rgba(232,74,31,0.18)]"
                                        style={{ borderColor: brandAccent }}
                                    >
                                        <img src="/logo-light.png" alt={template.branding.appName} className="h-full w-full object-contain" />
                                    </div>
                                </div>
                                <div className="mx-auto mb-3 h-0.5 w-14 rounded-full" style={{ background: brandAccent }} />
                                <div className="text-center">
                                    <ListingOverlayPrice template={template} brandAccent={brandAccent} light />
                                    {template.title ? (
                                        <div className="mt-2 line-clamp-2 text-[0.95rem] leading-snug font-semibold tracking-[0.04em] text-white uppercase">
                                            {template.title}
                                        </div>
                                    ) : null}
                                    {template.highlights && template.highlights.length > 0 ? (
                                        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[9px] font-semibold tracking-[0.08em] text-white/70 uppercase">
                                            {template.highlights.slice(0, 4).map((highlight, index) => (
                                                <span key={`${highlight}-${index}`} className="inline-flex items-center gap-1">
                                                    {index > 0 ? <span className="text-white/30">·</span> : null}
                                                    <HighlightIcon text={highlight} size={9} color="rgba(255,255,255,0.7)" />
                                                    {highlight}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null}
                                    {template.locationLabel ? (
                                        <div className="mt-2.5 flex justify-center">
                                            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
                                                {template.locationLabel}
                                            </span>
                                        </div>
                                    ) : null}
                                </div>
                                <div className="mt-4 flex justify-center">
                                    <div
                                        className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5"
                                        style={{ borderColor: 'rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)' }}
                                    >
                                        <div
                                            className="flex h-7 w-7 items-center justify-center rounded-lg border bg-white/10 p-1"
                                            style={{ borderColor: `${brandAccent}88` }}
                                        >
                                            <img src="/logo-light.png" alt={template.branding.appName} className="h-full w-full object-contain" />
                                        </div>
                                        <div className="text-left leading-tight">
                                            <div className="text-[8px] font-semibold tracking-[0.14em] text-white/55 uppercase">{BRAND_TAGLINE}</div>
                                            <div className="text-[10px] font-bold text-white">{template.branding.appName}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Fallback genérico */}
                            <div
                                className="absolute inset-x-0 bottom-0 p-4"
                                style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.8) 50%)', color: '#fff' }}
                            >
                                <div className="mb-2 max-w-[80%] text-[2rem] font-semibold leading-none line-clamp-2">
                                    {headline}
                                </div>
                                <div className="text-[2rem] font-semibold leading-none">
                                    {template.priceLabel}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            ) : null}

            {children}
        </div>
    );
}