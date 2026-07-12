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
    kind?: 'option' | 'header';
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
    const existing = document.head.querySelector('style[data-google-pac-styles="true"]');
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.dataset.googlePacStyles = 'true';
    style.dataset.googlePacStylesVersion = '3';
    style.textContent = `
        .location-places-host {
            width: 100%;
            min-width: 0;
            display: flex;
            align-items: stretch;
            box-sizing: border-box;
            height: 42px;
            min-height: 42px;
            padding: 0;
            border: 1px solid var(--border);
            border-radius: var(--radius);
            background-color: var(--bg-subtle);
            overflow: visible;
            transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
        }
        .dark .location-places-host,
        [data-theme="dark"] .location-places-host {
            background-color: var(--bg-muted);
        }
        .location-places-host:focus-within {
            border-color: var(--field-focus-border, var(--accent));
            box-shadow: inset 0 0 0 1px var(--field-focus-border, var(--accent));
            background-color: var(--surface);
        }
        .location-places-host--error {
            border-color: var(--danger, #dc2626);
        }
        .location-places-host--error:focus-within {
            box-shadow: inset 0 0 0 1px var(--danger, #dc2626);
        }
        .location-places-host gmp-place-autocomplete,
        gmp-place-autocomplete.location-places-element {
            width: 100% !important;
            flex: 1 1 auto !important;
            display: block !important;
            box-sizing: border-box !important;
            height: 100% !important;
            min-height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            background: transparent !important;
            background-color: transparent !important;
            color: var(--fg) !important;
            color-scheme: inherit;
            overflow: visible !important;
            outline: none !important;
            box-shadow: none !important;
            --gmp-mat-color-surface: transparent;
            --gmp-mat-color-on-surface: var(--fg, #111);
            --gmp-mat-color-on-surface-variant: var(--fg-muted, #666);
            --gmp-mat-color-primary: var(--accent, #e11d48);
            --gmp-mat-color-outline: transparent;
            --gmp-mat-color-outline-decorative: transparent;
        }
        .location-places-host gmp-place-autocomplete:focus,
        .location-places-host gmp-place-autocomplete:focus-visible,
        .location-places-host gmp-place-autocomplete:focus-within,
        gmp-place-autocomplete.location-places-element:focus,
        gmp-place-autocomplete.location-places-element:focus-visible,
        gmp-place-autocomplete.location-places-element:focus-within {
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
        }
        /* Quita el anillo azul Material de Google */
        gmp-place-autocomplete::part(focus-ring) {
            display: none !important;
            opacity: 0 !important;
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
        }
        gmp-place-autocomplete::part(input) {
            font-family: inherit !important;
            font-size: var(--text-sm, 0.875rem) !important;
            color: var(--fg) !important;
            background: transparent !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            padding: 0 14px !important;
            height: 42px !important;
            min-height: 42px !important;
        }
        gmp-place-autocomplete::part(prediction-list) {
            z-index: 100000 !important;
            border: 1px solid var(--border) !important;
            border-radius: 14px !important;
            background: var(--surface) !important;
            box-shadow: 0 18px 44px rgba(0,0,0,0.16) !important;
            margin-top: 6px !important;
            overflow: hidden !important;
            font-family: inherit !important;
        }
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

export type GooglePlacesAddressAttachment = {
    mode: 'element' | 'legacy';
    destroy: () => void;
    setValue: (value: string) => void;
};

type PlaceAutocompleteElementLike = HTMLElement & {
    value?: string;
    placeholder?: string;
    includedRegionCodes?: string[];
};

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

function getGoogleMaps(): any | null {
    return (window as typeof window & { google?: { maps?: any } }).google?.maps ?? null;
}

async function importPlacesLibrary(): Promise<any | null> {
    const googleMaps = getGoogleMaps();
    if (!googleMaps) return null;
    if (typeof googleMaps.importLibrary === 'function') {
        try {
            return await googleMaps.importLibrary('places');
        } catch {
            return googleMaps.places ?? null;
        }
    }
    return googleMaps.places ?? null;
}

async function resolvePlacesAutocompleteClass(): Promise<GooglePlacesAutocompleteCtor | null> {
    const places = await importPlacesLibrary();
    const googleMaps = getGoogleMaps();
    return places?.Autocomplete ?? googleMaps?.places?.Autocomplete ?? null;
}

async function resolvePlaceAutocompleteElementCtor(): Promise<(new (opts?: Record<string, unknown>) => PlaceAutocompleteElementLike) | null> {
    const places = await importPlacesLibrary();
    const googleMaps = getGoogleMaps();
    return places?.PlaceAutocompleteElement ?? googleMaps?.places?.PlaceAutocompleteElement ?? null;
}

/** Espera Places (element o legacy) tras cargar el script con loading=async. */
async function waitForPlacesReady(maxMs = 12000): Promise<boolean> {
    const started = Date.now();
    while (Date.now() - started < maxMs) {
        if (await resolvePlaceAutocompleteElementCtor()) return true;
        if (await resolvePlacesAutocompleteClass()) return true;
        await sleep(120);
    }
    return false;
}

export function placeFromNewPlacesApi(place: any): GooglePlaceResult {
    const components = Array.isArray(place?.addressComponents)
        ? place.addressComponents.map((component: any) => ({
            long_name: component?.longText || component?.long_name || '',
            short_name: component?.shortText || component?.short_name || '',
            types: Array.isArray(component?.types) ? component.types : [],
        }))
        : place?.address_components;

    const location = place?.location;
    const lat = typeof location?.lat === 'function'
        ? location.lat()
        : (typeof location?.lat === 'number' ? location.lat : undefined);
    const lng = typeof location?.lng === 'function'
        ? location.lng()
        : (typeof location?.lng === 'number' ? location.lng : undefined);

    return {
        address_components: components,
        formatted_address: place?.formattedAddress || place?.formatted_address,
        name: place?.displayName || place?.name,
        geometry: typeof lat === 'number' && typeof lng === 'number'
            ? {
                location: {
                    lat: () => lat,
                    lng: () => lng,
                },
            }
            : undefined,
    };
}

/**
 * Adjunta Places al campo de dirección.
 * Prefiere PlaceAutocompleteElement (API nueva); si no está disponible, usa Autocomplete legacy.
 */
export async function attachGooglePlacesAddressField(options: {
    apiKey: string;
    input: HTMLInputElement;
    host: HTMLElement;
    countryCode?: string;
    placeholder?: string;
    onPlaceSelected: (place: GooglePlaceResult) => void;
    onTextChange?: (value: string) => void;
}): Promise<GooglePlacesAddressAttachment | null> {
    const {
        apiKey,
        input,
        host,
        countryCode = 'cl',
        placeholder,
        onPlaceSelected,
        onTextChange,
    } = options;

    const loaded = await loadGooglePlacesScript(apiKey);
    if (!loaded) return null;
    ensureGooglePlacesDropdownStyles();

    const resetToNativeInput = () => {
        host.replaceChildren();
        host.classList.add('hidden');
        input.classList.remove('hidden');
        input.removeAttribute('aria-hidden');
        input.tabIndex = 0;
    };

    const attachLegacyAutocomplete = async (): Promise<GooglePlacesAddressAttachment | null> => {
        const Autocomplete = await resolvePlacesAutocompleteClass();
        if (!Autocomplete) return null;

        resetToNativeInput();

        try {
            const autocomplete = new Autocomplete(input, {
                componentRestrictions: { country: countryCode.toLowerCase() },
                fields: ['address_components', 'formatted_address', 'geometry', 'name'],
            });
            const googleMaps = getGoogleMaps();
            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace?.() as GooglePlaceResult | undefined;
                if (!place) return;
                onPlaceSelected(place);
            });

            return {
                mode: 'legacy',
                setValue: (value: string) => {
                    input.value = value;
                },
                destroy: () => {
                    if (googleMaps?.event?.clearInstanceListeners) {
                        googleMaps.event.clearInstanceListeners(autocomplete);
                    }
                },
            };
        } catch {
            return null;
        }
    };

    const PlaceAutocompleteElement = await resolvePlaceAutocompleteElementCtor();
    if (PlaceAutocompleteElement) {
        try {
            host.replaceChildren();
            const element = new PlaceAutocompleteElement({
                includedRegionCodes: [countryCode.toLowerCase()],
            });
            element.classList.add('location-places-element');
            try {
                element.style.setProperty('border', 'none');
                element.style.setProperty('background-color', 'transparent');
                element.style.setProperty('outline', 'none');
                element.style.setProperty('box-shadow', 'none');
                element.style.setProperty('color-scheme', 'inherit');
            } catch {
                // ignore
            }
            if (placeholder) {
                try {
                    element.placeholder = placeholder;
                } catch {
                    // Algunos builds no exponen placeholder.
                }
            }
            if (input.value) {
                try {
                    element.value = input.value;
                } catch {
                    // ignore
                }
            }
            input.classList.add('hidden');
            input.setAttribute('aria-hidden', 'true');
            input.tabIndex = -1;
            host.classList.remove('hidden');
            host.appendChild(element);

            const handleSelect = async (event: Event) => {
                const anyEvent = event as Event & {
                    placePrediction?: { toPlace?: () => any };
                    place?: any;
                    detail?: {
                        placePrediction?: { toPlace?: () => any };
                        place?: any;
                    };
                };
                const prediction = anyEvent.placePrediction
                    ?? anyEvent.detail?.placePrediction
                    ?? null;
                const directPlace = anyEvent.place ?? anyEvent.detail?.place ?? null;

                let placeObj = directPlace;
                if (!placeObj && prediction?.toPlace) {
                    placeObj = prediction.toPlace();
                }
                if (!placeObj) return;

                if (typeof placeObj.fetchFields === 'function') {
                    await placeObj.fetchFields({
                        fields: ['displayName', 'formattedAddress', 'location', 'addressComponents'],
                    });
                }

                const normalized = placeFromNewPlacesApi(placeObj);
                const nextValue = buildAddressLineFromPlace(normalized).trim()
                    || normalized.formatted_address
                    || '';
                if (nextValue) {
                    input.value = nextValue;
                    try {
                        element.value = nextValue;
                    } catch {
                        // ignore
                    }
                }
                onPlaceSelected(normalized);
            };

            const handleInput = () => {
                const value = String((element as PlaceAutocompleteElementLike).value ?? '');
                input.value = value;
                onTextChange?.(value);
            };

            element.addEventListener('gmp-select', handleSelect as EventListener);
            element.addEventListener('gmp-placeselect', handleSelect as EventListener);
            element.addEventListener('input', handleInput);

            return {
                mode: 'element',
                setValue: (value: string) => {
                    try {
                        element.value = value;
                    } catch {
                        // ignore
                    }
                    input.value = value;
                },
                destroy: () => {
                    element.removeEventListener('gmp-select', handleSelect as EventListener);
                    element.removeEventListener('gmp-placeselect', handleSelect as EventListener);
                    element.removeEventListener('input', handleInput);
                    element.remove();
                    resetToNativeInput();
                },
            };
        } catch {
            resetToNativeInput();
        }
    }

    return attachLegacyAutocomplete();
}

/** @deprecated Usa attachGooglePlacesAddressField. */
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
        if (await waitForPlacesReady(400)) return true;

        const existing = document.querySelector<HTMLScriptElement>('script[data-google-places-script="true"]');
        if (existing) {
            if (existing.dataset.googlePlacesFailed === 'true') {
                existing.remove();
            } else if (existing.dataset.googlePlacesLoaded !== 'true') {
                const waited = await new Promise<boolean>((resolve) => {
                    const timer = window.setTimeout(() => resolve(false), 12000);
                    existing.addEventListener('load', () => {
                        window.clearTimeout(timer);
                        void waitForPlacesReady().then(resolve);
                    }, { once: true });
                    existing.addEventListener('error', () => {
                        window.clearTimeout(timer);
                        resolve(false);
                    }, { once: true });
                });
                if (waited) return true;
                existing.remove();
            } else if (await waitForPlacesReady(2000)) {
                return true;
            } else {
                existing.remove();
            }
        }

        const loaded = await new Promise<boolean>((resolve) => {
            const callbackName = `__simpleGooglePlacesInit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const win = window as typeof window & Record<string, unknown>;
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&language=es&region=CL&v=weekly&loading=async&callback=${callbackName}`;
            script.async = true;
            script.defer = true;
            script.dataset.googlePlacesScript = 'true';
            script.dataset.googlePlacesKey = apiKey;
            win[callbackName] = () => {
                script.dataset.googlePlacesLoaded = 'true';
                delete win[callbackName];
                void waitForPlacesReady().then(resolve);
            };
            script.onerror = () => {
                script.dataset.googlePlacesFailed = 'true';
                delete win[callbackName];
                resolve(false);
            };
            document.head.appendChild(script);
        });

        return loaded && (await waitForPlacesReady(2000));
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
    const value = errors?.[key];
    return value?.trim() ? value : null;
}

export function fieldInvalid(errors: FieldErrorMap | undefined, key: keyof FieldErrorMap) {
    return Boolean(errors && Object.prototype.hasOwnProperty.call(errors, key));
}

const LISTING_LOCATION_ERROR_KEYS = ['regionId', 'communeId', 'addressLine1', 'sourceAddressId'] as const;

export function pickListingLocationFieldErrors(
    fieldErrors: Record<string, string> | undefined,
    prefix = 'location',
): FieldErrorMap {
    if (!fieldErrors) return {};
    const out: FieldErrorMap = {};
    for (const key of LISTING_LOCATION_ERROR_KEYS) {
        const fullKey = `${prefix}.${key}`;
        if (Object.prototype.hasOwnProperty.call(fieldErrors, fullKey)) {
            out[key] = fieldErrors[fullKey];
        }
    }
    return out;
}

export function joinClasses(...values: Array<string | false | null | undefined>) {
    return values.filter(Boolean).join(' ');
}

export function Field(props: { label: string; required?: boolean; error?: string | null; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--fg-secondary)' }}>
                {props.label}
                {props.required ? <span className="text-(--color-error)"> *</span> : null}
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
    invalid?: boolean;
}) {
    const { value, onChange, options, placeholder = 'Seleccionar', disabled = false, ariaLabel, invalid = false } = props;
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
                if (option.kind === 'header') {
                    return (
                        <div
                            key={`${option.value}-${option.label}`}
                            className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide"
                            style={{ color: 'var(--fg-muted)' }}
                        >
                            {option.label}
                        </div>
                    );
                }
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
                className={joinClasses('form-input flex items-center text-left', invalid && 'form-input-error')}
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

function sortAddressBookEntries(entries: AddressBookEntry[]): AddressBookEntry[] {
    return [...entries].sort((left, right) => {
        if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
        return (right.updatedAt ?? 0) - (left.updatedAt ?? 0);
    });
}

export function listPublishAddressBookEntries(
    addressBook: AddressBookEntry[],
    vertical?: 'autos' | 'propiedades' | 'serenatas',
): AddressBookEntry[] {
    const business = sortAddressBookEntries(
        addressBook.filter((entry) => entry.scope === 'business' && (
            !vertical || entry.vertical === vertical || entry.vertical == null
        )),
    );
    const personal = sortAddressBookEntries(
        addressBook.filter((entry) => entry.scope === 'personal'),
    );
    return [...business, ...personal];
}

export function buildSavedAddressSelectOptions(
    addressBook: AddressBookEntry[],
    vertical?: 'autos' | 'propiedades' | 'serenatas',
): SelectOption[] {
    const business = sortAddressBookEntries(
        addressBook.filter((entry) => entry.scope === 'business' && (
            !vertical || entry.vertical === vertical || entry.vertical == null
        )),
    );
    const personal = sortAddressBookEntries(
        addressBook.filter((entry) => entry.scope === 'personal'),
    );

    const options: SelectOption[] = [
        { value: '__new__', label: 'Nueva dirección' },
    ];

    if (business.length > 0) {
        options.push({ value: '__header_business__', label: 'Negocio', kind: 'header' });
        for (const entry of business) {
            options.push({ value: entry.id, label: addressSummary(entry) });
        }
    }

    if (personal.length > 0) {
        options.push({ value: '__header_personal__', label: 'Personal', kind: 'header' });
        for (const entry of personal) {
            options.push({ value: entry.id, label: addressSummary(entry) });
        }
    }

    return options;
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
    const { latDelta, lonDelta } = mapWindowByPrecision(precision);
    const south = latitude - latDelta;
    const north = latitude + latDelta;
    const west = longitude - lonDelta;
    const east = longitude + lonDelta;
    const lat = latitude.toFixed(6);
    const lon = longitude.toFixed(6);
    return {
        // staticmap.openstreetmap.de dejó de resolver DNS; usamos el embed oficial.
        embedUrl: `https://www.openstreetmap.org/export/embed.html?bbox=${west.toFixed(6)}%2C${south.toFixed(6)}%2C${east.toFixed(6)}%2C${north.toFixed(6)}&layer=mapnik&marker=${lat}%2C${lon}`,
        imageUrl: null as string | null,
        externalUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`,
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

    const key = embedKey?.trim() || '';
    const hasCoords = latitude != null && longitude != null;

    return {
        embedUrl: key
            ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(previewTarget || searchTarget)}&zoom=${zoom}`
            : null,
        imageUrl: key && hasCoords
            ? `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(previewTarget)}&zoom=${zoom}&size=640x320&scale=2&maptype=roadmap&markers=${encodeURIComponent(`color:red|${previewTarget}`)}&key=${encodeURIComponent(key)}`
            : null,
        externalUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchTarget || previewTarget)}`,
        providerLabel: 'Google Maps',
    };
}

