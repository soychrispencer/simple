'use client';

import { useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { IconBuildingSkyscraper, IconCalendar, IconConfetti, IconDotsCircleHorizontal, IconSteeringWheel, IconUser } from '@tabler/icons-react';
import clsx from 'clsx';
import { getSimpleAppBrand, type SimpleAppId } from '@simple/config';
export * from './theme-provider';
export * from './modern-select';

// Deuda técnica: Google Places Autocomplete (API clásica). Migrar a PlaceAutocompleteElement cuando actualicemos la integración.
import { joinClasses } from './shared/join-classes';
import { PanelButton, getPanelButtonClassName, getPanelButtonStyle, type PanelButtonProps } from './panel/panel-button';
import { PanelCard, type PanelCardProps } from './panel/panel-card';
export { ThemeProvider, useTheme, useThemeToggle, SIMPLE_THEME_PROVIDER_DEFAULTS } from './theme-provider';
export type { SimpleThemeProviderProps } from './theme-provider';
export { ThemeToggleButton, type ThemeToggleButtonProps } from './theme-toggle-button';
export { joinClasses };
export {
    ListingLocationEditor,
    LocationMapPreview,
    type ListingLocationEditorProps,
    type LocationMapPreviewProps,
} from './location/listing-location-editor';
export { AddressBookManager, type AddressBookManagerSubmitInput } from './address-book/address-book-manager';
export { useAddressBookPage } from './address-book/use-address-book-page';
export { PanelButton, getPanelButtonClassName, getPanelButtonStyle, type PanelButtonProps } from './panel/panel-button';
export { PanelCard, type PanelCardProps } from './panel/panel-card';
export { PanelFilterChip, type PanelFilterChipProps } from './panel/panel-filter-chip';

type SelectOption = {
    value: string;
    label: string;
    disabled?: boolean;
};

export type BrandLogoVariant = 'default' | 'ghost' | 'onAccent';

type BrandLogoProps = {
    appId: SimpleAppId;
    className?: string;
    showWordmark?: boolean;
    size?: 'sm' | 'md' | 'lg';
    /** default: caja con tokens de acento; ghost: más liviano; onAccent: sobre fondos con --accent (p. ej. marketing/auth). */
    variant?: BrandLogoVariant;
};

type PanelAccountProfileCardProps = {
    name?: string;
    email?: string;
    role?: string;
    subtitle?: string;
    className?: string;
};

const BRAND_ICON_BY_APP: Record<SimpleAppId, ComponentType<{ size?: number; style?: CSSProperties }>> = {
    simpleautos: IconSteeringWheel,
    simplepropiedades: IconBuildingSkyscraper,
    simpleadmin: IconBuildingSkyscraper,
    simpleplataforma: IconBuildingSkyscraper,
    simpleagenda: IconCalendar,
    simpleserenatas: IconConfetti,
};

function brandLogoIconWrapStyle(variant: BrandLogoVariant): CSSProperties {
    switch (variant) {
        case 'ghost':
            return {
                background: 'transparent',
                borderColor: 'var(--accent-border)',
                color: 'var(--accent)',
            };
        case 'onAccent':
            return {
                background: 'var(--accent-contrast)',
                borderColor: 'color-mix(in oklab, var(--accent-contrast) 78%, var(--accent))',
                color: 'var(--accent)',
                boxShadow: 'var(--shadow-sm)',
            };
        default:
            return {
                background: 'var(--accent)',
                borderColor: 'var(--accent)',
                color: 'var(--accent-contrast)',
                boxShadow: 'var(--shadow-sm)',
            };
    }
}

export function BrandLogo({
    appId,
    className,
    showWordmark = true,
    size = 'md',
    variant = 'default',
}: BrandLogoProps) {
    const brand = getSimpleAppBrand(appId);
    const Icon = BRAND_ICON_BY_APP[appId];
    const secondary = brand.shortName.replace(/^Simple/, '') || brand.shortName;
    const iconSize = size === 'sm' ? 16 : size === 'lg' ? 26 : 18;
    const wordmarkClass = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base';

    const wordmarkPrimary = variant === 'onAccent' ? 'var(--accent-contrast)' : 'var(--fg)';
    const wordmarkSecondary =
        variant === 'onAccent'
            ? 'color-mix(in oklab, var(--accent-contrast) 88%, transparent)'
            : 'var(--accent)';

    const iconBox = clsx(
        'flex items-center justify-center border transition-[box-shadow,border-color,background-color,transform,filter] duration-[var(--serenatas-motion-duration,180ms)] ease-[var(--serenatas-motion-ease,cubic-bezier(0.16,1,0.3,1))]',
        size === 'sm' && 'w-8 h-8 rounded-[var(--radius)]',
        size === 'md' && 'w-9 h-9 rounded-[var(--radius)]',
        size === 'lg' && 'w-14 h-14 rounded-[var(--radius-lg)]',
        variant === 'default' &&
            'group-hover:[box-shadow:var(--shadow-md)] group-hover:brightness-[1.04] group-hover:-translate-y-px',
        variant === 'ghost' &&
            'group-hover:border-[color:var(--accent)] group-hover:bg-[var(--accent-subtle)] group-hover:shadow-sm group-hover:-translate-y-px',
        variant === 'onAccent' &&
            'group-hover:[box-shadow:var(--shadow-md)] group-hover:brightness-[1.03] group-hover:-translate-y-px'
    );

    return (
        <span className={clsx('flex items-center gap-2 group shrink-0', className)}>
            <span className={iconBox} style={brandLogoIconWrapStyle(variant)}>
                <Icon size={iconSize} />
            </span>
            {showWordmark ? (
                <span
                    className={clsx(
                        'inline-flex items-baseline gap-[0.08rem] tracking-tight leading-none',
                        wordmarkClass
                    )}
                    style={{ color: wordmarkPrimary }}
                >
                    <span className="font-semibold leading-none">Simple</span>
                    <span className="font-normal leading-none" style={{ color: wordmarkSecondary }}>
                        {secondary}
                    </span>
                </span>
            ) : null}
        </span>
    );
}

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

type InstagramTemplatePreviewProps = {
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
                                    <div className="mb-2 text-xl font-black leading-tight line-clamp-2">
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
                                                            className="max-w-[240px] text-3xl font-black leading-none"
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
                                                    <div className="text-[2rem] font-black leading-none">
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
                                    <div className="mb-3 text-[1.55rem] font-black leading-tight line-clamp-2">
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
                                    <div className="text-[1.9rem] font-black leading-none" style={{ color: template.colors.accent }}>
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
                                style={{ height: '9.3%', background: '#111111' }}
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
                                style={{ background: '#111111', color: '#fff', paddingTop: '0.5rem' }}
                            >
                                <div
                                    className="mb-1 h-[3px] w-full"
                                    style={{ background: template.colors.accent }}
                                />
                                <div className="mb-0.5 text-sm font-black leading-tight line-clamp-1">
                                    {headline}
                                </div>
                                <div className="mb-2 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">
                                    {template.highlights.slice(0, 3).map((item) => (
                                        <span key={item}>{item}</span>
                                    ))}
                                </div>
                                <div className="text-[2.4rem] font-black leading-none" style={{ color: template.colors.accent }}>
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
                                <div className="text-lg font-black leading-tight text-white line-clamp-2 max-w-[75%]">
                                    {headline}
                                </div>
                                <img src="/logo.png" alt={template.branding.appName} className="h-7 w-7 object-contain" />
                            </div>
                            <div
                                className="absolute inset-x-0 bottom-0 p-4"
                                style={{ background: '#111111', color: '#fff' }}
                            >
                                <div className="mb-2 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">
                                    {template.highlights.slice(0, 3).map((item) => (
                                        <span key={item}>{item}</span>
                                    ))}
                                </div>
                                <div className="text-[2rem] font-black leading-none" style={{ color: template.colors.accent }}>
                                    {template.priceLabel}
                                </div>
                                <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
                                    {ctaLabel} · {locationLabel}
                                </div>
                            </div>
                        </>
                    ) : template.overlayVariant === 'essential-watermark' ? (
                        <>
                            {/* ═══ BÁSICO ═══ Solo logo esquina superior izquierda */}
                            <div className="absolute top-4 left-4" style={{ opacity: 0.5 }}>
                                <img src="/logo-light.png" alt={template.branding.appName} style={{ width: '40px', height: '40px', objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }} />
                            </div>
                        </>
                    ) : template.overlayVariant === 'professional-centered' ? (
                        <>
                            {/* ═══ PROFESIONAL ═══ Card de color con logo, precio, título, info, badges */}
                            {/* Columna derecha: descuento + badges servicios */}
                            <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5" style={{ zIndex: 3 }}>
                                {template.discountLabel && (
                                    <span
                                        className="text-sm font-bold px-4 py-1.5 inline-flex items-center gap-1"
                                        style={{ background: brandAccent, color: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/><path d="M16 8l-8 8"/></svg>
                                        {template.discountLabel}
                                    </span>
                                )}
                                {template.badges && template.badges.map((badge, i) => (
                                    <span
                                        key={i}
                                        className="text-[11px] font-semibold px-3 py-1.5 inline-flex items-center gap-1"
                                        style={{ background: '#fff', color: '#111', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
                                    >
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
                                        {badge}
                                    </span>
                                ))}
                            </div>
                            {/* Card de color centrada abajo */}
                            <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
                                {/* Logo flotante sin fondo: mitad dentro, mitad fuera */}
                                <div className="flex justify-center" style={{ marginBottom: '-24px', position: 'relative', zIndex: 3 }}>
                                    <img src="/logo-light.png" alt={template.branding.appName} style={{ width: '40px', height: '40px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                                </div>
                                <div
                                    className="overflow-hidden text-center"
                                    style={{
                                        background: brandAccent,
                                        borderRadius: '16px',
                                        position: 'relative',
                                        zIndex: 1,
                                    }}
                                >
                                    <div className="px-5 pb-4" style={{ paddingTop: '36px' }}>
                                        {/* Precio grande blanco */}
                                        <div style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1, color: '#fff' }}>
                                            {template.offerPriceLabel || template.priceLabel}
                                        </div>
                                        {/* Precio original tachado si hay oferta */}
                                        {template.offerPriceLabel && (
                                            <div className="text-sm line-through mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                                {template.priceLabel}
                                            </div>
                                        )}
                                        {/* Título — 1 línea */}
                                        {template.title && (
                                            <div className="font-black mt-2 leading-tight line-clamp-1 uppercase" style={{ color: '#fff', fontSize: '0.95rem' }}>
                                                {template.title}
                                            </div>
                                        )}
                                        {/* Highlights con iconos */}
                                        {template.highlights && template.highlights.length > 0 && (
                                            <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
                                                {template.highlights.slice(0, 4).map((h, i) => (
                                                    <span key={i} className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase" style={{ color: 'rgba(255,255,255,0.8)' }}>
                                                        <HighlightIcon text={h} size={10} color="rgba(255,255,255,0.8)" />
                                                        {h}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {/* Comuna con icono pin */}
                                        {template.locationLabel && (
                                            <div className="flex justify-center mt-2.5">
                                                <span
                                                    className="text-[11px] font-bold px-3.5 py-1.5 inline-flex items-center gap-1"
                                                    style={{ background: '#fff', color: brandAccent, borderRadius: '9999px' }}
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
                                                    {template.locationLabel}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : template.overlayVariant === 'signature-complete' ? (
                        <>
                            {/* ═══ PREMIUM ═══ Diseño elegante oscuro, branding fuerte */}
                            {/* Logo light top-left */}
                            <div className="absolute top-4 left-4" style={{ zIndex: 3, opacity: 0.6 }}>
                                <img src="/logo-light.png" alt={template.branding.appName} style={{ width: '40px', height: '40px', objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }} />
                            </div>
                            {/* Columna derecha: descuento + badges servicios */}
                            <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5" style={{ zIndex: 3 }}>
                                {template.discountLabel && (
                                    <span
                                        className="text-sm font-bold px-4 py-1.5 inline-flex items-center gap-1"
                                        style={{ background: brandAccent, color: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/><path d="M16 8l-8 8"/></svg>
                                        {template.discountLabel}
                                    </span>
                                )}
                                {template.badges && template.badges.map((badge, i) => (
                                    <span
                                        key={i}
                                        className="text-[11px] font-semibold px-3 py-1.5 inline-flex items-center gap-1"
                                        style={{ background: '#fff', color: '#111', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
                                    >
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
                                        {badge}
                                    </span>
                                ))}
                            </div>
                            {/* Gradiente elegante inferior */}
                            <div
                                className="absolute inset-x-0 bottom-0"
                                style={{
                                    background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.75) 40%, rgba(0,0,0,0.3) 70%, transparent 100%)',
                                    padding: '80px 20px 20px',
                                }}
                            >
                                <div className="text-center">
                                    {/* Precio grande */}
                                    <div style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1, color: '#fff' }}>
                                        {template.offerPriceLabel || template.priceLabel}
                                    </div>
                                    {template.offerPriceLabel && (
                                        <div className="text-sm line-through mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                            {template.priceLabel}
                                        </div>
                                    )}
                                    {/* Título — 1 línea */}
                                    {template.title && (
                                        <div className="font-black mt-2 leading-tight line-clamp-1 uppercase" style={{ color: '#fff', fontSize: '0.95rem' }}>
                                            {template.title}
                                        </div>
                                    )}
                                    {/* Highlights con iconos */}
                                    {template.highlights && template.highlights.length > 0 && (
                                        <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
                                            {template.highlights.slice(0, 4).map((h, i) => (
                                                <span key={i} className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase" style={{ color: 'rgba(255,255,255,0.65)' }}>
                                                    <HighlightIcon text={h} size={10} color="rgba(255,255,255,0.65)" />
                                                    {h}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {/* Comuna con icono pin */}
                                    {template.locationLabel && (
                                        <div className="flex justify-center mt-2.5">
                                            <span
                                                className="text-[11px] font-bold px-3.5 py-1.5 inline-flex items-center gap-1"
                                                style={{ background: '#fff', color: brandAccent, borderRadius: '9999px' }}
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
                                                {template.locationLabel}
                                            </span>
                                        </div>
                                    )}
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
                                <div className="mb-2 max-w-[80%] text-[2rem] font-black leading-none line-clamp-2">
                                    {headline}
                                </div>
                                <div className="text-[2rem] font-black leading-none">
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


type PanelPillNavItem = {
    key: string;
    label: string;
    leading?: React.ReactNode;
    disabled?: boolean;
    tone?: 'neutral' | 'warning';
    badge?: string;
};

type PanelPillNavProps = {
    items: PanelPillNavItem[];
    activeKey: string;
    onChange: (key: string) => void;
    ariaLabel?: string;
    mobileLabel?: string;
    breakpoint?: 'sm' | 'md' | 'lg';
    showMobileDropdown?: boolean;
    size?: 'sm' | 'md';
};

type PanelStepNavItem = {
    key: string;
    label: string;
    done?: boolean;
    disabled?: boolean;
};

type PanelStepNavProps = {
    items: PanelStepNavItem[];
    activeKey: string;
    onChange: (key: string) => void;
    ariaLabel?: string;
    labelBreakpoint?: 'always' | 'sm' | 'md' | 'lg';
};

type PanelSearchFieldProps = {
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
    className?: string;
    inputClassName?: string;
};

type PanelSegmentedToggleItem = {
    key: string;
    label: string;
    icon?: React.ReactNode;
    ariaLabel?: string;
};

type PanelSegmentedToggleProps = {
    items: PanelSegmentedToggleItem[];
    activeKey: string;
    onChange: (key: string) => void;
    className?: string;
    size?: 'sm' | 'md';
    iconOnly?: boolean;
};

type PanelStatusBadgeProps = {
    label: string;
    tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
    variant?: 'soft' | 'solid';
    size?: 'xs' | 'sm';
    className?: string;
};

type PanelSummaryRowProps = {
    label: string;
    value: React.ReactNode;
    valueClassName?: string;
};

type PanelSummaryCardProps = {
    eyebrow?: string;
    title: React.ReactNode;
    rows?: PanelSummaryRowProps[];
    children?: React.ReactNode;
    className?: string;
};

type PanelListProps = {
    children: React.ReactNode;
    className?: string;
};

type PanelListHeaderProps = {
    children: React.ReactNode;
    className?: string;
};

type PanelListRowProps = {
    children: React.ReactNode;
    className?: string;
    divider?: boolean;
    tone?: 'surface' | 'subtle';
    hoverTone?: 'none' | 'subtle' | 'muted';
};

type PanelIconButtonProps = {
    children: React.ReactNode;
    label: string;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    className?: string;
    size?: 'sm' | 'md';
    variant?: 'ghost' | 'soft' | 'inverse' | 'overlay';
};

type PanelSwitchProps = {
    checked: boolean;
    onChange: (next: boolean) => void;
    disabled?: boolean;
    className?: string;
    ariaLabel?: string;
    size?: 'sm' | 'md';
};

type PanelChoiceCardProps = {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    selected?: boolean;
    className?: string;
};

export type PanelMediaAsset = {
    id: string;
    name: string;
    dataUrl: string;
    previewUrl: string;
    isCover: boolean;
    width: number;
    height: number;
    sizeBytes: number;
    mimeType: string;
};

export type PanelDocumentAsset = {
    id: string;
    name: string;
    sizeBytes: number;
    mimeType: string;
};

export type PanelVideoAsset = {
    id: string;
    name: string;
    dataUrl: string;
    previewUrl: string;
    mimeType: string;
    sizeBytes: number;
    width: number;
    height: number;
    durationSeconds: number;
};

type PanelMediaUploaderProps = {
    items: PanelMediaAsset[];
    onChange: (items: PanelMediaAsset[]) => void;
    minItems?: number;
    recommendedItems?: number;
    maxItems?: number;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    targetBytes?: number;
    className?: string;
    dropzoneTitle?: string;
    dropzoneDescription?: string;
    helperText?: string;
    emptyHint?: string;
    guidanceTitle?: string;
    guidanceDescription?: string;
    guidedSlots?: ReadonlyArray<{
        key: string;
        label: string;
    }>;
};

type PanelVideoUploaderProps = {
    asset: PanelVideoAsset | null;
    onChange: (asset: PanelVideoAsset | null) => void;
    className?: string;
    title?: string;
    description?: string;
    helperText?: string;
    maxBytes?: number;
    requiredAspectRatio?: number;
    aspectRatioTolerance?: number;
};

type PanelDocumentUploaderProps = {
    items: PanelDocumentAsset[];
    onChange: (items: PanelDocumentAsset[]) => void;
    className?: string;
    title?: string;
    description?: string;
    helperText?: string;
    maxItems?: number;
    maxBytes?: number;
};

type PanelFieldProps = {
    label: string;
    hint?: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
};

type PanelPageHeaderProps = {
    title: string;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    backHref?: string;
    className?: string;
};

type PanelBlockHeaderProps = {
    title: string;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
};

type PanelNoticeProps = {
    children: React.ReactNode;
    className?: string;
    tone?: 'neutral' | 'success' | 'warning' | 'error';
};

type PanelActionsProps = {
    left?: React.ReactNode;
    right?: React.ReactNode;
    className?: string;
    rightClassName?: string;
};

type PanelStatCardProps = {
    label: string;
    value: string;
    meta?: string;
    icon?: React.ReactNode;
    trend?: {
        label: string;
        tone?: 'positive' | 'negative' | 'neutral';
    };
};

type PanelEmptyStateProps = {
    title?: string;
    description: string;
    action?: React.ReactNode;
    className?: string;
};

export function PanelPillNav(props: PanelPillNavProps) {
    const {
        items,
        activeKey,
        onChange,
        ariaLabel = 'Navegación de panel',
        mobileLabel = 'Sección actual',
        breakpoint = 'lg',
        showMobileDropdown = true,
        size = 'md',
    } = props;

    const [mobileOpen, setMobileOpen] = useState(false);
    const activeItem = items.find((item) => item.key === activeKey) ?? items[0];
    const visibilityClass = breakpoint === 'sm'
        ? { mobile: 'sm:hidden', desktop: 'hidden sm:flex' }
        : breakpoint === 'md'
            ? { mobile: 'md:hidden', desktop: 'hidden md:flex' }
            : { mobile: 'lg:hidden', desktop: 'hidden lg:flex' };

    const desktopButtonClass = size === 'sm'
        ? 'shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap hover:bg-(--bg-subtle) hover:border-(--border-strong) hover:text-(--fg)'
        : 'shrink-0 inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap hover:bg-(--bg-subtle) hover:border-(--border-strong) hover:text-(--fg)';
    const desktopRowClass = size === 'sm'
        ? `${visibilityClass.desktop} flex-nowrap items-center gap-1.5 overflow-x-auto pb-1`
        : `${visibilityClass.desktop} flex-nowrap items-center gap-2 overflow-x-auto pb-1`;
    const triggerClass = size === 'sm'
        ? 'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-card text-left'
        : 'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-card text-left';

    return (
        <>
            {showMobileDropdown ? (
                <div className={`${visibilityClass.mobile} space-y-2`}>
                    <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--fg-muted)' }}>
                        {mobileLabel}
                    </p>
                    <button
                        type="button"
                        onClick={() => setMobileOpen((current) => !current)}
                        className={triggerClass}
                        style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}
                    >
                        <div className="min-w-0 flex items-center gap-2 text-sm font-medium">
                            {activeItem?.leading ? <span style={{ color: 'var(--fg-muted)' }}>{activeItem.leading}</span> : null}
                            <span className="truncate">{activeItem?.label}</span>
                        </div>
                        <span
                            className="shrink-0 transition-transform"
                            style={{ transform: `rotate(${mobileOpen ? '180deg' : '0deg'})`, color: 'var(--fg-muted)' }}
                            aria-hidden="true"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M4 6.5L8 10L12 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </span>
                    </button>

                    {mobileOpen ? (
                        <div className="overflow-hidden rounded-card border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                            {items.map((item, index) => {
                                const isActive = item.key === activeKey;
                                const isDisabled = Boolean(item.disabled);
                                const isWarning = item.tone === 'warning';
                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        disabled={isDisabled}
                                        onClick={() => {
                                            if (isDisabled) return;
                                            setMobileOpen(false);
                                            onChange(item.key);
                                        }}
                                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-left transition-colors"
                                        style={{
                                            borderTop: index === 0 ? 'none' : '1px solid var(--border)',
                                            background: isActive
                                                ? isWarning
                                                    ? 'color-mix(in oklab, var(--danger) 8%, var(--bg-muted) 92%)'
                                                    : 'var(--bg-subtle)'
                                                : 'transparent',
                                            color: isActive
                                                ? isWarning
                                                    ? 'var(--danger)'
                                                    : 'var(--fg)'
                                                : isDisabled
                                                    ? 'var(--fg-faint)'
                                                    : isWarning
                                                        ? 'color-mix(in oklab, var(--danger) 78%, var(--fg) 22%)'
                                                        : 'var(--fg-secondary)',
                                            opacity: isDisabled ? 0.6 : 1,
                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {item.leading ? <span style={{ color: isActive ? (isWarning ? 'var(--danger)' : 'var(--fg)') : 'var(--fg-muted)' }}>{item.leading}</span> : null}
                                        <span className="flex-1 truncate">{item.label}</span>
                                        {item.badge ? (
                                            <span
                                                className="inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                                                style={{
                                                    color: isWarning ? 'white' : 'var(--fg)',
                                                    background: isWarning ? 'var(--danger)' : 'var(--bg-muted)',
                                                }}
                                            >
                                                {item.badge}
                                            </span>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>
                    ) : null}
                </div>
            ) : null}

            <nav className={desktopRowClass} aria-label={ariaLabel}>
                {items.map((item) => {
                    const isActive = item.key === activeKey;
                    const isDisabled = Boolean(item.disabled);
                    const isWarning = item.tone === 'warning';
                    return (
                        <button
                            key={item.key}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                                if (!isDisabled) onChange(item.key);
                            }}
                            className={desktopButtonClass}
                            style={{
                                background: isActive
                                    ? isWarning
                                        ? 'color-mix(in oklab, var(--danger) 8%, var(--bg-muted) 92%)'
                                        : 'var(--button-primary-bg)'
                                    : 'transparent',
                                borderColor: isActive
                                    ? isWarning
                                        ? 'color-mix(in oklab, var(--danger) 55%, var(--border) 45%)'
                                        : 'var(--button-primary-border)'
                                    : isWarning
                                        ? 'color-mix(in oklab, var(--danger) 35%, var(--border) 65%)'
                                        : 'var(--border)',
                                color: isActive
                                    ? isWarning
                                        ? 'var(--danger)'
                                        : 'var(--button-primary-color)'
                                    : isDisabled
                                        ? 'var(--fg-faint)'
                                        : isWarning
                                            ? 'color-mix(in oklab, var(--danger) 78%, var(--fg) 22%)'
                                            : 'var(--fg-muted)',
                                opacity: isDisabled ? 0.62 : 1,
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {item.leading ? <span style={{ color: isActive ? (isWarning ? 'var(--danger)' : 'var(--button-primary-color)') : 'var(--fg-secondary)' }}>{item.leading}</span> : null}
                            <span>{item.label}</span>
                            {item.badge ? (
                                <span
                                    className="inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                                    style={{
                                        color: isWarning ? 'white' : isActive ? 'var(--button-primary-bg)' : 'var(--fg)',
                                        background: isWarning ? 'var(--danger)' : isActive ? 'var(--button-primary-color)' : 'var(--bg-muted)',
                                    }}
                                >
                                    {item.badge}
                                </span>
                            ) : null}
                        </button>
                    );
                })}
            </nav>
        </>
    );
}

export function PanelStepNav(props: PanelStepNavProps) {
    const {
        items,
        activeKey,
        onChange,
        ariaLabel = 'Pasos del flujo',
        labelBreakpoint = 'sm',
    } = props;

    const labelClass = labelBreakpoint === 'always'
        ? 'inline'
        : labelBreakpoint === 'md'
            ? 'hidden md:inline'
            : labelBreakpoint === 'lg'
                ? 'hidden lg:inline'
                : 'hidden sm:inline';

    return (
        <nav
            className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1"
            aria-label={ariaLabel}
        >
            {items.map((item, index) => {
                const isActive = item.key === activeKey;
                const isComplete = Boolean(item.done);
                const isDisabled = Boolean(item.disabled);
                return (
                    <div key={item.key} className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                                if (!isDisabled) onChange(item.key);
                            }}
                            className="inline-flex items-center gap-2 rounded-full px-1.5 py-1.5 text-sm transition-colors hover:bg-(--bg-subtle)"
                            style={{
                                color: isActive || isComplete ? 'var(--fg)' : isDisabled ? 'var(--fg-faint)' : 'var(--fg-muted)',
                                opacity: isDisabled ? 0.62 : 1,
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                background: isActive ? 'var(--bg-subtle)' : 'transparent',
                            }}
                        >
                            <span
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all"
                                style={{
                                    background: isActive || isComplete ? 'var(--button-primary-bg)' : 'var(--bg-muted)',
                                    color: isActive || isComplete ? 'var(--button-primary-color)' : 'var(--fg-muted)',
                                    boxShadow: isActive ? '0 0 0 1px var(--button-primary-border), var(--shadow-xs)' : 'none',
                                }}
                            >
                                {isComplete ? (
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                        <path d="M2.5 6.1L4.9 8.5L9.5 3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                ) : (
                                    index + 1
                                )}
                            </span>
                            <span className={`${labelClass} text-xs sm:text-sm font-medium whitespace-nowrap`}>{item.label}</span>
                        </button>
                        {index < items.length - 1 ? (
                            <span
                                className="h-px w-7 sm:w-10 shrink-0 rounded-full"
                                style={{ background: 'linear-gradient(90deg, transparent 0%, var(--border) 18%, var(--border) 82%, transparent 100%)' }}
                                aria-hidden="true"
                            />
                        ) : null}
                    </div>
                );
            })}
        </nav>
    );
}

export function PanelSearchField(props: PanelSearchFieldProps) {
    const {
        placeholder = 'Buscar',
        value,
        onChange,
        className,
        inputClassName,
    } = props;

    return (
        <div className={joinClasses('relative', className)}>
            <span
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--fg-muted)' }}
                aria-hidden="true"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M21 21L16.65 16.65M18 10.5C18 14.6421 14.6421 18 10.5 18C6.35786 18 3 14.6421 3 10.5C3 6.35786 6.35786 3 10.5 3C14.6421 3 18 6.35786 18 10.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </span>
            <input
                type="text"
                value={value}
                onChange={onChange ? (event) => onChange(event.target.value) : undefined}
                placeholder={placeholder}
                className={joinClasses('form-input h-9 w-full pl-9 text-sm', inputClassName)}
            />
        </div>
    );
}

export function PanelSegmentedToggle(props: PanelSegmentedToggleProps) {
    const { items, activeKey, onChange, className, size = 'sm', iconOnly = false } = props;
    const buttonClass = iconOnly
        ? size === 'md'
            ? 'h-9 w-9 justify-center px-0'
            : 'h-8 w-8 justify-center px-0'
        : size === 'md'
            ? 'h-9 px-3'
            : 'h-8 px-2.5';

    return (
        <div
            className={joinClasses('inline-flex items-center gap-0.5 rounded-xl p-0.5', className)}
            style={{ background: 'var(--bg-muted)' }}
        >
            {items.map((item) => {
                const isActive = item.key === activeKey;
                return (
                    <button
                        key={item.key}
                        type="button"
                        aria-label={item.ariaLabel || item.label}
                        onClick={() => onChange(item.key)}
                        className={joinClasses('inline-flex items-center gap-1.5 rounded-button text-sm font-medium transition-colors hover:text-(--fg)', buttonClass)}
                        style={{
                            background: isActive ? 'var(--button-primary-bg)' : 'transparent',
                            color: isActive ? 'var(--button-primary-color)' : 'var(--fg-muted)',
                            boxShadow: isActive ? '0 0 0 1px var(--button-primary-border)' : 'none',
                        }}
                    >
                        {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
                        {!iconOnly ? <span>{item.label}</span> : null}
                    </button>
                );
            })}
        </div>
    );
}

export function PanelStatusBadge(props: PanelStatusBadgeProps) {
    const {
        label,
        tone = 'neutral',
        variant = 'soft',
        size = 'xs',
        className,
    } = props;

    // CSS variables for consistent theming across light/dark modes
    const softTone = tone === 'success'
        ? { background: 'var(--color-success-bg, rgba(22,163,74,0.14))', color: 'var(--color-success-text, #166534)' }
        : tone === 'warning'
            ? { background: 'var(--color-warning-bg, rgba(234,179,8,0.18))', color: 'var(--color-warning-text, #92400e)' }
            : tone === 'danger'
                ? { background: 'var(--color-danger-bg, rgba(239,68,68,0.14))', color: 'var(--color-danger-text, #991b1b)' }
                : tone === 'info'
                    ? { background: 'var(--color-info-bg, rgba(59,130,246,0.14))', color: 'var(--color-info-text, #1d4ed8)' }
                    : { background: 'var(--bg-muted)', color: 'var(--fg-secondary)' };

    const solidTone = tone === 'success'
        ? { background: 'var(--color-success, #16a34a)', color: '#ffffff' }
        : tone === 'warning'
            ? { background: 'var(--color-warning, #eab308)', color: 'var(--surface)' }
            : tone === 'danger'
                ? { background: 'var(--color-danger, #ef4444)', color: '#ffffff' }
                : tone === 'info'
                    ? { background: 'var(--color-info)', color: '#ffffff' }
                    : { background: 'var(--accent)', color: '#ffffff' };

    return (
        <span
            className={joinClasses(
                'inline-flex items-center rounded-full font-medium',
                size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[10px]',
                className,
            )}
            style={variant === 'solid' ? solidTone : softTone}
        >
            {label}
        </span>
    );
}

export function PanelSummaryCard(props: PanelSummaryCardProps) {
    const { eyebrow, title, rows, children, className } = props;

    return (
        <div className={joinClasses('rounded-card border p-4', className)} style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            {eyebrow ? (
                <p className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--fg-muted)' }}>
                    {eyebrow}
                </p>
            ) : null}
            <div className={eyebrow ? 'mt-2' : ''}>
                <p className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>
                    {title}
                </p>
            </div>
            {rows && rows.length > 0 ? (
                <div className="space-y-2 mt-3 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                    {rows.map((row, index) => (
                        <div key={`${String(row.label)}-${index}`} className="flex items-start justify-between gap-3">
                            <span style={{ color: 'var(--fg-muted)' }}>{row.label}</span>
                            <span className={joinClasses('text-right', row.valueClassName)} style={{ color: 'var(--fg-secondary)' }}>
                                {row.value}
                            </span>
                        </div>
                    ))}
                </div>
            ) : null}
            {children ? <div className="mt-3">{children}</div> : null}
        </div>
    );
}

export function PanelList(props: PanelListProps) {
    const { children, className } = props;

    return (
        <div
            className={joinClasses('rounded-card border overflow-hidden', className)}
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
            {children}
        </div>
    );
}

export function PanelChoiceCard(props: PanelChoiceCardProps) {
    const {
        children,
        onClick,
        type = 'button',
        disabled = false,
        selected = false,
        className,
    } = props;

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={joinClasses(
                'rounded-card border p-4 text-left transition-[border-color,background,opacity,transform,box-shadow] duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0',
                className,
            )}
            style={{
                borderColor: selected ? 'var(--border-strong)' : 'var(--border)',
                background: selected ? 'var(--bg-subtle)' : 'var(--surface)',
                boxShadow: selected ? '0 0 0 1px var(--border-strong), var(--shadow-xs)' : 'none',
            }}
        >
            {children}
        </button>
    );
}

export function PanelSwitch(props: PanelSwitchProps) {
    const {
        checked,
        onChange,
        disabled = false,
        className,
        ariaLabel,
        size = 'md',
    } = props;

    const dimensions = size === 'sm'
        ? { track: 'w-9 h-5', thumb: 'w-4 h-4', left: 2, right: 18 }
        : { track: 'w-10 h-6', thumb: 'w-5 h-5', left: 2, right: 18 };

    return (
        <button
            type="button"
            role="switch"
            aria-label={ariaLabel}
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={joinClasses(
                'relative inline-flex items-center rounded-full transition-[background,opacity,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:opacity-50',
                dimensions.track,
                className,
            )}
            style={{ background: checked ? 'var(--accent)' : 'var(--bg-muted)' }}
        >
            <span
                className={joinClasses('absolute top-1/2 -translate-y-1/2 rounded-full transition-[left,background] duration-150', dimensions.thumb)}
                style={{
                    background: checked ? 'var(--accent-contrast, #fff)' : 'var(--fg-muted)',
                    left: checked ? dimensions.right : dimensions.left,
                }}
            />
        </button>
    );
}

export function PanelIconButton(props: PanelIconButtonProps) {
    const {
        children,
        label,
        onClick,
        type = 'button',
        disabled = false,
        className,
        size = 'sm',
        variant = 'ghost',
    } = props;

    const sizeClass = size === 'md' ? 'h-8 w-8' : 'h-7 w-7';
    const variantStyle = variant === 'soft'
        ? { background: 'var(--bg-muted)', color: 'var(--fg-muted)' }
        : variant === 'inverse'
            ? { background: 'var(--fg)', color: 'var(--bg)' }
            : variant === 'overlay'
                ? { background: 'rgba(255,255,255,0.92)', color: '#111827' }
                : { background: 'transparent', color: 'var(--fg-muted)' };

    return (
        <button
            type={type}
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
            className={joinClasses(
                'rounded-button flex items-center justify-center shrink-0 transition-[background,color,opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
                sizeClass,
                className,
            )}
            style={variantStyle}
        >
            {children}
        </button>
    );
}

function createPanelMediaId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function estimateDataUrlBytes(dataUrl: string): number {
    const commaIndex = dataUrl.indexOf(',');
    const payload = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
    return Math.ceil((payload.length * 3) / 4);
}

async function fileToDataUrl(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
        reader.readAsDataURL(file);
    });
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        image.src = dataUrl;
    });
}

async function loadVideoMetadata(file: File): Promise<{ width: number; height: number; durationSeconds: number }> {
    return await new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const objectUrl = URL.createObjectURL(file);
        let settled = false;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            video.onloadedmetadata = null;
            video.onloadeddata = null;
            video.oncanplay = null;
            video.onerror = null;
            video.removeAttribute('src');
            video.load();
            URL.revokeObjectURL(objectUrl);
        };

        const finish = (result: { width: number; height: number; durationSeconds: number } | null, error?: Error) => {
            if (settled) return;
            settled = true;
            cleanup();
            if (result) resolve(result);
            else reject(error ?? new Error('No pudimos abrir este video. Usa MP4 H.264, WEBM o MOV compatible.'));
        };

        const tryResolve = () => {
            if (!video.videoWidth || !video.videoHeight) return false;
            finish({
                width: video.videoWidth,
                height: video.videoHeight,
                durationSeconds: Number.isFinite(video.duration) ? video.duration : 0,
            });
            return true;
        };

        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        video.onloadedmetadata = () => {
            if (tryResolve()) return;
        };
        video.onloadeddata = () => {
            if (tryResolve()) return;
        };
        video.oncanplay = () => {
            if (tryResolve()) return;
        };
        video.onerror = () => {
            finish(null, new Error('No pudimos abrir este video. Usa MP4 H.264, WEBM o MOV compatible.'));
        };
        timeoutId = setTimeout(() => {
            finish({
                width: video.videoWidth || 0,
                height: video.videoHeight || 0,
                durationSeconds: Number.isFinite(video.duration) ? video.duration : 0,
            });
        }, 5000);
        video.src = objectUrl;
        video.load();
    });
}

function renderImageToWebpDataUrl(
    image: HTMLImageElement,
    width: number,
    height: number,
    quality: number
): string {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/webp', quality);
}

async function optimizeImageToWebp(params: {
    file: File;
    maxWidth: number;
    maxHeight: number;
    minWidth: number;
    minHeight: number;
    targetBytes: number;
}): Promise<PanelMediaAsset> {
    const sourceDataUrl = await fileToDataUrl(params.file);
    const image = await loadImage(sourceDataUrl);

    if (image.width < params.minWidth || image.height < params.minHeight) {
        throw new Error(`La imagen ${params.file.name} debe tener al menos ${params.minWidth} x ${params.minHeight} px.`);
    }

    let width = image.width;
    let height = image.height;
    const initialScale = Math.min(1, params.maxWidth / width, params.maxHeight / height);
    width = Math.max(1, Math.round(width * initialScale));
    height = Math.max(1, Math.round(height * initialScale));

    let quality = 0.86;
    let currentDataUrl = renderImageToWebpDataUrl(image, width, height, quality);
    if (!currentDataUrl) {
        throw new Error(`No se pudo procesar la imagen ${params.file.name}.`);
    }

    while (estimateDataUrlBytes(currentDataUrl) > params.targetBytes && quality > 0.54) {
        quality -= 0.07;
        currentDataUrl = renderImageToWebpDataUrl(image, width, height, quality);
        if (!currentDataUrl) break;
    }

    while (estimateDataUrlBytes(currentDataUrl) > params.targetBytes && width > 720 && height > 480) {
        width = Math.max(params.minWidth, Math.round(width * 0.9));
        height = Math.max(params.minHeight, Math.round(height * 0.9));
        currentDataUrl = renderImageToWebpDataUrl(image, width, height, quality);
        if (!currentDataUrl) break;
    }

    const normalizedName = params.file.name.replace(/\.[^.]+$/, '') || 'imagen';

    return {
        id: createPanelMediaId(),
        name: `${normalizedName}.webp`,
        dataUrl: currentDataUrl,
        previewUrl: currentDataUrl,
        isCover: false,
        width,
        height,
        sizeBytes: estimateDataUrlBytes(currentDataUrl),
        mimeType: 'image/webp',
    };
}

function normalizePanelMediaCover(items: PanelMediaAsset[]) {
    if (items.length === 0) return items;
    const coverId = items.find((item) => item.isCover)?.id ?? items[0].id;
    const reordered = [...items].sort((left, right) => {
        if (left.id === coverId) return -1;
        if (right.id === coverId) return 1;
        return 0;
    });
    return reordered.map((item, index) => ({ ...item, isCover: index === 0 && item.id === coverId }));
}

function reorderPanelMedia(items: PanelMediaAsset[], fromId: string, toId: string) {
    if (fromId === toId) return items;
    const next = [...items];
    const fromIndex = next.findIndex((item) => item.id === fromId);
    const toIndex = next.findIndex((item) => item.id === toId);
    if (fromIndex === -1 || toIndex === -1) return items;
    const moved = next[fromIndex];
    next[fromIndex] = next[toIndex];
    next[toIndex] = moved;
    return normalizePanelMediaCover(next);
}

function formatPanelMediaBytes(bytes: number) {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatPanelVideoDuration(durationSeconds: number) {
    const safeSeconds = Math.max(0, Math.round(durationSeconds));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function createPanelDocumentAsset(file: File, maxBytes: number): PanelDocumentAsset {
    if (file.size > maxBytes) {
        throw new Error(`El archivo ${file.name} supera el máximo permitido de ${formatPanelMediaBytes(maxBytes)}.`);
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const supported = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']);
    if (!supported.has(ext)) {
        throw new Error('Sube archivos PDF, Word, Excel o PowerPoint.');
    }

    return {
        id: createPanelMediaId(),
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type || 'application/octet-stream',
    };
}

async function createPanelVideoAsset(params: {
    file: File;
    maxBytes: number;
    requiredAspectRatio: number;
    aspectRatioTolerance: number;
}): Promise<PanelVideoAsset> {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const lowerName = params.file.name.toLowerCase();
    const hasAllowedExtension = lowerName.endsWith('.mp4') || lowerName.endsWith('.webm') || lowerName.endsWith('.mov');
    if (!allowedTypes.includes(params.file.type) && !hasAllowedExtension) {
        throw new Error('Sube un video MP4, WEBM o MOV.');
    }
    if (params.file.size > params.maxBytes) {
        throw new Error(`El video no puede pesar más de ${formatPanelMediaBytes(params.maxBytes)}.`);
    }

    const metadata = await loadVideoMetadata(params.file);
    if (metadata.width && metadata.height) {
        const ratio = metadata.width / metadata.height;
        if (Math.abs(ratio - params.requiredAspectRatio) > params.aspectRatioTolerance) {
            throw new Error('El video debe estar en formato 9:16.');
        }
    }

    const dataUrl = await fileToDataUrl(params.file);
    if (!dataUrl) {
        throw new Error('No pudimos leer este video.');
    }

    return {
        id: createPanelMediaId(),
        name: params.file.name,
        dataUrl,
        previewUrl: dataUrl,
        mimeType: params.file.type || 'video/mp4',
        sizeBytes: params.file.size,
        width: metadata.width,
        height: metadata.height,
        durationSeconds: metadata.durationSeconds,
    };
}

function formatPanelVideoResolution(width: number, height: number) {
    if (!width || !height) return 'Resolución no detectada';
    return `${width} x ${height} px`;
}

function InlinePanelIcon(props: { children: React.ReactNode }) {
    return (
        <span
            className="inline-flex h-4 w-4 items-center justify-center"
            aria-hidden="true"
            style={{ color: 'currentColor' }}
        >
            {props.children}
        </span>
    );
}

export function PanelMediaUploader(props: PanelMediaUploaderProps) {
    const {
        items,
        onChange,
        minItems = 1,
        recommendedItems = 8,
        maxItems = 20,
        minWidth = 600,
        minHeight = 400,
        maxWidth = 1800,
        maxHeight = 1400,
        targetBytes = 420_000,
        className,
        dropzoneTitle = 'Fotos',
        helperText,
        emptyHint = 'Arrastra o selecciona',
        guidedSlots = [],
    } = props;
    const orderedItems = useMemo(() => normalizePanelMediaCover(items), [items]);
    const guidedLabels = useMemo(() => guidedSlots.map((slot) => slot.label), [guidedSlots]);
    const itemsRef = useRef(orderedItems);
    const onChangeRef = useRef(onChange);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const dragStateRef = useRef<typeof dragState>(null);
    const dropTargetIdRef = useRef<string | null>(null);
    const tileRefs = useRef(new Map<string, HTMLElement>());
    const dragPointerRef = useRef<{ x: number; y: number } | null>(null);
    const dragFrameRef = useRef<number | null>(null);
    const [fileDragActive, setFileDragActive] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragState, setDragState] = useState<{
        id: string;
        startX: number;
        startY: number;
        active: boolean;
    } | null>(null);
    const [dropTargetId, setDropTargetId] = useState<string | null>(null);

    useEffect(() => {
        itemsRef.current = orderedItems;
    }, [orderedItems]);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        dragStateRef.current = dragState;
    }, [dragState]);

    useEffect(() => {
        dropTargetIdRef.current = dropTargetId;
    }, [dropTargetId]);

    useEffect(() => () => {
        if (dragFrameRef.current != null) {
            window.cancelAnimationFrame(dragFrameRef.current);
        }
    }, []);

    const addFiles = async (fileList: FileList | null) => {
        const files = Array.from(fileList ?? []);
        if (files.length === 0) return;

        const available = Math.max(maxItems - orderedItems.length, 0);
        if (available <= 0) {
            setError(`Puedes cargar hasta ${maxItems} imágenes.`);
            return;
        }

        const selected = files
            .filter((file) => /^image\/(jpeg|jpg|png|webp)$/i.test(file.type))
            .slice(0, available);

        if (selected.length === 0) {
            setError('Sube imágenes JPG, JPEG, PNG o WEBP.');
            return;
        }

        setProcessing(true);
        setError(null);
        const nextItems = [...orderedItems];
        const issues: string[] = [];

        for (const file of selected) {
            try {
                const asset = await optimizeImageToWebp({
                    file,
                    maxWidth,
                    maxHeight,
                    minWidth,
                    minHeight,
                    targetBytes,
                });
                nextItems.push(asset);
            } catch (processingError) {
                issues.push(processingError instanceof Error ? processingError.message : `No se pudo procesar ${file.name}.`);
            }
        }

        setProcessing(false);
        onChange(normalizePanelMediaCover(nextItems));
        if (issues.length > 0) setError(issues[0]);
    };

    const removeItem = (itemId: string) => {
        onChange(normalizePanelMediaCover(orderedItems.filter((item) => item.id !== itemId)));
    };

    const setCover = (itemId: string) => {
        onChange(normalizePanelMediaCover(orderedItems.map((item) => ({ ...item, isCover: item.id === itemId }))));
    };

    const summaryHelper = helperText || `Mínimo ${minItems} · Máximo ${maxItems} · WEBP`;
    const missingRecommended = Math.max(recommendedItems - orderedItems.length, 0);
    const canOrder = orderedItems.length > 1;
    const progressPercent = recommendedItems > 0 ? Math.min((orderedItems.length / recommendedItems) * 100, 100) : 100;

    const clearDraggedTileStyles = (itemId?: string | null) => {
        if (!itemId) return;
        const tile = tileRefs.current.get(itemId);
        if (!tile) return;
        tile.style.removeProperty('transform');
        tile.style.removeProperty('opacity');
        tile.style.removeProperty('box-shadow');
        tile.style.removeProperty('z-index');
        tile.style.removeProperty('transition');
    };

    const scheduleDraggedTilePosition = () => {
        if (dragFrameRef.current != null) return;
        dragFrameRef.current = window.requestAnimationFrame(() => {
            dragFrameRef.current = null;
            const currentDrag = dragStateRef.current;
            const pointer = dragPointerRef.current;
            if (!currentDrag || !currentDrag.active || !pointer) return;
            const tile = tileRefs.current.get(currentDrag.id);
            if (!tile) return;
            const dragX = pointer.x - currentDrag.startX;
            const dragY = pointer.y - currentDrag.startY;
            tile.style.transition = 'none';
            tile.style.transform = `translate3d(${dragX}px, ${dragY}px, 0) scale(1.02)`;
            tile.style.opacity = '0.96';
            tile.style.boxShadow = '0 16px 36px rgba(0,0,0,0.22)';
            tile.style.zIndex = '30';
        });
    };

    useEffect(() => {
        if (!dragState) return;

        if (dragState.active) {
            document.body.style.setProperty('user-select', 'none');
            document.body.style.setProperty('touch-action', 'none');
        }

        const handlePointerMove = (event: PointerEvent) => {
            const currentDrag = dragStateRef.current;
            if (!currentDrag) return;

            dragPointerRef.current = { x: event.clientX, y: event.clientY };

            const distance = Math.hypot(event.clientX - currentDrag.startX, event.clientY - currentDrag.startY);
            if (!currentDrag.active && distance <= 4) {
                if (dropTargetIdRef.current !== null) setDropTargetId(null);
                return;
            }

            if (!currentDrag.active) {
                setDragState((current) => current ? { ...current, active: true } : current);
            }

            scheduleDraggedTilePosition();

            const element = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
            const nextHoverId = element?.closest('[data-panel-media-item-id]')?.getAttribute('data-panel-media-item-id') || null;
            const nextDropId = nextHoverId && nextHoverId !== currentDrag.id ? nextHoverId : null;
            if (dropTargetIdRef.current !== nextDropId) setDropTargetId(nextDropId);
        };

        const handlePointerEnd = () => {
            const currentDrag = dragStateRef.current;
            const currentDropTarget = dropTargetIdRef.current;
            if (currentDrag?.active && currentDrag.id && currentDropTarget && currentDrag.id !== currentDropTarget) {
                const reordered = reorderPanelMedia(itemsRef.current, currentDrag.id, currentDropTarget);
                itemsRef.current = reordered;
                onChangeRef.current(reordered);
            }
            clearDraggedTileStyles(currentDrag?.id);
            dragPointerRef.current = null;
            if (dragFrameRef.current != null) {
                window.cancelAnimationFrame(dragFrameRef.current);
                dragFrameRef.current = null;
            }
            setDragState(null);
            setDropTargetId(null);
            document.body.style.removeProperty('user-select');
            document.body.style.removeProperty('touch-action');
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerEnd);
        window.addEventListener('pointercancel', handlePointerEnd);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerEnd);
            window.removeEventListener('pointercancel', handlePointerEnd);
            document.body.style.removeProperty('user-select');
            document.body.style.removeProperty('touch-action');
        };
    }, [!!dragState]);

    const startPointerDrag = (event: React.PointerEvent<HTMLElement>, item: PanelMediaAsset) => {
        if ((event.target as HTMLElement).closest('[data-panel-media-action="true"]')) return;
        event.preventDefault();
        event.stopPropagation();
        clearDraggedTileStyles(item.id);
        dragPointerRef.current = { x: event.clientX, y: event.clientY };
        setDragState({
            id: item.id,
            startX: event.clientX,
            startY: event.clientY,
            active: false,
        });
        setDropTargetId(null);
    };

    const renderPhotoTile = (item: PanelMediaAsset, index: number) => {
        const label = guidedLabels[index] || (index === 0 ? 'Portada' : `Foto ${index + 1}`);
        const isCover = index === 0;
        const isDragging = dragState?.id === item.id;
        const isActivelyDragging = isDragging && !!dragState?.active;
        const isDropTarget = dropTargetId === item.id && dragState?.id !== item.id;

        return (
            <article
                key={item.id}
                data-panel-media-item-id={item.id}
                ref={(node) => {
                    if (node) tileRefs.current.set(item.id, node);
                    else tileRefs.current.delete(item.id);
                }}
                onPointerDown={(event) => startPointerDrag(event, item)}
                className={joinClasses(
                    'relative overflow-hidden rounded-card border ease-out',
                    isActivelyDragging ? '' : 'transition-[border-color,box-shadow,opacity,transform] duration-150',
                )}
                style={{
                    borderColor: isDropTarget ? '#2563eb' : isCover ? 'var(--border-strong)' : 'var(--border)',
                    background: 'var(--surface)',
                    opacity: isActivelyDragging ? 0.52 : 1,
                    transform: isDropTarget ? 'scale(1.015)' : 'scale(1)',
                    boxShadow: isDropTarget
                        ? '0 0 0 2px rgba(37,99,235,0.16), 0 10px 26px rgba(37,99,235,0.10)'
                        : 'var(--shadow-xs)',
                    cursor: isActivelyDragging ? 'grabbing' : 'grab',
                    touchAction: 'none',
                    willChange: isActivelyDragging ? 'opacity' : 'auto',
                    zIndex: isActivelyDragging ? 5 : 1,
                    pointerEvents: isActivelyDragging ? 'none' : 'auto',
                }}
            >
                <div className="relative aspect-4/3 overflow-hidden rounded-card">
                    {item.previewUrl ? (
                        <img
                            src={item.previewUrl}
                            alt={label}
                            draggable={false}
                            onDragStart={(event) => event.preventDefault()}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-center text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                            Resube esta foto
                        </div>
                    )}

                    <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                        {isCover ? (
                            <span
                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
                                style={{ background: 'rgba(17,24,39,0.82)', color: '#ffffff' }}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M12 17.3L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.3Z" />
                                </svg>
                                Portada
                            </span>
                        ) : (
                            <span
                                className="rounded-full px-2 py-1 text-[10px] font-medium"
                                style={{ background: 'rgba(17,24,39,0.36)', color: 'rgba(255,255,255,0.78)' }}
                            >
                                {label}
                            </span>
                        )}
                        <button
                            type="button"
                            aria-label={`Eliminar ${label}`}
                            data-panel-media-action="true"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full"
                            style={{ background: 'rgba(17,24,39,0.76)', color: '#ffffff' }}
                            onClick={() => removeItem(item.id)}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M4 7H20M9 7V5.5C9 4.67157 9.67157 4 10.5 4H13.5C14.3284 4 15 4.67157 15 5.5V7M10 11V17M14 11V17M6.5 7L7.2 18.2C7.26511 19.2417 8.12888 20.05 9.17252 20.05H14.8275C15.8711 20.05 16.7349 19.2417 16.8 18.2L17.5 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3" style={{ background: 'linear-gradient(180deg, rgba(17,24,39,0), rgba(17,24,39,0.74))' }}>
                        <p className="min-w-0 truncate text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>
                            {item.width} x {item.height} · {formatPanelMediaBytes(item.sizeBytes)}
                        </p>
                        {!isCover ? (
                            <button
                                type="button"
                                data-panel-media-action="true"
                                className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                                style={{ background: 'rgba(255,255,255,0.92)', color: '#111827' }}
                                onClick={() => setCover(item.id)}
                            >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M12 17.3L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.3Z" />
                                </svg>
                                Portada
                            </button>
                        ) : null}
                    </div>

                    {isDropTarget ? (
                        <div
                            className="absolute inset-3 rounded-card border-2 border-dashed"
                            style={{
                                borderColor: '#2563eb',
                                background: 'rgba(37,99,235,0.10)',
                            }}
                        />
                    ) : null}

                    {isActivelyDragging || isDropTarget ? (
                        <div className="absolute inset-x-3 bottom-14 rounded-full px-3 py-1 text-[11px] font-medium" style={{ background: 'rgba(17,24,39,0.76)', color: '#ffffff' }}>
                            {isActivelyDragging ? 'Moviendo…' : isDropTarget ? 'Suelta aquí' : 'Arrastra'}
                        </div>
                    ) : null}
                </div>
            </article>
        );
    };

    const renderPlaceholderTile = (label: string, index: number) => (
        <div
            key={`placeholder-${label}-${index}`}
            className="relative aspect-4/3 rounded-card border border-dashed p-4"
            style={{
                borderColor: 'color-mix(in oklab, var(--border) 86%, transparent)',
                background: 'color-mix(in oklab, var(--surface) 96%, var(--bg-subtle) 4%)',
            }}
        >
            <span className="text-[11px] font-medium" style={{ color: 'var(--fg-muted)' }}>{label}</span>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-[20px]" style={{ background: 'color-mix(in oklab, var(--bg-subtle) 78%, transparent)', color: 'var(--fg-muted)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M4.5 18.5L8.5 13.5L12 17L14 15L19.5 20.5M7 8.5H7.01M6.8 20.5H17.2C18.8802 20.5 19.7202 20.5 20.362 20.173C20.9265 19.8854 21.3854 19.4265 21.673 18.862C22 18.2202 22 17.3802 22 15.7V8.3C22 6.61984 22 5.77976 21.673 5.13803C21.3854 4.57354 20.9265 4.1146 20.362 3.82698C19.7202 3.5 18.8802 3.5 17.2 3.5H6.8C5.11984 3.5 4.27976 3.5 3.63803 3.82698C3.07354 4.1146 2.6146 4.57354 2.32698 5.13803C2 5.77976 2 6.61984 2 8.3V15.7C2 17.3802 2 18.2202 2.32698 18.862C2.6146 19.4265 3.07354 19.8854 3.63803 20.173C4.27976 20.5 5.11984 20.5 6.8 20.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
                <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Pendiente</span>
            </div>
        </div>
    );

    return (
        <div className={joinClasses('space-y-4', className)}>
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(event) => {
                    void addFiles(event.target.files);
                    if (inputRef.current) inputRef.current.value = '';
                }}
            />

            <div
                className="space-y-5"
                onDragOver={(event) => {
                    event.preventDefault();
                    setFileDragActive(true);
                }}
                onDragEnter={(event) => {
                    event.preventDefault();
                    setFileDragActive(true);
                }}
                onDragLeave={(event) => {
                    event.preventDefault();
                    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                    setFileDragActive(false);
                }}
                onDrop={(event) => {
                    event.preventDefault();
                    setFileDragActive(false);
                    void addFiles(event.dataTransfer.files);
                }}
            >
                <div className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{dropzoneTitle}</p>
                            <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>{summaryHelper}</p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}>
                            <span>{orderedItems.length} / {maxItems}</span>
                            <span aria-hidden="true">•</span>
                            <span>{orderedItems.length >= minItems ? 'Listo' : `Falta ${minItems - orderedItems.length}`}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                            <span>
                                {missingRecommended > 0 ? `Faltan ${missingRecommended} recomendadas` : 'Cobertura recomendada completa'}
                            </span>
                            <span>Portada = primera foto</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--bg-muted)' }}>
                            <div
                                className="h-full rounded-full transition-[width] duration-200"
                                style={{
                                    width: `${progressPercent}%`,
                                    background: 'var(--fg)',
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                        {canOrder ? 'Arrastra y suelta para ordenar' : 'La primera imagen será la portada'}
                    </p>
                </div>

                <div className="panel-media-grid">
                    <button
                        type="button"
                        className="relative aspect-4/3 rounded-card border border-dashed p-4 text-left transition-colors"
                        style={{
                            borderColor: fileDragActive ? 'var(--border-strong)' : 'color-mix(in oklab, var(--border) 86%, transparent)',
                            background: 'color-mix(in oklab, var(--surface) 96%, var(--bg-subtle) 4%)',
                        }}
                        onClick={() => inputRef.current?.click()}
                    >
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            <span
                                className="inline-flex h-14 w-14 items-center justify-center rounded-[20px]"
                                style={{
                                    background: fileDragActive ? 'var(--surface)' : 'color-mix(in oklab, var(--bg-subtle) 78%, transparent)',
                                    color: 'var(--fg-muted)',
                                }}
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M12 16V7M12 7L8.5 10.5M12 7L15.5 10.5M5 17.5V18.5C5 19.6046 5.89543 20.5 7 20.5H17C18.1046 20.5 19 19.6046 19 18.5V17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                            <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                {processing ? 'Procesando…' : emptyHint}
                            </span>
                        </div>
                    </button>

                    {orderedItems.map((item, index) => renderPhotoTile(item, index))}
                    {guidedLabels.slice(orderedItems.length).map((label, index) => renderPlaceholderTile(label, index))}
                </div>
            </div>

            {error ? <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p> : null}
        </div>
    );
}
export function PanelVideoUploader(props: PanelVideoUploaderProps) {
    const {
        asset,
        onChange,
        className,
        title = 'Video para Descubre',
        description = 'Opcional · clip vertical 9:16 para Descubre.',
        helperText = 'MP4, WEBM o MOV · hasta 10 MB · 9:16.',
        maxBytes = 10 * 1024 * 1024,
        requiredAspectRatio = 9 / 16,
        aspectRatioTolerance = 0.06,
    } = props;
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [dragging, setDragging] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadVideo = async (fileList: FileList | null) => {
        const file = fileList?.[0];
        if (!file) return;
        setProcessing(true);
        setError(null);
        try {
            const next = await createPanelVideoAsset({
                file,
                maxBytes,
                requiredAspectRatio,
                aspectRatioTolerance,
            });
            onChange(next);
        } catch (uploadError) {
            setError(uploadError instanceof Error ? uploadError.message : 'No se pudo procesar el video.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className={joinClasses('space-y-3', className)}>
            <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{title}</p>
                {description ? <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>{description}</p> : null}
            </div>

            <div
                onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                }}
                onDragEnter={(event) => {
                    event.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={(event) => {
                    event.preventDefault();
                    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                    setDragging(false);
                }}
                onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    void loadVideo(event.dataTransfer.files);
                }}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={(event) => {
                        void loadVideo(event.target.files);
                        if (inputRef.current) inputRef.current.value = '';
                    }}
                />

                {asset ? (
                    <div className="space-y-3">
                        <div className="rounded-card border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                                <div className="shrink-0 rounded-card border p-1.5 shadow-sm" style={{ width: '116px', borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                    <div className="relative w-[116px] overflow-hidden rounded-card border" style={{ borderColor: 'color-mix(in oklab, var(--border) 80%, transparent)', background: '#020617' }}>
                                        <video
                                            src={asset.previewUrl}
                                            muted
                                            playsInline
                                            preload="metadata"
                                            className="aspect-[9/16] h-auto w-full bg-black object-cover"
                                        />
                                        <div className="absolute inset-x-0 top-0 h-14" style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.55), rgba(15,23,42,0))' }} />
                                        <div className="absolute left-1/2 top-2 h-1.5 w-8 -translate-x-1/2 rounded-full" style={{ background: 'rgba(255,255,255,0.24)' }} />
                                        <div className="absolute inset-x-3 top-6 flex items-center justify-between text-[8px] font-medium text-white/85">
                                            <span>Descubre</span>
                                            <span>Preview</span>
                                        </div>
                                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full border text-white" style={{ borderColor: 'rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.3)' }}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                                    <path d="M8.5 6.5V17.5L17 12L8.5 6.5Z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--fg)' }}>{asset.name}</p>
                                    <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                        {formatPanelVideoResolution(asset.width, asset.height)} · {formatPanelVideoDuration(asset.durationSeconds)} · {formatPanelMediaBytes(asset.sizeBytes)}
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <PanelButton type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
                                            Reemplazar
                                        </PanelButton>
                                        <PanelButton type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
                                            Quitar
                                        </PanelButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div
                        className="w-full overflow-hidden rounded-card border-2 border-dashed p-4 transition-colors sm:p-5"
                        style={{
                            borderColor: dragging ? 'var(--border-strong)' : 'var(--border)',
                            background: dragging ? 'color-mix(in oklab, var(--surface) 98%, var(--bg-subtle) 2%)' : 'var(--surface)',
                        }}
                    >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
                            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M15 10L19 7V17L15 14M5 19H13C14.1046 19 15 18.1046 15 17V7C15 5.89543 14.1046 5 13 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                    {processing ? 'Procesando video...' : 'Subir clip vertical 9:16'}
                                </p>
                                <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    Material promocional vertical para aparecer en el feed Descubre.
                                </p>
                                <p className="mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>{helperText}</p>
                            </div>
                            <div className="flex shrink-0 justify-start sm:ml-auto sm:justify-end">
                                <PanelButton type="button" variant="secondary" disabled={processing} onClick={() => inputRef.current?.click()}>
                                    {processing ? 'Procesando...' : 'Seleccionar video'}
                                </PanelButton>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}
        </div>
    );
}

