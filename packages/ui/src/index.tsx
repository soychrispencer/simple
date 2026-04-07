import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { AddressBookEntry, AddressBookKind, ListingLocation, ListingLocationVisibilityMode } from '@simple/types';
import { applyAddressBookEntryToLocation, createEmptyListingLocation, patchListingLocation } from '@simple/types';

type SelectOption = {
    value: string;
    label: string;
    disabled?: boolean;
};

type FieldErrorMap = Partial<Record<'regionId' | 'communeId' | 'sourceAddressId' | 'addressLine1', string>>;

type VisibilityOption = {
    value: ListingLocationVisibilityMode;
    label: string;
};

type ListingLocationEditorProps = {
    title?: string;
    description?: string;
    showHeader?: boolean;
    framed?: boolean;
    simpleMode?: boolean;
    location: ListingLocation;
    onChange: (next: ListingLocation) => void;
    regions: SelectOption[];
    communes: SelectOption[];
    allCommunes?: SelectOption[];
    addressBook: AddressBookEntry[];
    addressBookLoading?: boolean;
    errors?: FieldErrorMap;
    allowAreaOnly?: boolean;
    showAreaFields?: boolean;
    addressFirst?: boolean;
    showSourceSelector?: boolean;
    showVisibilityField?: boolean;
    showPublicPreviewCard?: boolean;
    showActionBar?: boolean;
    showGoogleMapsLink?: boolean;
    addressRequired?: boolean;
    showSimpleVisibilityToggle?: boolean;
    visibilityOptions?: VisibilityOption[];
    geocoding?: boolean;
    onGeocode?: () => void | Promise<void>;
    onSaveToAddressBook?: () => void | Promise<void>;
};

type LocationMapPreviewProps = {
    location: ListingLocation;
    title?: string;
    subtitle?: string;
    mode?: 'public' | 'internal';
    showTechnicalMeta?: boolean;
};

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
        textInverse: string;
    };
    branding: {
        appName: string;
        badgeText: string;
    };
    eyebrow: string;
    headline: string;
    priceLabel: string;
    locationLabel: string;
    highlights: string[];
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

export type AddressBookManagerSubmitInput = {
    id?: string;
    label: string;
    kind: AddressBookKind;
    contactName: string | null;
    contactPhone: string | null;
    isDefault: boolean;
    location: ListingLocation;
};

function clampPreviewText(value: string, maxLength: number): string {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function splitPreviewPrice(value: string): { prefix: string; amount: string } {
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

    return (
        <div
            className={`relative overflow-hidden rounded-2xl border ${className ?? ''}`.trim()}
            style={{
                aspectRatio: effectiveLayoutVariant === 'portrait' ? '4 / 5' : '1 / 1',
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
                    ) : (
                        <>
                            <div className="absolute inset-x-0 top-0 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div
                                        className="flex min-h-[32px] items-center"
                                    >
                                        <img src="/logo.png" alt={template.branding.appName} className="h-6 w-auto object-contain" />
                                    </div>
                                    <div
                                        className="rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em]"
                                        style={{ background: template.colors.accent, color: template.colors.textInverse }}
                                    >
                                        {template.branding.badgeText}
                                    </div>
                                </div>
                            </div>
                            <div
                                className="absolute inset-x-0 bottom-0 p-4"
                                style={{
                                    background: template.overlayVariant === 'auto-spec'
                                        ? 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(245,242,235,0.95) 52%)'
                                        : 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(17,17,17,0.86) 50%)',
                                    color: template.overlayVariant === 'auto-spec'
                                        ? template.colors.textPrimary
                                        : template.colors.textInverse,
                                }}
                            >
                                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
                                    {template.eyebrow}
                                </div>
                                <div className="mb-2 max-w-[80%] text-[2rem] font-black leading-none line-clamp-2">
                                    {headline}
                                </div>
                                <div className="mb-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                                    {template.highlights.slice(0, 4).map((item) => (
                                        <span
                                            key={item}
                                            className="rounded-full px-2.5 py-1"
                                            style={{
                                                background: template.overlayVariant === 'auto-spec'
                                                    ? 'rgba(17,17,17,0.08)'
                                                    : 'rgba(255,255,255,0.12)',
                                            }}
                                        >
                                            {item}
                                        </span>
                                    ))}
                                </div>
                                {ctaLabel ? (
                                    <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] opacity-85">
                                        {ctaLabel}
                                    </div>
                                ) : null}
                                <div className="flex items-end justify-between gap-3">
                                    <div
                                        className="text-[2.1rem] font-black leading-none"
                                        style={{ color: template.colors.accent }}
                                    >
                                        {template.priceLabel}
                                    </div>
                                    <div className="text-right text-sm font-semibold">
                                        {locationLabel}
                                    </div>
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

type AddressBookManagerProps = {
    title?: string;
    description?: string;
    entries: AddressBookEntry[];
    regions: SelectOption[];
    getCommunes: (regionId: string) => SelectOption[];
    loading?: boolean;
    saving?: boolean;
    deletingId?: string | null;
    onSaveEntry: (input: AddressBookManagerSubmitInput) => boolean | Promise<boolean>;
    onDeleteEntry: (entryId: string) => void | Promise<void>;
};

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

