'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
    FLOATING_POPOVER_Z_INDEX,
    useFloatingPortalDismiss,
    useFloatingPortalPosition,
} from '../floating-portal.js';
import type { AddressBookEntry, AddressBookKind, ListingLocation, ListingLocationKind, ListingLocationVisibilityMode } from '@simple/types';
import { patchListingLocation } from '@simple/types';

export type SelectOption = {
    value: string;
    label: string;
    disabled?: boolean;
};

export type FieldErrorMap = Partial<Record<'regionId' | 'communeId' | 'sourceAddressId' | 'addressLine1', string>>;

export type VisibilityOption = {
    value: ListingLocationVisibilityMode;
    label: string;
};

export type GoogleAddressComponent = {
    long_name?: string;
    short_name?: string;
    types?: string[];
};

export type GooglePlaceResult = {
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

export const DEFAULT_VISIBILITY_OPTIONS: VisibilityOption[] = [
    { value: 'exact', label: 'Exacta' },
    { value: 'approximate', label: 'Aproximada en mapa' },
    { value: 'sector_only', label: 'Solo sector / barrio' },
    { value: 'commune_only', label: 'Solo comuna' },
    { value: 'hidden', label: 'Oculta' },
];

export const LOCATION_KIND_LABELS: Record<ListingLocationKind, string> = {
    personal: 'Dirección personal',
    office: 'Oficina',
    clinic: 'Consulta médica',
    store: 'Local comercial',
    branch: 'Sucursal',
    company: 'Empresa',
    warehouse: 'Bodega',
    shipping: 'Envíos',
    pickup: 'Retiro',
    billing: 'Facturación',
    delivery: 'Entrega',
    other: 'Otro',
};
export const ADDRESS_KIND_OPTIONS: Array<{ value: AddressBookKind; label: string }> = (
    Object.keys(LOCATION_KIND_LABELS) as ListingLocationKind[]
).map((k) => ({ value: k, label: LOCATION_KIND_LABELS[k] }));

export let googlePlacesScriptPromise: Promise<boolean> | null = null;

export function createEmptyGeoPoint(): ListingLocation['geoPoint'] {
    return {
        latitude: null,
        longitude: null,
        precision: 'none',
        provider: 'none',
        accuracyMeters: null,
    };
}

export function clearResolvedGeo(location: ListingLocation): Partial<ListingLocation> {
    if (location.geoPoint.precision === 'none' && location.publicGeoPoint.precision === 'none') {
        return {};
    }

    return {
        geoPoint: createEmptyGeoPoint(),
        publicGeoPoint: createEmptyGeoPoint(),
    };
}

export function ensureGooglePlacesDropdownStyles() {
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
            z-index: 100000 !important;
            font-family: inherit !important;
        }
        .pac-item {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            padding: 10px 16px !important;
            border-top: 1px solid var(--border) !important;
            color: var(--fg) !important;
            font-size: 13px !important;
            line-height: 1 !important;
            background: transparent !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            cursor: pointer !important;
        }
        .pac-item:first-child {
            border-top: 0 !important;
        }
        .pac-item:hover,
        .pac-item-selected {
            background: var(--bg-subtle) !important;
        }
        .pac-icon {
            display: none !important;
        }
        .pac-item-query {
            flex-shrink: 0 !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            color: var(--fg) !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
        }
        .pac-matched {
            font-weight: 700 !important;
        }
        .pac-item span:not(.pac-icon):not(.pac-item-query) {
            flex: 1 !important;
            font-size: 12px !important;
            color: var(--fg-muted) !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
        }
    `;
    document.head.appendChild(style);
}

export function normalizeText(value: string | null | undefined) {
    return (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

export function findGoogleComponent(components: GoogleAddressComponent[] | undefined, types: string[]) {
    if (!Array.isArray(components)) return null;
    return components.find((component) => Array.isArray(component.types) && types.every((type) => component.types?.includes(type))) || null;
}

export function buildAddressLineFromPlace(place: GooglePlaceResult) {
    const streetNumber = findGoogleComponent(place.address_components, ['street_number'])?.long_name || '';
    const route = findGoogleComponent(place.address_components, ['route'])?.long_name || '';
    const direct = [route, streetNumber].filter(Boolean).join(' ').trim();
    return direct || place.name || place.formatted_address || '';
}

export function buildPublicPreviewPoint(
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

export function applyPlaceToLocation(
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
        ? regions.find((item) => {
            const itemLabel = normalizeText(item.label);
            const placeLabel = normalizeText(regionNameFromPlace);
            return itemLabel === placeLabel || itemLabel.includes(placeLabel) || placeLabel.includes(itemLabel);
        })
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

type GooglePlacesAutocompleteCtor = new (
    input: HTMLInputElement,
    options?: Record<string, unknown>,
) => {
    addListener: (event: string, handler: () => void) => void;
    getPlace: () => GooglePlaceResult | undefined;
};

export type GooglePlacesAutocompleteInstance = InstanceType<GooglePlacesAutocompleteCtor>;

async function resolvePlacesAutocompleteClass(): Promise<GooglePlacesAutocompleteCtor | null> {
    const googleMaps = (window as typeof window & { google?: { maps?: any } }).google?.maps;
    if (!googleMaps) return null;
    if (googleMaps.places?.Autocomplete) return googleMaps.places.Autocomplete;
    if (typeof googleMaps.importLibrary === 'function') {
        try {
            const places = await googleMaps.importLibrary('places');
            return places?.Autocomplete ?? googleMaps.places?.Autocomplete ?? null;
        } catch {
            return null;
        }
    }
    return null;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

/** Con `loading=async`, el script puede disparar onload antes de que Places esté listo. */
async function waitForPlacesAutocomplete(maxMs = 12000): Promise<boolean> {
    const started = Date.now();
    while (Date.now() - started < maxMs) {
        if (await resolvePlacesAutocompleteReady()) return true;
        await sleep(120);
    }
    return false;
}

async function resolvePlacesAutocompleteReady(): Promise<boolean> {
    return Boolean(await resolvePlacesAutocompleteClass());
}

export async function createGooglePlacesAutocomplete(
    input: HTMLInputElement,
    apiKey: string,
    options: {
        componentRestrictions?: { country: string };
        fields?: string[];
        types?: string[];
    },
): Promise<GooglePlacesAutocompleteInstance | null> {
    const loaded = await loadGooglePlacesScript(apiKey);
    if (!loaded) return null;
    const Autocomplete = await resolvePlacesAutocompleteClass();
    if (!Autocomplete) return null;
    ensureGooglePlacesDropdownStyles();
    return new Autocomplete(input, options);
}

export function loadGooglePlacesScript(apiKey: string): Promise<boolean> {
    if (!apiKey || typeof window === 'undefined') return Promise.resolve(false);

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-places-script="true"]');
    if (existingScript?.dataset.googlePlacesKey && existingScript.dataset.googlePlacesKey !== apiKey) {
        existingScript.remove();
        googlePlacesScriptPromise = null;
    }

    if (googlePlacesScriptPromise) return googlePlacesScriptPromise;

    googlePlacesScriptPromise = (async () => {
        const readyNow = await resolvePlacesAutocompleteReady();
        if (readyNow) return true;

        const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-places-script="true"]');
        if (existingScript) {
            if (existingScript.dataset.googlePlacesFailed === 'true') {
                existingScript.remove();
            } else if (existingScript.dataset.googlePlacesLoaded !== 'true') {
                const waited = await new Promise<boolean>((resolve) => {
                    const timer = window.setTimeout(() => resolve(false), 12000);
                    existingScript.addEventListener('load', () => {
                        window.clearTimeout(timer);
                        void waitForPlacesAutocomplete().then(resolve);
                    }, { once: true });
                    existingScript.addEventListener('error', () => {
                        window.clearTimeout(timer);
                        resolve(false);
                    }, { once: true });
                });
                if (waited) return true;
                existingScript.remove();
            } else if (await waitForPlacesAutocomplete(2000)) {
                return true;
            } else {
                existingScript.remove();
            }
        }

        const loaded = await new Promise<boolean>((resolve) => {
            const callbackName = `__simpleGooglePlacesInit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const win = window as typeof window & Record<string, unknown>;
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&language=es&region=CL&v=weekly&callback=${callbackName}`;
            script.async = true;
            script.defer = true;
            script.dataset.googlePlacesScript = 'true';
            script.dataset.googlePlacesKey = apiKey;
            win[callbackName] = () => {
                script.dataset.googlePlacesLoaded = 'true';
                delete win[callbackName];
                void waitForPlacesAutocomplete().then(resolve);
            };
            script.onerror = () => {
                script.dataset.googlePlacesFailed = 'true';
                delete win[callbackName];
                resolve(false);
            };
            document.head.appendChild(script);
        });

        return loaded && (await waitForPlacesAutocomplete(2000));
    })().catch(() => false);

    void googlePlacesScriptPromise.then((ok) => {
        if (!ok) googlePlacesScriptPromise = null;
    });

    return googlePlacesScriptPromise;
}

export function GoogleMapIcon() {
    return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 21s7-5.7 7-12a7 7 0 1 0-14 0c0 6.3 7 12 7 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
    );
}

export function ShareIcon() {
    return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M8.8 10.7 15.2 7M8.8 13.3l6.4 3.7M7 15.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM17 8.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM17 21.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export function fieldError(errors: FieldErrorMap | undefined, key: keyof FieldErrorMap) {
    return errors?.[key] ?? null;
}

export function joinClasses(...values: Array<string | false | null | undefined>) {
    return values.filter(Boolean).join(' ');
}

export function Field(props: { label: string; required?: boolean; error?: string | null; hint?: string; children: React.ReactNode }) {
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

export function StyledSelect(props: {
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
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const popoverRef = useRef<HTMLDivElement | null>(null);
    const selectedOption = options.find((option) => option.value === value);
    const popoverPosition = useFloatingPortalPosition(open, triggerRef, popoverRef, [options.length]);

    useFloatingPortalDismiss(open, () => setOpen(false), rootRef, popoverRef);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const listbox = open ? (
        <div
            ref={popoverRef}
            role="listbox"
            className="max-h-64 overflow-auto rounded-xl border p-1.5"
            style={{
                position: 'fixed',
                top: popoverPosition?.top ?? 0,
                left: popoverPosition?.left ?? 0,
                width: popoverPosition?.width ?? undefined,
                visibility: popoverPosition ? 'visible' : 'hidden',
                zIndex: FLOATING_POPOVER_Z_INDEX,
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
                        className="flex h-9 w-full items-center justify-between rounded-lg px-2.5 text-sm transition-colors"
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
    ) : null;

    return (
        <div className="relative w-full" ref={rootRef}>
            <button
                ref={triggerRef}
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
                    className="pointer-events-none absolute right-3 top-1/2 transition-transform"
                    style={{
                        color: 'var(--fg-muted)',
                        transform: `translateY(-50%) rotate(${open ? '180deg' : '0deg'})`,
                    }}
                >
                    ˅
                </span>
            </button>

            {typeof document !== 'undefined' && listbox ? createPortal(listbox, document.body) : null}
        </div>
    );
}


export function addressSummary(address: AddressBookEntry) {
    return [address.label, address.addressLine1, address.communeName, address.regionName].filter(Boolean).join(' · ');
}

export function mapWindowByPrecision(precision: ListingLocation['publicGeoPoint']['precision']) {
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

export function buildOsmUrls(latitude: number, longitude: number, precision: ListingLocation['publicGeoPoint']['precision']) {
    const zoom = mapZoomByPrecision(precision);
    return {
        embedUrl: null,
        imageUrl: `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude.toFixed(6)},${longitude.toFixed(6)}&zoom=${zoom}&size=1200x520&markers=${latitude.toFixed(6)},${longitude.toFixed(6)},red-pushpin`,
        externalUrl: `https://www.openstreetmap.org/?mlat=${latitude.toFixed(6)}&mlon=${longitude.toFixed(6)}#map=15/${latitude.toFixed(6)}/${longitude.toFixed(6)}`,
        providerLabel: 'OpenStreetMap',
    };
}

export function mapZoomByPrecision(precision: ListingLocation['publicGeoPoint']['precision']) {
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

export function buildLocationQuery(location: ListingLocation, mode: 'public' | 'internal'): string {
    return mode === 'internal'
        ? [location.addressLine1, location.communeName, location.regionName, 'Chile'].filter(Boolean).join(', ')
        : [location.publicLabel || location.addressLine1, location.communeName, location.regionName, 'Chile'].filter(Boolean).join(', ');
}

export function buildGoogleMapsUrls(
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