export function PanelDocumentUploader(props: PanelDocumentUploaderProps) {
    const {
        items,
        onChange,
        className,
        title = 'Documentos y PDF',
        description = 'Adjunta documentos de apoyo, legales o comerciales.',
        helperText = 'PDF, Word, Excel o PowerPoint · hasta 8 archivos · máximo 15 MB cada uno.',
        maxItems = 8,
        maxBytes = 15 * 1024 * 1024,
    } = props;
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addFiles = (fileList: FileList | null) => {
        const files = Array.from(fileList ?? []);
        if (files.length === 0) return;
        const available = Math.max(maxItems - items.length, 0);
        if (available <= 0) {
            setError(`Puedes cargar hasta ${maxItems} documentos.`);
            return;
        }

        const nextItems = [...items];
        try {
            files.slice(0, available).forEach((file) => {
                nextItems.push(createPanelDocumentAsset(file, maxBytes));
            });
            setError(null);
            onChange(nextItems);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'No se pudo procesar el archivo.');
        }
    };

    const removeItem = (id: string) => onChange(items.filter((item) => item.id !== id));

    return (
        <div className={joinClasses('space-y-3', className)}>
            <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{title}</p>
                <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>{description}</p>
            </div>

            <div
                className="space-y-3"
                onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                }}
                onDragEnter={(event) => {
                    event.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={(event) => {
                    event.preventDefault();
                    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                    setDragging(false);
                }}
                onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    addFiles(event.dataTransfer.files);
                }}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                        addFiles(event.target.files);
                        if (inputRef.current) inputRef.current.value = '';
                    }}
                />

                <div
                    className="w-full overflow-hidden rounded-card border-2 border-dashed p-4 transition-colors sm:p-5"
                    style={{
                        borderColor: dragging ? 'var(--border-strong)' : 'var(--border)',
                        background: dragging ? 'color-mix(in oklab, var(--surface) 98%, var(--bg-subtle) 2%)' : 'var(--surface)',
                    }}
                >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
                        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M14 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V8L14 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M14 3V8H19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M9 13H15M9 17H13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </span>

                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Agregar documentos</p>
                            <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                Archivos de apoyo, legales o comerciales para complementar el aviso.
                            </p>
                            <p className="mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                {helperText} · {items.length} / {maxItems}
                            </p>
                        </div>

                        <div className="flex shrink-0 items-center justify-start sm:ml-auto sm:justify-end">
                            <PanelButton type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
                                Seleccionar archivos
                            </PanelButton>
                        </div>
                    </div>
                </div>

                {items.length > 0 ? (
                    <div className="space-y-2">
                        {items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-3 rounded-card border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium" style={{ color: 'var(--fg)' }}>{item.name}</p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{formatPanelMediaBytes(item.sizeBytes)}</p>
                                </div>
                                <PanelButton type="button" variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                                    Quitar
                                </PanelButton>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>

            {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}
        </div>
    );
}

export function PanelListHeader(props: PanelListHeaderProps) {
    const { children, className } = props;

    return (
        <div
            className={joinClasses('hidden md:grid px-4 py-2.5 text-xs font-medium uppercase tracking-wider', className)}
            style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}
        >
            {children}
        </div>
    );
}