type PanelButtonProps = {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    className?: string;
    size?: PanelButtonSize;
    variant?: PanelButtonVariant;
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

type PanelButtonSize = 'sm' | 'md';

type PanelButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type PanelPageHeaderProps = {
    title: string;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
};

type PanelBlockHeaderProps = {
    title: string;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
};

type PanelCardProps = {
    children: React.ReactNode;
    className?: string;
    tone?: 'surface' | 'default' | 'subtle';
    size?: 'sm' | 'md' | 'lg';
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

type GoogleAddressComponent = {
    long_name?: string;
    short_name?: string;
    types?: string[];
};

type GooglePlaceResult = {
    address_components?: GoogleAddressComponent[];
    formatted_address?: string;
    geometry?: {
        location?: {
            lat?: () => number;
            lng?: () => number;
        };
    };
    name?: string;
};

const DEFAULT_VISIBILITY_OPTIONS: VisibilityOption[] = [
    { value: 'exact', label: 'Exacta' },
    { value: 'approximate', label: 'Aproximada en mapa' },
    { value: 'sector_only', label: 'Solo sector / barrio' },
    { value: 'commune_only', label: 'Solo comuna' },
    { value: 'hidden', label: 'Oculta' },
];

const ADDRESS_KIND_OPTIONS: Array<{ value: AddressBookKind; label: string }> = [
    { value: 'personal', label: 'Particular' },
    { value: 'company', label: 'Empresa' },
    { value: 'shipping', label: 'Envíos' },
    { value: 'billing', label: 'Facturación' },
    { value: 'branch', label: 'Sucursal' },
    { value: 'warehouse', label: 'Bodega' },
    { value: 'pickup', label: 'Retiro' },
    { value: 'other', label: 'Otra' },
];

let googlePlacesScriptPromise: Promise<boolean> | null = null;

function createEmptyGeoPoint(): ListingLocation['geoPoint'] {
    return {
        latitude: null,
        longitude: null,
        precision: 'none',
        provider: 'none',
        accuracyMeters: null,
    };
}

function clearResolvedGeo(location: ListingLocation): Partial<ListingLocation> {
    if (location.geoPoint.precision === 'none' && location.publicGeoPoint.precision === 'none') {
        return {};
    }

    return {
        geoPoint: createEmptyGeoPoint(),
        publicGeoPoint: createEmptyGeoPoint(),
    };
}

function ensureGooglePlacesDropdownStyles() {
    if (typeof document === 'undefined') return;
    if (document.head.querySelector('style[data-google-pac-styles="true"]')) return;

    const style = document.createElement('style');
    style.dataset.googlePacStyles = 'true';
    style.textContent = `
        .pac-container {
            margin-top: 8px !important;
            border: 1px solid var(--border) !important;
            border-radius: 14px !important;
            background: var(--surface) !important;
            box-shadow: 0 18px 44px rgba(0,0,0,0.16) !important;
            overflow: hidden !important;
            z-index: 9999 !important;
            font-family: inherit !important;
        }
        .pac-item {
            min-height: 52px !important;
            display: grid !important;
            grid-template-columns: 16px minmax(0, 1fr) !important;
            align-items: start !important;
            column-gap: 12px !important;
            row-gap: 2px !important;
            padding: 12px 16px !important;
            border-top: 1px solid var(--border) !important;
            color: var(--fg) !important;
            font-size: 14px !important;
            line-height: 1.3 !important;
            background: transparent !important;
            white-space: normal !important;
        }
        .pac-item:first-child {
            border-top: 0 !important;
        }
        .pac-item:hover,
        .pac-item-selected {
            background: var(--bg-subtle) !important;
        }
        .pac-item-query,
        .pac-matched {
            color: var(--fg) !important;
            font-size: 14px !important;
        }
        .pac-item-query {
            grid-column: 2 !important;
            display: block !important;
            font-weight: 600 !important;
            line-height: 1.25 !important;
        }
        .pac-item span:not(.pac-icon):not(.pac-item-query) {
            grid-column: 2 !important;
            display: block !important;
            margin-top: 1px !important;
            color: var(--fg-muted) !important;
            font-size: 12px !important;
            line-height: 1.3 !important;
        }
        .pac-matched {
            font-weight: 600 !important;
        }
        .pac-icon {
            grid-column: 1 !important;
            grid-row: 1 / span 2 !important;
            align-self: start !important;
            margin: 4px 0 0 0 !important;
            opacity: 0.5 !important;
        }
    `;
    document.head.appendChild(style);
}

function normalizeText(value: string | null | undefined) {
    return (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function findGoogleComponent(components: GoogleAddressComponent[] | undefined, types: string[]) {
    if (!Array.isArray(components)) return null;
    return components.find((component) => Array.isArray(component.types) && types.every((type) => component.types?.includes(type))) || null;
}

function buildAddressLineFromPlace(place: GooglePlaceResult) {
    const streetNumber = findGoogleComponent(place.address_components, ['street_number'])?.long_name || '';
    const route = findGoogleComponent(place.address_components, ['route'])?.long_name || '';
    const direct = [route, streetNumber].filter(Boolean).join(' ').trim();
    return direct || place.name || place.formatted_address || '';
}

function buildPublicPreviewPoint(
    location: ListingLocation,
    point: ListingLocation['geoPoint']
): ListingLocation['publicGeoPoint'] {
    if (location.visibilityMode === 'hidden' || !location.publicMapEnabled) {
        return createEmptyGeoPoint();
    }

    if (location.visibilityMode === 'commune_only') {
        return location.publicGeoPoint;
    }

    return {
        ...point,
        precision: location.visibilityMode === 'exact' ? 'exact' : 'approximate',
    };
}

function applyPlaceToLocation(
    place: GooglePlaceResult,
    location: ListingLocation,
    regions: SelectOption[],
    communes: SelectOption[]
): ListingLocation {
    const latitude = place.geometry?.location?.lat?.();
    const longitude = place.geometry?.location?.lng?.();
    const nextAddress = buildAddressLineFromPlace(place).trim();
    const nextNeighborhood = findGoogleComponent(place.address_components, ['sublocality_level_1'])?.long_name
        || findGoogleComponent(place.address_components, ['neighborhood'])?.long_name
        || findGoogleComponent(place.address_components, ['sublocality'])?.long_name
        || location.neighborhood
        || null;
    const nextPostalCode = findGoogleComponent(place.address_components, ['postal_code'])?.long_name || location.postalCode || null;
    const nextCountryCode = findGoogleComponent(place.address_components, ['country'])?.short_name || location.countryCode || 'CL';
    const regionNameFromPlace = findGoogleComponent(place.address_components, ['administrative_area_level_1'])?.long_name || location.regionName || null;
    const communeNameFromPlace = findGoogleComponent(place.address_components, ['administrative_area_level_3'])?.long_name
        || findGoogleComponent(place.address_components, ['locality'])?.long_name
        || findGoogleComponent(place.address_components, ['administrative_area_level_2'])?.long_name
        || location.communeName
        || null;
    const matchedRegion = regionNameFromPlace
        ? regions.find((item) => normalizeText(item.label) === normalizeText(regionNameFromPlace))
        : null;
    const matchedCommune = communeNameFromPlace
        ? communes.find((item) => normalizeText(item.label) === normalizeText(communeNameFromPlace))
        : null;
    const nextRegionId = matchedRegion?.value || location.regionId;
    const nextRegionName = matchedRegion?.label || regionNameFromPlace;
    const regionChanged = Boolean(matchedRegion?.value && matchedRegion.value !== location.regionId);
    const nextCommuneId = matchedCommune?.value || (regionChanged ? null : location.communeId);
    const nextCommuneName = matchedCommune?.label || communeNameFromPlace;
    const nextPoint = typeof latitude === 'number' && typeof longitude === 'number'
        ? {
            latitude,
            longitude,
            precision: 'exact' as const,
            provider: 'external' as const,
            accuracyMeters: 20,
        }
        : createEmptyGeoPoint();

    return patchListingLocation(location, {
        sourceMode: location.sourceMode === 'saved_address' ? 'custom' : location.sourceMode,
        sourceAddressId: location.sourceMode === 'saved_address' ? null : location.sourceAddressId,
        countryCode: nextCountryCode,
        regionId: nextRegionId,
        regionName: nextRegionName,
        communeId: nextCommuneId,
        communeName: nextCommuneName,
        neighborhood: nextNeighborhood,
        addressLine1: nextAddress || location.addressLine1,
        postalCode: nextPostalCode,
        geoPoint: nextPoint,
        publicGeoPoint: buildPublicPreviewPoint(location, nextPoint),
    });
}

function loadGooglePlacesScript(apiKey: string): Promise<boolean> {
    if (!apiKey || typeof window === 'undefined') return Promise.resolve(false);
    const googleMaps = (window as typeof window & { google?: any }).google;
    if (googleMaps?.maps?.places?.Autocomplete) {
        return Promise.resolve(true);
    }

    if (googlePlacesScriptPromise) return googlePlacesScriptPromise;

    googlePlacesScriptPromise = new Promise((resolve) => {
        const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-places-script="true"]');
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(Boolean((window as typeof window & { google?: any }).google?.maps?.places?.Autocomplete)), { once: true });
            existingScript.addEventListener('error', () => resolve(false), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&language=es&region=CL&loading=async`;
        script.async = true;
        script.defer = true;
        script.dataset.googlePlacesScript = 'true';
        script.onload = () => resolve(Boolean((window as typeof window & { google?: any }).google?.maps?.places?.Autocomplete));
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
    });

    return googlePlacesScriptPromise;
}

function fieldError(errors: FieldErrorMap | undefined, key: keyof FieldErrorMap) {
    return errors?.[key] ?? null;
}

function joinClasses(...values: Array<string | false | null | undefined>) {
    return values.filter(Boolean).join(' ');
}

function Field(props: { label: string; required?: boolean; error?: string | null; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--fg-secondary)' }}>
                {props.label}
                {props.required ? <span style={{ color: '#b45309' }}> *</span> : null}
            </label>
            {props.children}
            {props.hint ? <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{props.hint}</p> : null}
            {props.error ? <p className="text-xs mt-1" style={{ color: '#b42318' }}>{props.error}</p> : null}
        </div>
    );
}

function StyledSelect(props: {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    ariaLabel?: string;
}) {
    const { value, onChange, options, placeholder = 'Seleccionar', disabled = false, ariaLabel } = props;
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const selectedOption = options.find((option) => option.value === value);

    useEffect(() => {
        const onPointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        window.addEventListener('pointerdown', onPointerDown);
        return () => window.removeEventListener('pointerdown', onPointerDown);
    }, []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    return (
        <div className="relative w-full" ref={rootRef}>
            <button
                type="button"
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                disabled={disabled}
                onClick={() => !disabled && setOpen((current) => !current)}
                className="form-input flex items-center text-left"
                style={{
                    color: selectedOption ? 'var(--fg)' : 'var(--fg-muted)',
                    paddingRight: '2.4rem',
                }}
            >
                <span className="truncate pr-1">{selectedOption?.label ?? placeholder}</span>
                <span
                    className="absolute right-3 top-1/2 pointer-events-none transition-transform"
                    style={{
                        color: 'var(--fg-muted)',
                        transform: `translateY(-50%) rotate(${open ? '180deg' : '0deg'})`,
                    }}
                >
                    ˅
                </span>
            </button>

            {open ? (
                <div
                    role="listbox"
                    className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-40 max-h-64 overflow-auto rounded-xl border p-1.5"
                    style={{
                        borderColor: 'var(--border)',
                        background: 'var(--surface)',
                        boxShadow: '0 18px 44px rgba(0,0,0,0.16)',
                    }}
                >
                    {options.map((option) => {
                        const isSelected = option.value === value;
                        return (
                            <button
                                key={`${option.value}-${option.label}`}
                                type="button"
                                disabled={option.disabled}
                                onClick={() => {
                                    if (option.disabled) return;
                                    onChange(option.value);
                                    setOpen(false);
                                }}
                                className="w-full h-9 px-2.5 rounded-lg text-sm flex items-center justify-between transition-colors"
                                style={{
                                    background: isSelected ? 'var(--bg-subtle)' : 'transparent',
                                    color: option.disabled ? 'var(--fg-faint)' : 'var(--fg)',
                                }}
                            >
                                <span className="truncate">{option.label}</span>
                                {isSelected ? <span style={{ color: 'var(--fg-secondary)' }}>✓</span> : null}
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}

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
        ? 'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl text-left'
        : 'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-left';

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
                        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
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
                        className={joinClasses('inline-flex items-center gap-1.5 rounded-[10px] text-sm font-medium transition-colors hover:text-(--fg)', buttonClass)}
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

    const softTone = tone === 'success'
        ? { background: 'rgba(22,163,74,0.14)', color: '#166534' }
        : tone === 'warning'
            ? { background: 'rgba(234,179,8,0.18)', color: '#92400e' }
            : tone === 'danger'
                ? { background: 'rgba(239,68,68,0.14)', color: '#991b1b' }
                : tone === 'info'
                    ? { background: 'rgba(59,130,246,0.14)', color: '#1d4ed8' }
                    : { background: 'var(--bg-muted)', color: 'var(--fg-secondary)' };

    const solidTone = tone === 'success'
        ? { background: '#16a34a', color: '#ffffff' }
        : tone === 'warning'
            ? { background: '#eab308', color: '#1f2937' }
            : tone === 'danger'
                ? { background: '#ef4444', color: '#ffffff' }
                : tone === 'info'
                    ? { background: '#3b82f6', color: '#ffffff' }
                    : { background: '#94a3b8', color: '#ffffff' };

    return (
        <span
            className={joinClasses(
                'inline-flex items-center rounded-full font-medium',
                size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-xs',
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
        <div className={joinClasses('rounded-2xl border p-4', className)} style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
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
            className={joinClasses('rounded-[20px] border overflow-hidden', className)}
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
            {children}
        </div>
    );
}

export function PanelButton(props: PanelButtonProps) {
    const {
        children,
        onClick,
        type = 'button',
        disabled = false,
        className,
        size = 'md',
        variant = 'secondary',
    } = props;

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={getPanelButtonClassName({ size, className })}
            style={getPanelButtonStyle(variant)}
        >
            {children}
        </button>
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
                'rounded-xl border p-4 text-left transition-[border-color,background,opacity,transform,box-shadow] duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0',
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

export function getPanelButtonClassName(props?: {
    size?: PanelButtonSize;
    className?: string;
}) {
    const sizeClass = props?.size === 'sm'
        ? 'h-9 px-3 text-sm'
        : 'h-10 px-4 text-sm';

    return joinClasses(
        'panel-button inline-flex items-center justify-center gap-2 rounded-xl border font-medium transition-[background,color,border-color,box-shadow,transform] duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        sizeClass,
        props?.className,
    );
}

export function getPanelButtonStyle(variant: PanelButtonVariant = 'secondary') {
    return variant === 'primary'
        ? ({
            '--panel-btn-bg': 'var(--button-primary-bg)',
            '--panel-btn-color': 'var(--button-primary-color)',
            '--panel-btn-border': 'var(--button-primary-border)',
            '--panel-btn-shadow': 'var(--button-primary-shadow)',
            '--panel-btn-hover-bg': 'var(--button-primary-hover-bg)',
            '--panel-btn-hover-color': 'var(--button-primary-hover-color)',
            '--panel-btn-hover-border': 'var(--button-primary-hover-border)',
            '--panel-btn-hover-shadow': 'var(--button-primary-hover-shadow)',
        } as CSSProperties)
        : variant === 'danger'
            ? ({
                '--panel-btn-bg': 'rgba(185,28,28,0.06)',
                '--panel-btn-color': '#b91c1c',
                '--panel-btn-border': 'rgba(185,28,28,0.18)',
                '--panel-btn-hover-bg': 'rgba(185,28,28,0.1)',
                '--panel-btn-hover-color': '#991b1b',
                '--panel-btn-hover-border': 'rgba(185,28,28,0.26)',
            } as CSSProperties)
            : variant === 'ghost'
                ? ({
                    '--panel-btn-bg': 'transparent',
                    '--panel-btn-color': 'var(--fg-secondary)',
                    '--panel-btn-border': 'transparent',
                    '--panel-btn-hover-bg': 'var(--bg-muted)',
                    '--panel-btn-hover-color': 'var(--fg)',
                    '--panel-btn-hover-border': 'transparent',
                    '--panel-btn-hover-shadow': 'none',
                } as CSSProperties)
                : ({
                    '--panel-btn-bg': 'var(--surface)',
                    '--panel-btn-color': 'var(--fg)',
                    '--panel-btn-border': 'var(--border)',
                    '--panel-btn-hover-bg': 'var(--bg-subtle)',
                    '--panel-btn-hover-color': 'var(--fg)',
                    '--panel-btn-hover-border': 'var(--border-strong)',
                    '--panel-btn-hover-shadow': 'var(--shadow-xs)',
                } as CSSProperties);
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
            style={{ background: checked ? 'var(--button-primary-bg)' : 'var(--bg-muted)' }}
        >
            <span
                className={joinClasses('absolute top-1/2 -translate-y-1/2 rounded-full transition-[left,background] duration-150', dimensions.thumb)}
                style={{
                    background: checked ? 'var(--button-primary-color)' : 'var(--fg-muted)',
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
                'rounded-md flex items-center justify-center shrink-0 transition-[background,color,opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
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
                    'relative overflow-hidden rounded-[22px] border ease-out',
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
                <div className="relative aspect-4/3 overflow-hidden rounded-[20px]">
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
                            className="absolute inset-3 rounded-[18px] border-2 border-dashed"
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
            className="relative aspect-4/3 rounded-[22px] border border-dashed p-4"
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
                        className="relative aspect-4/3 rounded-[22px] border border-dashed p-4 text-left transition-colors"
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
                        <div className="rounded-[22px] border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                                <div className="shrink-0 rounded-[26px] border p-1.5 shadow-sm" style={{ width: '116px', borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                    <div className="relative w-[116px] overflow-hidden rounded-[20px] border" style={{ borderColor: 'color-mix(in oklab, var(--border) 80%, transparent)', background: '#020617' }}>
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
                        className="w-full overflow-hidden rounded-[22px] border-2 border-dashed p-4 transition-colors sm:p-5"
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
                    className="w-full overflow-hidden rounded-[22px] border-2 border-dashed p-4 transition-colors sm:p-5"
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
                            <div key={item.id} className="flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
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
    const { title, description, actions, className } = props;

    return (
        <div className={joinClasses('mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
            <div className="min-w-0">
                <h1 className="type-page-title" style={{ color: 'var(--fg)' }}>
                    {title}
                </h1>
                {description ? (
                    <p className="type-page-subtitle mt-1" style={{ color: 'var(--fg-muted)' }}>
                        {description}
                    </p>
                ) : null}
            </div>
            {actions ? <div className="flex items-center gap-2 flex-wrap sm:justify-end">{actions}</div> : null}
        </div>
    );
}

export function PanelBlockHeader(props: PanelBlockHeaderProps) {
    const { title, description, actions, className } = props;

    return (
        <div className={joinClasses('mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
            <div className="min-w-0">
                <h2 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>
                    {title}
                </h2>
                {description ? (
                    <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                        {description}
                    </p>
                ) : null}
            </div>
            {actions ? <div className="flex items-center gap-2 flex-wrap sm:justify-end">{actions}</div> : null}
        </div>
    );
}

export function PanelCard(props: PanelCardProps) {
    const {
        children,
        className,
        tone = 'surface',
        size = 'md',
    } = props;

    const paddingClass = size === 'sm'
        ? 'p-4'
        : size === 'lg'
            ? 'p-5 md:p-6'
            : 'p-4 md:p-5';

    const background = tone === 'default'
        ? 'var(--bg)'
        : tone === 'subtle'
            ? 'color-mix(in oklab, var(--bg) 78%, transparent)'
            : 'var(--surface)';

    return (
        <div
            className={joinClasses('rounded-[24px] border', paddingClass, className)}
            style={{ borderColor: 'var(--border)', background }}
        >
            {children}
        </div>
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
        <div className={joinClasses('rounded-2xl border px-4 py-3 text-sm', className)} style={toneStyle}>
            {children}
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
        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
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
        <div className={joinClasses('rounded-[24px] border p-6 md:p-7 text-center', className)} style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
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

function addressSummary(address: AddressBookEntry) {
    return [address.label, address.addressLine1, address.communeName, address.regionName].filter(Boolean).join(' · ');
}

function mapWindowByPrecision(precision: ListingLocation['publicGeoPoint']['precision']) {
    switch (precision) {
        case 'exact':
            return { latDelta: 0.008, lonDelta: 0.010 };
        case 'approximate':
            return { latDelta: 0.02, lonDelta: 0.025 };
        case 'commune':
            return { latDelta: 0.055, lonDelta: 0.065 };
        default:
            return { latDelta: 0.014, lonDelta: 0.018 };
    }
}

function buildOsmUrls(latitude: number, longitude: number, precision: ListingLocation['publicGeoPoint']['precision']) {
    const zoom = mapZoomByPrecision(precision);
    return {
        embedUrl: null,
        imageUrl: `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude.toFixed(6)},${longitude.toFixed(6)}&zoom=${zoom}&size=1200x520&markers=${latitude.toFixed(6)},${longitude.toFixed(6)},red-pushpin`,
        externalUrl: `https://www.openstreetmap.org/?mlat=${latitude.toFixed(6)}&mlon=${longitude.toFixed(6)}#map=15/${latitude.toFixed(6)}/${longitude.toFixed(6)}`,
        providerLabel: 'OpenStreetMap',
    };
}

function mapZoomByPrecision(precision: ListingLocation['publicGeoPoint']['precision']) {
    switch (precision) {
        case 'exact':
            return 16;
        case 'approximate':
            return 14;
        case 'commune':
            return 12;
        default:
            return 13;
    }
}

function buildLocationQuery(location: ListingLocation, mode: 'public' | 'internal'): string {
    return mode === 'internal'
        ? [location.addressLine1, location.communeName, location.regionName, 'Chile'].filter(Boolean).join(', ')
        : [location.publicLabel || location.addressLine1, location.communeName, location.regionName, 'Chile'].filter(Boolean).join(', ');
}

function buildGoogleMapsUrls(
    latitude: number | null,
    longitude: number | null,
    precision: ListingLocation['publicGeoPoint']['precision'],
    query: string,
    embedKey?: string
) {
    const zoom = mapZoomByPrecision(precision);
    const previewTarget = latitude != null && longitude != null
        ? `${latitude.toFixed(6)},${longitude.toFixed(6)}`
        : query.trim();
    const searchTarget = query.trim() || previewTarget;
    if (!previewTarget && !searchTarget) return null;

    return {
        embedUrl: embedKey
            ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(embedKey)}&q=${encodeURIComponent(previewTarget || searchTarget)}&zoom=${zoom}`
            : null,
        imageUrl: null,
        externalUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchTarget || previewTarget)}`,
        providerLabel: 'Google Maps',
    };
}

export function LocationMapPreview({ location, title = 'Mapa público', subtitle, mode = 'public', showTechnicalMeta = false }: LocationMapPreviewProps) {
    const previewGeoPoint = mode === 'internal'
        ? location.geoPoint
        : (location.publicMapEnabled && location.visibilityMode !== 'hidden'
            ? (location.publicGeoPoint.latitude != null && location.publicGeoPoint.longitude != null ? location.publicGeoPoint : location.geoPoint)
            : createEmptyGeoPoint());
    const addressQuery = buildLocationQuery(location, mode);
    const canUsePrecisePoint = previewGeoPoint.latitude != null && previewGeoPoint.longitude != null && previewGeoPoint.provider !== 'catalog_seed';
    const googleUrls = buildGoogleMapsUrls(
        canUsePrecisePoint ? previewGeoPoint.latitude : null,
        canUsePrecisePoint ? previewGeoPoint.longitude : null,
        previewGeoPoint.precision,
        addressQuery,
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY
    );
    const previewUrls = canUsePrecisePoint
        ? buildOsmUrls(previewGeoPoint.latitude!, previewGeoPoint.longitude!, previewGeoPoint.precision)
        : null;
    const subtitleText = subtitle || (
        mode === 'internal'
            ? [location.addressLine1, location.neighborhood, location.communeName, location.regionName].filter(Boolean).join(', ') || 'Sin dirección interna todavía.'
            : location.publicLabel || 'Sin vista pública todavía.'
    );
    const externalMapsUrl = googleUrls?.externalUrl || previewUrls?.externalUrl || null;
    const statusLabel = !addressQuery
        ? 'Completa la dirección'
        : canUsePrecisePoint
            ? (mode === 'internal' ? 'Ubicación confirmada' : 'Vista pública lista')
            : 'Pendiente de verificar';
    const emptyStateText = !addressQuery
        ? (mode === 'internal' ? 'Escribe una dirección para mostrar la ubicación.' : 'Sin dirección pública todavía.')
        : 'Aún no pudimos ubicar esta dirección con precisión. Verifica la dirección o activa Google Places para usar sugerencias.';

    return (
        <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{title}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{subtitleText}</p>
                </div>
                <span className="text-[11px] px-2 py-1 rounded-full" style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}>
                    {statusLabel}
                </span>
            </div>
            <div className="relative mt-3 h-52 overflow-hidden rounded-[18px] border" style={{ borderColor: 'var(--border)', background: '#eef2f7' }}>
                {previewUrls?.imageUrl ? (
                    <img
                        alt={title}
                        src={previewUrls.imageUrl}
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                ) : externalMapsUrl ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                        <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(15,23,42,0.08)', color: 'var(--fg)' }}>
                            <span className="text-lg">+</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                Abre esta dirección en Google Maps
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                                Usa el mapa para confirmar que la dirección corresponde al punto correcto.
                            </p>
                        </div>
                        <a href={externalMapsUrl} target="_blank" rel="noreferrer" className="btn btn-outline h-9 px-3 text-xs">
                            Abrir en Google Maps
                        </a>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: 'var(--fg-secondary)' }}>
                        {emptyStateText}
                    </div>
                )}
            </div>
            {showTechnicalMeta ? (
                <div className="grid grid-cols-2 gap-3 mt-3 text-xs" style={{ color: 'var(--fg-secondary)' }}>
                    <span>Interna: {location.geoPoint.latitude != null && location.geoPoint.longitude != null ? `${location.geoPoint.latitude.toFixed(4)}, ${location.geoPoint.longitude.toFixed(4)}` : 'Pendiente'}</span>
                    <span>{mode === 'internal' ? 'Precisión' : 'Publica'}: {mode === 'internal'
                        ? location.geoPoint.precision
                        : (location.publicGeoPoint.latitude != null && location.publicGeoPoint.longitude != null ? `${location.publicGeoPoint.latitude.toFixed(4)}, ${location.publicGeoPoint.longitude.toFixed(4)}` : 'Oculta')}</span>
                </div>
            ) : null}
            {externalMapsUrl ? (
                <div className="mt-3 flex justify-end">
                    <a href={externalMapsUrl} target="_blank" rel="noreferrer" className="text-xs font-medium" style={{ color: 'var(--fg)' }}>
                        Ver en Google Maps
                    </a>
                </div>
            ) : null}
        </div>
    );
}

