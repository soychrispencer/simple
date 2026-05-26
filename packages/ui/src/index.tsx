'use client';

import type { ComponentType, CSSProperties, ReactNode } from 'react';
import { IconBuildingSkyscraper, IconCalendar, IconConfetti, IconSteeringWheel } from '@tabler/icons-react';
import clsx from 'clsx';
import { getSimpleAppBrand, type SimpleAppId } from '@simple/config';
export * from './modern-select';

// Deuda técnica: Google Places Autocomplete (API clásica). Migrar a PlaceAutocompleteElement cuando actualicemos la integración.
import { joinClasses } from './shared/join-classes';
import {
    PanelBlockHeader,
    PanelChoiceCard,
    PanelNotice,
    PanelStatusBadge,
    PanelSwitch,
} from './panel/panel-primitives';
import type {
    PanelBlockHeaderProps,
    PanelChoiceCardProps,
    PanelNoticeProps,
    PanelStatusBadgeProps,
    PanelSwitchProps,
} from './panel/panel-primitives';
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
export {
    PanelBlockHeader,
    PanelChoiceCard,
    PanelNotice,
    PanelStatusBadge,
    PanelSwitch,
};
export type {
    PanelBlockHeaderProps,
    PanelChoiceCardProps,
    PanelNoticeProps,
    PanelStatusBadgeProps,
    PanelSwitchProps,
};
export {
    PanelBottomNav,
    PanelPillNav,
    PanelSearchField,
    PanelSegmentedToggle,
    PanelStepNav,
    type PanelBottomNavItem,
    type PanelBottomNavProps,
    type PanelPillNavItem,
    type PanelPillNavProps,
    type PanelSearchFieldProps,
    type PanelSegmentedToggleItem,
    type PanelSegmentedToggleProps,
    type PanelStepNavItem,
    type PanelStepNavProps,
} from './panel/panel-navigation';
export {
    PanelAccountProfileCard,
    PanelActions,
    PanelEmptyState,
    PanelField,
    PanelIconButton,
    PanelList,
    PanelListHeader,
    PanelListRow,
    PanelPageHeader,
    PanelStatCard,
    PanelSummaryCard,
    type PanelAccountProfileCardProps,
    type PanelActionsProps,
    type PanelEmptyStateProps,
    type PanelFieldProps,
    type PanelIconButtonProps,
    type PanelListHeaderProps,
    type PanelListProps,
    type PanelListRowProps,
    type PanelPageHeaderProps,
    type PanelStatCardProps,
    type PanelSummaryCardProps,
    type PanelSummaryRowProps,
} from './panel/panel-display';
export {
    PanelConfigPage,
    PanelConfigSection,
    type PanelConfigPageProps,
    type PanelConfigSectionItem,
    type PanelConfigSectionProps,
} from './panel/panel-config-section';

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


export {
    PanelDocumentUploader,
    PanelMediaUploader,
    PanelVideoUploader,
    type PanelDocumentAsset,
    type PanelDocumentUploaderProps,
    type PanelMediaAsset,
    type PanelMediaUploaderProps,
    type PanelVideoAsset,
    type PanelVideoUploaderProps,
} from './panel/panel-uploaders';
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

// Sidebar
export { Sidebar, AppSidebar, type NavItem, type UserInfo, type SidebarProps, type AppSidebarProps } from './sidebar/app-sidebar';
export { PanelShell, type PanelShellProps } from './panel/panel-shell';
export { PanelConfirmDialog, type PanelConfirmDialogProps } from './panel/panel-confirm-dialog';
export {
    PanelConfirmProvider,
    usePanelConfirm,
    type PanelConfirmOptions,
} from './panel/panel-confirm-provider';
export {
    PanelPersonalDataList,
    PanelPersonalDataRow,
    type PanelPersonalDataAction,
    type PanelPersonalDataRowProps,
} from './panel/panel-personal-data-list.js';
export { resolveActiveNavHref, cleanPanelPath } from './panel/resolve-active-nav';
export { PublicProfileEditor, type PublicProfileEditorProps, type PublicProfileVertical } from './panel/public-profile-editor';
export { AvatarUpload, type AvatarUploadConfig, type AvatarUploadHandle, type AvatarUploadProps } from './avatar-upload';
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