export function PanelListRow(props: PanelListRowProps) {
    const {
        children,
        className,
        divider = true,
        tone = 'surface',
        hoverTone = 'subtle',
    } = props;
    const [hovered, setHovered] = useState(false);

    const baseBackground = tone === 'subtle' ? 'var(--bg-subtle)' : 'var(--surface)';
    const nextBackground = hoverTone === 'muted'
        ? 'var(--bg-muted)'
        : hoverTone === 'subtle'
            ? 'var(--bg-subtle)'
            : baseBackground;

    return (
        <div
            className={className}
            style={{
                background: hovered ? nextBackground : baseBackground,
                borderTop: divider ? '1px solid var(--border)' : 'none',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {children}
        </div>
    );
}

export function PanelPageHeader(props: PanelPageHeaderProps) {
    const { title, description, actions, backHref, className } = props;

    return (
        <div className={joinClasses('mb-5 lg:mb-6', className)}>
            {backHref ? (
                <a
                    href={backHref}
                    className="inline-flex items-center gap-1 text-xs font-medium mb-3 transition-colors"
                    style={{ color: 'var(--fg-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-muted)'; }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                    Configuración
                </a>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>
                        {title}
                    </h1>
                    {description ? (
                        <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                            {description}
                        </p>
                    ) : null}
                </div>
                {actions ? <div className="flex items-center gap-2 flex-wrap sm:justify-end">{actions}</div> : null}
            </div>
        </div>
    );
}

export function PanelConfigPage(props: PanelConfigPageProps) {
    const { title, description, sections, extras, showProgress = false, loading = false, className } = props;

    return (
        <div className={joinClasses('container-app panel-page py-4 lg:py-8 max-w-2xl', className)}>
            <PanelPageHeader title={title} description={description} />

            <div className="space-y-6">
                <PanelConfigSection title="Configuración" items={sections} showProgress={showProgress} loading={loading} />
                {extras ? <PanelConfigSection title="Opciones adicionales" items={extras} loading={loading} /> : null}
            </div>
        </div>
    );
}

export function PanelBlockHeader(props: PanelBlockHeaderProps) {
    const { title, description, actions, className } = props;

    return (
        <div className={joinClasses('mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
            <div className="min-w-0">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                    {title}
                </h2>
                {description ? (
                    <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                        {description}
                    </p>
                ) : null}
            </div>
            {actions ? <div className="flex items-center gap-2 flex-wrap sm:justify-end">{actions}</div> : null}
        </div>
    );
}

export function PanelAccountProfileCard(props: PanelAccountProfileCardProps) {
    const {
        name = 'Usuario Simple',
        email = 'Sin correo',
        role,
        subtitle,
        className,
    } = props;

    return (
        <PanelCard className={joinClasses('space-y-4', className)} size="md">
            <div className="flex items-center gap-4">
                <div
                    className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                >
                    <IconUser size={24} />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{name}</p>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{email}</p>
                    {role ? (
                        <p className="text-xs uppercase tracking-[0.16em] mt-1" style={{ color: 'var(--fg-muted)' }}>
                            {role}
                        </p>
                    ) : null}
                </div>
            </div>
            {subtitle ? (
                <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>{subtitle}</p>
            ) : null}
        </PanelCard>
    );
}

export function PanelNotice(props: PanelNoticeProps) {
    const { children, className, tone = 'neutral' } = props;

    const toneStyle = tone === 'success'
        ? { borderColor: 'rgba(4,120,87,0.25)', background: 'rgba(4,120,87,0.06)', color: '#047857' }
        : tone === 'warning'
            ? { borderColor: 'rgba(180,83,9,0.22)', background: 'rgba(180,83,9,0.06)', color: '#92400e' }
            : tone === 'error'
                ? { borderColor: 'rgba(185,28,28,0.20)', background: 'rgba(185,28,28,0.06)', color: '#b91c1c' }
                : { borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg-secondary)' };

    return (
        <div className={joinClasses('rounded-card border px-4 py-3 text-sm', className)} style={toneStyle}>
            {children}
        </div>
    );
}

export function PanelField(props: PanelFieldProps) {
    const { label, hint, required, children, className } = props;
    return (
        <div className={joinClasses('flex flex-col gap-1.5', className)}>
            <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
                {label}{required ? <span style={{ color: 'var(--color-error)' }} className="ml-0.5">*</span> : null}
            </label>
            {children}
            {hint ? <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{hint}</p> : null}
        </div>
    );
}

export function PanelActions(props: PanelActionsProps) {
    const { left, right, className, rightClassName } = props;

    return (
        <div className={joinClasses('mt-5 flex items-center justify-between gap-3 flex-wrap', className)}>
            <div className="flex items-center gap-2 flex-wrap">
                {left}
            </div>
            <div className={joinClasses('flex items-center gap-2 flex-wrap justify-end', rightClassName)}>
                {right}
            </div>
        </div>
    );
}

export function PanelStatCard(props: PanelStatCardProps) {
    const { label, value, meta, icon, trend } = props;
    const trendTone = trend?.tone ?? 'neutral';
    const trendColor = trendTone === 'positive'
        ? '#166534'
        : trendTone === 'negative'
            ? '#991b1b'
            : 'var(--fg-secondary)';
    const trendBg = trendTone === 'positive'
        ? 'rgba(22,163,74,0.12)'
        : trendTone === 'negative'
        ? 'rgba(239,68,68,0.10)'
        : 'var(--bg-muted)';

    return (
        <div className="rounded-card border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="mb-3 flex items-center justify-between gap-3">
                {icon ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                        {icon}
                    </div>
                ) : <span />}
                {trend ? (
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium" style={{ background: trendBg, color: trendColor }}>
                        {trend.label}
                    </span>
                ) : null}
            </div>
            <p className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>{value}</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>{label}</p>
            {meta ? <p className="mt-2 text-xs" style={{ color: 'var(--fg-secondary)' }}>{meta}</p> : null}
        </div>
    );
}

export function PanelEmptyState(props: PanelEmptyStateProps) {
    const { title = 'Sin resultados', description, action, className } = props;

    return (
        <div className={joinClasses('rounded-card border p-6 md:p-7 text-center', className)} style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <p className="text-base font-semibold" style={{ color: 'var(--fg)' }}>{title}</p>
            <p className="text-sm mt-2" style={{ color: 'var(--fg-secondary)' }}>{description}</p>
            {action ? <div className="mt-4 flex items-center justify-center">{action}</div> : null}
        </div>
    );
}

function CompactSectionHeader(props: { title: string; hint?: string }) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--fg-muted)' }}>
                {props.title}
            </span>
            <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
            {props.hint ? (
                <span className="text-[11px] whitespace-nowrap" style={{ color: 'var(--fg-muted)' }}>
                    {props.hint}
                </span>
            ) : null}
        </div>
    );
}

// PanelBottomNav — mobile-first bottom navigation for authenticated panels.
// Consumers supply their framework LinkComponent (e.g. next/link) so this
// component stays framework-agnostic while still supporting client routing.
// ─────────────────────────────────────────────────────────────────────────────

export type PanelBottomNavItem = {
    href: string;
    label: string;
    icon: ComponentType<{ size?: number; stroke?: number; style?: CSSProperties }>;
    active?: boolean;
    highlight?: boolean;
};

type PanelBottomNavLinkProps = {
    href: string;
    className?: string;
    'aria-current'?: 'page' | undefined;
    children: ReactNode;
};

export type PanelBottomNavProps = {
    items: PanelBottomNavItem[];
    LinkComponent: ComponentType<PanelBottomNavLinkProps>;
    moreLabel?: string;
    moreActive?: boolean;
    onMoreClick?: () => void;
    ariaLabel?: string;
    highlightStyle?: CSSProperties;
};

export function PanelBottomNav({
    items,
    LinkComponent,
    moreLabel = 'Más',
    moreActive = false,
    onMoreClick,
    ariaLabel = 'Navegación del panel',
    highlightStyle,
}: PanelBottomNavProps) {
    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-40 border-t lg:hidden"
            style={{
                background: 'color-mix(in oklab, var(--surface) 86%, transparent)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                borderColor: 'var(--border)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
            aria-label={ariaLabel}
        >
            <div className="flex items-center justify-around h-16 px-2">
                {items.map((item) => {
                    const Icon = item.icon;
                    const active = !!item.active;

                    if (item.highlight) {
                        return (
                            <LinkComponent
                                key={item.href}
                                href={item.href}
                                className="flex flex-col items-center justify-center flex-1 h-full"
                                aria-current={active ? 'page' : undefined}
                            >
                                <span
                                    className="w-11 h-11 rounded-full flex items-center justify-center -mt-1"
                                    style={{
                                        background: 'var(--accent)',
                                        color: 'var(--accent-contrast, #fff)',
                                        boxShadow: highlightStyle?.boxShadow ?? '0 4px 12px color-mix(in oklab, var(--accent) 25%, transparent)',
                                        ...highlightStyle,
                                    }}
                                >
                                    <Icon size={22} stroke={2} />
                                </span>
                                <span
                                    className="text-[10px] mt-0.5"
                                    style={{
                                        color: active ? 'var(--accent)' : 'var(--fg-muted)',
                                        fontWeight: active ? 500 : 400,
                                    }}
                                >
                                    {item.label}
                                </span>
                            </LinkComponent>
                        );
                    }

                    return (
                        <LinkComponent
                            key={item.href}
                            href={item.href}
                            className="flex flex-col items-center justify-center flex-1 h-full"
                            aria-current={active ? 'page' : undefined}
                        >
                            <Icon
                                size={22}
                                stroke={active ? 2 : 1.5}
                                style={{ color: active ? 'var(--accent)' : 'var(--fg-muted)' }}
                            />
                            <span
                                className="text-[11px] mt-0.5"
                                style={{
                                    color: active ? 'var(--accent)' : 'var(--fg-muted)',
                                    fontWeight: active ? 500 : 400,
                                }}
                            >
                                {item.label}
                            </span>
                        </LinkComponent>
                    );
                })}

                {onMoreClick ? (
                    <button
                        type="button"
                        onClick={onMoreClick}
                        className="flex flex-col items-center justify-center flex-1 h-full"
                        aria-label={moreLabel}
                    >
                        <IconDotsCircleHorizontal
                            size={22}
                            stroke={moreActive ? 2 : 1.5}
                            style={{ color: moreActive ? 'var(--accent)' : 'var(--fg-muted)' }}
                        />
                        <span
                            className="text-[11px] mt-0.5"
                            style={{
                                color: moreActive ? 'var(--accent)' : 'var(--fg-muted)',
                                fontWeight: moreActive ? 500 : 400,
                            }}
                        >
                            {moreLabel}
                        </span>
                    </button>
                ) : null}
            </div>
        </nav>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ErrorView — shared full-screen error/not-found view used by Next.js
// error.tsx, global-error.tsx and not-found.tsx files across all apps.
// Framework-agnostic: uses CSS variables for theming and accepts a caller-
// provided primaryAction (which can be a Link, button, or anchor).
// ─────────────────────────────────────────────────────────────────────────────

export type ErrorViewProps = {
    code?: string;
    title: string;
    description?: string;
    primaryAction: ReactNode;
    secondaryAction?: ReactNode;
    errorDigest?: string;
};

export function ErrorView({
    code,
    title,
    description,
    primaryAction,
    secondaryAction,
    errorDigest,
}: ErrorViewProps) {
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center px-4 py-10 text-center"
            style={{ background: 'var(--bg)' }}
        >
            {code ? (
                <p className="text-5xl sm:text-6xl font-bold mb-3" style={{ color: 'var(--accent)' }}>
                    {code}
                </p>
            ) : null}
            <h1 className="text-xl sm:text-2xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>
                {title}
            </h1>
            {description ? (
                <p className="text-sm mb-8 max-w-sm" style={{ color: 'var(--fg-muted)' }}>
                    {description}
                </p>
            ) : <div className="mb-8" />}
            <div className="flex flex-col sm:flex-row items-center gap-3">
                {primaryAction}
                {secondaryAction}
            </div>
            {errorDigest ? (
                <p className="mt-6 text-[10px] font-mono" style={{ color: 'var(--fg-muted)' }}>
                    ref: {errorDigest}
                </p>
            ) : null}
        </div>
    );
}

export { default as PublicListingCard } from './listing-card/public-listing-card';
export { default as OwnerListingCard } from './listing-card/owner-listing-card';
export { default as FeaturedCardSwiper } from './listing-card/featured-card-swiper';
export type {
    ListingAccent,
    ListingBadge,
    ListingBadgeTone,
    ListingEngagement,
    ListingImage,
    ListingMode,
    ListingPrice,
    ListingSellerRef,
    ListingVariant,
    OwnerListingAction,
    OwnerListingCardProps,
    OwnerListingStatus,
    PublicListingCardProps,
} from './listing-card/types';

// Panel Config Section
export type PanelConfigSectionItem = {
    key: string;
    title: string;
    description?: string;
    icon?: React.ReactNode;
    href?: string;
    onClick?: () => void;
    disabled?: boolean;
    done?: boolean;
    required?: boolean;
    badge?: string;
};

export type PanelConfigSectionProps = {
    title: string;
    items: PanelConfigSectionItem[];
    className?: string;
    showProgress?: boolean;
    loading?: boolean;
};

export type PanelConfigPageProps = {
    title: string;
    description?: string;
    sections: PanelConfigSectionItem[];
    extras?: PanelConfigSectionItem[];
    showProgress?: boolean;
    loading?: boolean;
    className?: string;
};

export function PanelConfigSection(props: PanelConfigSectionProps) {
    const { title, items, className, showProgress = false, loading = false } = props;

    const requiredItems = items.filter((item) => item.required !== false);
    const completedRequired = requiredItems.filter((item) => item.done).length;
    const allReady = requiredItems.length > 0 && completedRequired === requiredItems.length;

    if (loading) {
        return (
            <div className={joinClasses('space-y-3', className)}>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                    {title}
                </h3>
                <div className="grid grid-cols-1 gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-18 rounded-card animate-pulse" style={{ background: 'var(--border)' }} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={joinClasses('space-y-3', className)}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                {title}
            </h3>

            {/* Progress bar — solo si está habilitado y no está todo completo */}
            {showProgress && !loading && !allReady && requiredItems.length > 0 && (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
                            {completedRequired} de {requiredItems.length} secciones esenciales
                        </span>
                        <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                            {Math.round((completedRequired / requiredItems.length) * 100)}%
                        </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${(completedRequired / requiredItems.length) * 100}%`,
                                background: 'var(--accent)',
                            }}
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-2">
                {items.map((item) => {
                    const isRequired = item.required !== false;
                    const isDone = Boolean(item.done);
                    const pendingRequired = isRequired && !isDone;

                    const content = (
                        <div className="flex items-center gap-3 p-3 rounded-xl border transition-colors hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]" style={{ borderColor: pendingRequired ? 'var(--accent-border)' : 'var(--border)', background: pendingRequired ? 'var(--accent-soft)' : 'var(--surface)' }}>
                            {/* Icono de estado o icono normal */}
                            <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                                style={{
                                    background: isDone ? 'var(--accent)' : 'var(--bg-muted)',
                                    color: isDone ? '#fff' : 'var(--fg-muted)',
                                }}
                            >
                                {isDone ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                ) : item.icon ? (
                                    item.icon
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                        {item.title}
                                    </p>
                                    {!isDone && !isRequired && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                            Opcional
                                        </span>
                                    )}
                                    {item.badge && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                                {item.description && (
                                    <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                                        {item.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    );

                    if (item.href) {
                        return (
                            <a
                                key={item.key}
                                href={item.href}
                                className="block"
                                style={{ pointerEvents: item.disabled ? 'none' : 'auto', opacity: item.disabled ? 0.6 : 1 }}
                            >
                                {content}
                            </a>
                        );
                    }

                    return (
                        <button
                            key={item.key}
                            type="button"
                            onClick={item.onClick}
                            disabled={item.disabled}
                            className="block w-full text-left"
                            style={{ pointerEvents: item.disabled ? 'none' : 'auto', opacity: item.disabled ? 0.6 : 1 }}
                        >
                            {content}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// Sidebar
export { Sidebar, AppSidebar, type NavItem, type UserInfo, type SidebarProps, type AppSidebarProps } from './sidebar/app-sidebar';
export { PanelShell, type PanelShellProps } from './panel/panel-shell';
export { resolveActiveNavHref, cleanPanelPath } from './panel/resolve-active-nav';
export { PublicProfileEditor, type PublicProfileEditorProps, type PublicProfileVertical } from './panel/public-profile-editor';
export { AvatarUpload, type AvatarUploadConfig, type AvatarUploadProps } from './avatar-upload';
export { PanelAddressesPage } from './address-book/panel-addresses-page';
export { CrmTeamSettingsManager, type CrmTeamSettingsManagerProps } from './panel/crm-team-settings-manager';
export { CrmModalShell, type CrmModalShellProps } from './panel/crm-modal-shell';
export {
    SubscriptionManager,
    type SubscriptionManagerProps,
    type SubscriptionManagerPayments,
} from './panel/subscription-manager';
export {
    InstagramIntegrationCard,
    type InstagramIntegrationCardProps,
    type InstagramIntegrationStatus,
} from './integrations/instagram-integration-card';
export { MarketplaceFooter, type MarketplaceFooterProps } from './layout/marketplace-footer';
export { FeaturedBoostSliderSection, type FeaturedBoostSliderSectionProps, type FeaturedBoostTab } from './featured/featured-boost-slider-section';
export { SiteInfoPage, type SiteInfoPageData, type SiteInfoSection } from './content/site-info-page';
export {
    PublicProfileShell,
    PublicProfileLoadingSkeleton,
    PUBLIC_PROFILE_DAY_LABELS,
    initialsFromPublicProfileName,
    formatPublicProfileTime,
    getPublicProfileTodayState,
    type PublicProfileShellProps,
    type PublicProfileShellData,
    type PublicProfileShellTeamMember,
    type PublicProfileDay,
    type PublicProfileTodayState,
} from './public-profile/public-profile-shell';