export function ListingLocationEditor(props: ListingLocationEditorProps) {
    const {
        title = 'Ubicación del aviso',
        description = 'Controla la dirección interna, la visibilidad pública y la geocodificación automática.',
        showHeader = true,
        framed = true,
        simpleMode = false,
        location,
        onChange,
        regions,
        communes,
        allCommunes,
        addressBook,
        addressBookLoading = false,
        errors,
        allowAreaOnly = true,
        showAreaFields = true,
        addressFirst = false,
        showSourceSelector = true,
        showVisibilityField = true,
        showPublicPreviewCard = true,
        showActionBar = true,
        showGoogleMapsLink = false,
        addressRequired = false,
        showSimpleVisibilityToggle = true,
        visibilityOptions = DEFAULT_VISIBILITY_OPTIONS,
        geocoding = false,
        onGeocode,
        onSaveToAddressBook,
    } = props;
    const addressInputRef = useRef<HTMLInputElement | null>(null);
    const locationRef = useRef(location);
    const regionsRef = useRef(regions);
    const communesRef = useRef(communes);
    const allCommunesRef = useRef(allCommunes ?? communes);
    const onChangeRef = useRef(onChange);
    const autocompleteRef = useRef<any>(null);
    const googlePlacesKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY
        || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        || process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY
        || '';
    const [autocompleteReady, setAutocompleteReady] = useState(false);

    const sourceOptions = useMemo(() => {
        const base = [
            { value: 'custom', label: 'Dirección personalizada', description: 'Ingresa una dirección nueva para este aviso.' },
            { value: 'saved_address', label: 'Dirección guardada', description: 'Reutiliza una dirección desde la libreta.' },
        ];
        return allowAreaOnly
            ? [{ value: 'area_only', label: 'Solo zona', description: 'Publica solo con región y comuna.' }, ...base]
            : base;
    }, [allowAreaOnly]);

    useEffect(() => {
        locationRef.current = location;
    }, [location]);

    useEffect(() => {
        regionsRef.current = regions;
    }, [regions]);

    useEffect(() => {
        communesRef.current = communes;
    }, [communes]);

    useEffect(() => {
        allCommunesRef.current = allCommunes ?? communes;
    }, [allCommunes, communes]);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        if (!googlePlacesKey || location.sourceMode === 'area_only' || !addressInputRef.current) {
            setAutocompleteReady(false);
            return;
        }

        let disposed = false;
        ensureGooglePlacesDropdownStyles();

        void loadGooglePlacesScript(googlePlacesKey).then((ready) => {
            if (disposed || !ready || !addressInputRef.current) {
                setAutocompleteReady(false);
                return;
            }

            const googleMaps = (window as typeof window & { google?: any }).google?.maps;
            if (!googleMaps?.places?.Autocomplete) {
                setAutocompleteReady(false);
                return;
            }

            if (autocompleteRef.current && googleMaps.event?.clearInstanceListeners) {
                googleMaps.event.clearInstanceListeners(autocompleteRef.current);
            }

            const autocomplete = new googleMaps.places.Autocomplete(addressInputRef.current, {
                componentRestrictions: { country: 'cl' },
                fields: ['address_components', 'formatted_address', 'geometry', 'name'],
                types: ['address'],
            });

            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace?.() as GooglePlaceResult | undefined;
                if (!place) return;
                const nextLocation = applyPlaceToLocation(place, locationRef.current, regionsRef.current, allCommunesRef.current);
                onChangeRef.current(nextLocation);
            });

            autocompleteRef.current = autocomplete;
            setAutocompleteReady(true);
        });

        return () => {
            disposed = true;
            const googleMaps = (window as typeof window & { google?: any }).google?.maps;
            if (autocompleteRef.current && googleMaps?.event?.clearInstanceListeners) {
                googleMaps.event.clearInstanceListeners(autocompleteRef.current);
            }
        };
    }, [googlePlacesKey, location.sourceMode]);

    const addressHint = autocompleteReady
        ? 'Escribe la calle y el número. Si aparece una sugerencia, selecciónala.'
        : (googlePlacesKey
            ? 'Escribe la calle y el número. Si Google Places está disponible, verás sugerencias.'
            : 'Escribe la calle y el número tal como aparece en Google Maps.');
    const internalMapsUrl = showGoogleMapsLink
        ? buildGoogleMapsUrls(
            location.geoPoint.latitude,
            location.geoPoint.longitude,
            location.geoPoint.precision,
            buildLocationQuery(location, 'internal')
        )?.externalUrl || null
        : null;
    const savedAddressSelectValue = location.sourceMode === 'saved_address' && location.sourceAddressId
        ? location.sourceAddressId
        : '__new__';
    const savedAddressOptions = [
        { value: '__new__', label: 'Nueva dirección' },
        ...addressBook.map((item) => ({ value: item.id, label: addressSummary(item) })),
    ];
    const regionField = (
        <Field label="Región" required error={fieldError(errors, 'regionId')}>
            <StyledSelect value={location.regionId || ''} onChange={(nextValue) => onChange(patchListingLocation(location, {
                regionId: nextValue || null,
                regionName: regions.find((item) => item.value === nextValue)?.label || null,
                communeId: null,
                communeName: null,
                sourceAddressId: location.sourceMode === 'saved_address' ? null : location.sourceAddressId,
                sourceMode: location.sourceMode === 'saved_address' ? 'custom' : location.sourceMode,
                ...clearResolvedGeo(location),
            }))} options={regions} />
        </Field>
    );
    const communeField = (
        <Field label="Comuna" required error={fieldError(errors, 'communeId')}>
            <StyledSelect
                value={location.communeId || ''}
                onChange={(nextValue) => onChange(patchListingLocation(location, {
                    communeId: nextValue || null,
                    communeName: allCommunesRef.current.find((item) => item.value === nextValue)?.label || null,
                    sourceAddressId: location.sourceMode === 'saved_address' ? null : location.sourceAddressId,
                    sourceMode: location.sourceMode === 'saved_address' ? 'custom' : location.sourceMode,
                    ...clearResolvedGeo(location),
                }))}
                disabled={!location.regionId}
                placeholder={location.regionId ? 'Seleccionar' : 'Primero región'}
                options={communes}
            />
        </Field>
    );
    const addressFields = location.sourceMode !== 'area_only' ? (
        simpleMode ? (
            <div className="grid grid-cols-1 gap-3">
                <Field label="Dirección" required={addressRequired} error={fieldError(errors, 'addressLine1')} hint={addressHint}>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <input
                            ref={addressInputRef}
                            className="form-input"
                            style={{ flex: 1 }}
                            value={location.addressLine1 || ''}
                            autoComplete="street-address"
                            onChange={(event) => onChange(patchListingLocation(location, {
                                addressLine1: event.target.value,
                                sourceAddressId: location.sourceMode === 'saved_address' ? null : location.sourceAddressId,
                                sourceMode: location.sourceMode === 'saved_address' ? 'custom' : location.sourceMode,
                                ...clearResolvedGeo(location),
                            }))}
                            placeholder="Ej: Av. Italia 1452"
                        />
                        {internalMapsUrl ? (
                            <a
                                href={internalMapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-outline h-10 px-3 text-sm whitespace-nowrap"
                            >
                                Ver en Google Maps
                            </a>
                        ) : null}
                    </div>
                </Field>
                <Field label="Depto, oficina o referencia">
                    <input className="form-input" value={location.addressLine2 || ''} onChange={(event) => onChange(patchListingLocation(location, { addressLine2: event.target.value }))} placeholder="Ej: Depto 608, torre B o portón gris" />
                </Field>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Dirección" required={addressRequired} error={fieldError(errors, 'addressLine1')} hint={addressHint}>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <input
                            ref={addressInputRef}
                            className="form-input"
                            style={{ flex: 1 }}
                            value={location.addressLine1 || ''}
                            autoComplete="street-address"
                            onChange={(event) => onChange(patchListingLocation(location, {
                                addressLine1: event.target.value,
                                sourceAddressId: location.sourceMode === 'saved_address' ? null : location.sourceAddressId,
                                sourceMode: location.sourceMode === 'saved_address' ? 'custom' : location.sourceMode,
                                ...clearResolvedGeo(location),
                            }))}
                            placeholder="Ej: Av. Italia 1452"
                        />
                        {internalMapsUrl ? (
                            <a
                                href={internalMapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-outline h-10 px-3 text-sm whitespace-nowrap"
                            >
                                Ver en Google Maps
                            </a>
                        ) : null}
                    </div>
                </Field>
                <Field label="Depto, oficina o referencia">
                    <input className="form-input" value={location.addressLine2 || ''} onChange={(event) => onChange(patchListingLocation(location, { addressLine2: event.target.value }))} placeholder="Ej: Depto 608, torre B o portón gris" />
                </Field>
            </div>
        )
    ) : null;
    const areaFieldsBlock = showAreaFields ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {regionField}
            {communeField}
        </div>
    ) : null;

    return (
        <div
            className={framed ? 'rounded-2xl border p-4 space-y-4' : 'space-y-4'}
            style={framed ? { borderColor: 'var(--border)', background: 'var(--bg)' } : undefined}
        >
            {showHeader ? (
                <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{title}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{description}</p>
                </div>
            ) : null}
            {simpleMode ? (
                <>
                    {addressBookLoading || addressBook.length > 0 ? (
                        <Field label="Usar dirección">
                            <StyledSelect
                                value={savedAddressSelectValue}
                                placeholder={addressBookLoading ? 'Cargando...' : 'Nueva dirección'}
                                disabled={addressBookLoading}
                                options={savedAddressOptions}
                                onChange={(nextValue) => {
                                    if (!nextValue || nextValue === '__new__') {
                                        onChange(patchListingLocation(location, {
                                            sourceMode: 'custom',
                                            sourceAddressId: null,
                                        }));
                                        return;
                                    }
                                    const nextAddress = addressBook.find((item) => item.id === nextValue);
                                    if (!nextAddress) return;
                                    onChange(applyAddressBookEntryToLocation(nextAddress, location));
                                }}
                            />
                        </Field>
                    ) : null}
                    {addressFields}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {regionField}
                        {communeField}
                    </div>
                    {(showSimpleVisibilityToggle || onSaveToAddressBook) ? (
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            {showSimpleVisibilityToggle ? (
                                <label className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                    <input
                                        type="checkbox"
                                        checked={location.visibilityMode !== 'exact'}
                                        onChange={(event) => onChange(patchListingLocation(location, {
                                            visibilityMode: event.target.checked ? 'commune_only' : 'exact',
                                            publicMapEnabled: !event.target.checked,
                                        }))}
                                    />
                                    <span>No mostrar dirección exacta</span>
                                </label>
                            ) : <div />}
                            {onSaveToAddressBook ? (
                                <PanelButton type="button" variant="ghost" size="sm" onClick={() => void onSaveToAddressBook()}>
                                    Guardar en libreta
                                </PanelButton>
                            ) : null}
                        </div>
                    ) : null}
                </>
            ) : (
                <>
            {showSourceSelector ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {sourceOptions.map((option) => {
                        const disabled = option.value === 'saved_address' && !addressBookLoading && addressBook.length === 0;
                        const active = location.sourceMode === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                disabled={disabled}
                                onClick={() => onChange(patchListingLocation(location, {
                                    sourceMode: option.value as ListingLocation['sourceMode'],
                                    sourceAddressId: option.value === 'saved_address' ? location.sourceAddressId : null,
                                    addressLine1: option.value === 'area_only' ? null : location.addressLine1,
                                    addressLine2: option.value === 'area_only' ? null : location.addressLine2,
                                    ...(option.value === 'area_only' ? clearResolvedGeo(location) : {}),
                                }))}
                                className="rounded-xl border p-3 text-left"
                                style={{ borderColor: active ? 'var(--fg)' : 'var(--border)', background: active ? 'var(--bg-subtle)' : 'transparent', opacity: disabled ? 0.6 : 1 }}
                            >
                                <p className="text-sm font-semibold">{option.label}</p>
                                <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{option.description}</p>
                            </button>
                        );
                    })}
                </div>
            ) : null}
            {location.sourceMode === 'saved_address' ? (
                <Field label="Dirección guardada" error={fieldError(errors, 'sourceAddressId')}>
                    <StyledSelect
                        value={location.sourceAddressId || ''}
                        placeholder={addressBookLoading ? 'Cargando...' : 'Seleccionar'}
                        disabled={addressBookLoading || addressBook.length === 0}
                        options={addressBook.map((item) => ({ value: item.id, label: addressSummary(item) }))}
                        onChange={(nextValue) => {
                        const nextAddress = addressBook.find((item) => item.id === nextValue);
                        if (!nextAddress) return;
                        onChange(applyAddressBookEntryToLocation(nextAddress, location));
                    }}
                    />
                </Field>
            ) : null}
            {addressFirst ? addressFields : areaFieldsBlock}
            {addressFirst ? areaFieldsBlock : addressFields}
            {(showAreaFields || showVisibilityField) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {showAreaFields ? (
                        <Field label="Sector / barrio">
                            <input className="form-input" value={location.neighborhood || ''} onChange={(event) => onChange(patchListingLocation(location, { neighborhood: event.target.value }))} placeholder="Ej: Barrio Italia" />
                        </Field>
                    ) : null}
                    {showVisibilityField ? (
                        <Field label="Visibilidad pública">
                            <StyledSelect
                                value={location.visibilityMode}
                                onChange={(nextValue) => onChange(patchListingLocation(location, { visibilityMode: nextValue as ListingLocationVisibilityMode }))}
                                options={visibilityOptions}
                            />
                        </Field>
                    ) : null}
                </div>
            ) : null}
            {(showActionBar && (showPublicPreviewCard || onGeocode || onSaveToAddressBook)) ? (
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-xl border px-3 py-3" style={{ borderColor: 'var(--border)' }}>
                    {showPublicPreviewCard ? (
                        <div>
                            <p className="text-sm font-medium">Vista pública</p>
                            <p className="text-xs mt-1" style={{ color: 'var(--fg-secondary)' }}>
                                {location.publicLabel || 'La ubicación pública quedará oculta.'}
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Mapa público: {location.visibilityMode === 'hidden' ? 'Oculto' : location.publicMapEnabled ? 'Visible' : 'No visible'}</p>
                        </div>
                    ) : <div />}
                    <div className="flex items-center gap-2 flex-wrap">
                        {onGeocode ? <button type="button" className="btn btn-outline h-9 px-3 text-xs" onClick={() => void onGeocode()}>{geocoding ? 'Actualizando mapa...' : 'Actualizar mapa'}</button> : null}
                        {showPublicPreviewCard ? <button type="button" className="btn btn-outline h-9 px-3 text-xs" onClick={() => onChange(patchListingLocation(location, { publicMapEnabled: !location.publicMapEnabled }))} disabled={location.visibilityMode === 'hidden'}>{location.publicMapEnabled ? 'Ocultar mapa' : 'Mostrar mapa'}</button> : null}
                        {onSaveToAddressBook ? <button type="button" className="btn btn-outline h-9 px-3 text-xs" onClick={() => void onSaveToAddressBook()}>Guardar en libreta</button> : null}
                    </div>
                </div>
            ) : null}
            {showPublicPreviewCard ? <LocationMapPreview location={location} /> : null}
                </>
            )}
        </div>
    );
}

function createDraftFromEntry(entry?: AddressBookEntry | null): AddressBookManagerSubmitInput {
    return {
        id: entry?.id,
        label: entry?.label || '',
        kind: entry?.kind || 'personal',
        contactName: entry?.contactName || null,
        contactPhone: entry?.contactPhone || null,
        isDefault: entry?.isDefault || false,
        location: patchListingLocation(
            createEmptyListingLocation({
                sourceMode: 'custom',
                countryCode: entry?.countryCode || 'CL',
                visibilityMode: 'exact',
                publicMapEnabled: true,
            }),
            {
                regionId: entry?.regionId || null,
                regionName: entry?.regionName || null,
                communeId: entry?.communeId || null,
                communeName: entry?.communeName || null,
                neighborhood: entry?.neighborhood || null,
                addressLine1: entry?.addressLine1 || null,
                addressLine2: entry?.addressLine2 || null,
                postalCode: entry?.postalCode || null,
                geoPoint: entry?.geoPoint || undefined,
                publicGeoPoint: entry?.geoPoint || undefined,
                publicLabel: [entry?.addressLine1, entry?.communeName, entry?.regionName].filter(Boolean).join(', '),
            }
        ),
    };
}

export function AddressBookManager(props: AddressBookManagerProps) {
    const {
        title = 'Direcciones guardadas',
        description = 'Guarda direcciones particulares, de empresa, sucursal o envíos para reutilizarlas en publicaciones y operaciones.',
        entries,
        regions,
        getCommunes,
        loading = false,
        saving = false,
        deletingId = null,
        onSaveEntry,
        onDeleteEntry,
    } = props;
    const [draft, setDraft] = useState<AddressBookManagerSubmitInput>(createDraftFromEntry());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [composerOpen, setComposerOpen] = useState(false);

    useEffect(() => {
        if (!editingId) return;
        const current = entries.find((item) => item.id === editingId);
        if (!current) {
            setEditingId(null);
            setDraft(createDraftFromEntry());
            setComposerOpen(false);
        }
    }, [editingId, entries]);

    const communes = useMemo(
        () => getCommunes(draft.location.regionId || ''),
        [draft.location.regionId, getCommunes]
    );
    const allCommunes = useMemo(
        () => regions.flatMap((region) => getCommunes(region.value)),
        [regions, getCommunes]
    );

    const submitDisabled = !draft.label.trim() || !draft.location.regionId || !draft.location.communeId || !draft.location.addressLine1?.trim();

    const handleStartCreate = () => {
        setEditingId(null);
        setDraft(createDraftFromEntry());
        setComposerOpen(true);
    };

    const handleEdit = (entry: AddressBookEntry) => {
        setEditingId(entry.id);
        setDraft(createDraftFromEntry(entry));
        setComposerOpen(true);
    };

    const handleReset = () => {
        setEditingId(null);
        setDraft(createDraftFromEntry());
        setComposerOpen(false);
    };

    const handleSave = async () => {
        const saved = await onSaveEntry(draft);
        if (saved) {
            handleReset();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--fg)' }}>{title}</h2>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{description}</p>
                </div>
                {!composerOpen ? (
                    <button type="button" className="btn btn-primary h-10 px-4 text-sm" style={{ marginLeft: 'auto' }} onClick={handleStartCreate}>
                        + Agregar direccion
                    </button>
                ) : null}
            </div>

            <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                    {entries.length > 0 ? entries.map((entry) => (
                        <div key={entry.id} className="rounded-2xl border p-4" style={{ borderColor: editingId === entry.id ? 'var(--fg)' : 'var(--border)', background: editingId === entry.id ? 'var(--bg-subtle)' : 'var(--bg)' }}>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{entry.label}</p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{ADDRESS_KIND_OPTIONS.find((item) => item.value === entry.kind)?.label || entry.kind}</p>
                                </div>
                                {entry.isDefault ? <span className="rounded-full px-2 py-1 text-[11px] font-medium" style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}>Predeterminada</span> : null}
                            </div>
                            <p className="text-sm mt-3" style={{ color: 'var(--fg-secondary)' }}>{addressSummary(entry)}</p>
                            {(entry.contactName || entry.contactPhone) ? (
                                <p className="text-xs mt-2" style={{ color: 'var(--fg-muted)' }}>
                                    {[entry.contactName, entry.contactPhone].filter(Boolean).join(' · ')}
                                </p>
                            ) : null}
                            <div className="mt-4 flex flex-wrap gap-2">
                                <button type="button" className="btn btn-outline h-9 px-3 text-xs" onClick={() => handleEdit(entry)}>Editar</button>
                                <button type="button" className="btn btn-outline h-9 px-3 text-xs" onClick={() => void onDeleteEntry(entry.id)} disabled={deletingId === entry.id}>{deletingId === entry.id ? 'Eliminando...' : 'Eliminar'}</button>
                            </div>
                        </div>
                    )) : (
                        <div className="rounded-2xl border p-5 text-sm md:col-span-2" style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--fg-secondary)' }}>
                            <p>{loading ? 'Cargando direcciones...' : 'Todavía no tienes direcciones guardadas.'}</p>
                        </div>
                    )}
                </div>

                {composerOpen ? (
                    <PanelCard tone="surface" size="lg" className="shadow-(--shadow-xs)">
                        <div className="mx-auto max-w-[1160px] space-y-6">
                            <div className="flex flex-wrap gap-3" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div className="pr-2">
                                    <p className="text-base font-semibold" style={{ color: 'var(--fg)' }}>{editingId ? 'Editar dirección' : 'Nueva dirección'}</p>
                                    <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>Completa región, comuna y dirección para guardarla y reutilizarla después.</p>
                                </div>
                                <button type="button" className="btn btn-outline h-9 px-3 text-xs" style={{ marginLeft: 'auto' }} onClick={handleReset}>
                                    Cancelar
                                </button>
                            </div>

                            <div className="space-y-5">
                                <div className="space-y-3">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Ubicación</p>
                                    <ListingLocationEditor
                                        simpleMode
                                        location={draft.location}
                                        onChange={(next) => setDraft((current) => ({ ...current, location: patchListingLocation(next, { visibilityMode: 'exact', publicMapEnabled: true }) }))}
                                        regions={regions}
                                        communes={communes}
                                        allCommunes={allCommunes}
                                        addressBook={[]}
                                        showHeader={false}
                                        framed={false}
                                        addressFirst
                                        allowAreaOnly={false}
                                        showSourceSelector={false}
                                        showVisibilityField={false}
                                        showSimpleVisibilityToggle={false}
                                        showPublicPreviewCard={false}
                                        showActionBar={false}
                                        showGoogleMapsLink
                                        addressRequired
                                    />
                                </div>

                                <div className="space-y-3">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Identificación</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Field label="Tipo">
                                            <StyledSelect
                                                value={draft.kind}
                                                onChange={(nextValue) => setDraft((current) => ({ ...current, kind: nextValue as AddressBookKind }))}
                                                options={ADDRESS_KIND_OPTIONS}
                                            />
                                        </Field>
                                        <Field label="Etiqueta" required>
                                            <input className="form-input" value={draft.label} onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))} placeholder="Ej: Oficina Las Condes" />
                                        </Field>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Contacto</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Field label="Contacto">
                                            <input className="form-input" value={draft.contactName || ''} onChange={(event) => setDraft((current) => ({ ...current, contactName: event.target.value || null }))} placeholder="Ej: Recepción" />
                                        </Field>
                                        <Field label="Teléfono">
                                            <input className="form-input" value={draft.contactPhone || ''} onChange={(event) => setDraft((current) => ({ ...current, contactPhone: event.target.value || null }))} placeholder="+56 9 1234 5678" />
                                        </Field>
                                    </div>
                                </div>

                                <label className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                                    <input type="checkbox" checked={draft.isDefault} onChange={(event) => setDraft((current) => ({ ...current, isDefault: event.target.checked }))} />
                                    <span style={{ color: 'var(--fg-secondary)' }}>Usar como dirección predeterminada</span>
                                </label>

                                <div className="flex flex-wrap gap-2 pt-1">
                                    <button type="button" className="btn btn-primary h-10 px-4 text-sm" onClick={() => void handleSave()} disabled={saving || submitDisabled}>
                                        {saving ? 'Guardando...' : editingId ? 'Guardar dirección' : 'Agregar dirección'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </PanelCard>
                ) : null}
            </div>
        </div>
    );
}
