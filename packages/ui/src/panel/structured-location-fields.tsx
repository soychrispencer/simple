'use client';

import { useEffect, useMemo, useState } from 'react';
import type { StructuredLocation } from '@simple/types';
import type { CatalogCommune } from '@simple/utils';
import {
    formatStructuredLocationLabel,
    getCountryByCode,
    getLocationFieldLabels,
    getLocalitiesForRegionAsync,
    getRegionsForCountryAsync,
    getSupportedCountries,
    hasInternationalCatalog,
    inferTimezoneFromStructuredLocation,
    normalizeStructuredLocation,
    timezoneOptionLabel,
    timezoneShortLabel,
} from '@simple/utils';
import { PanelField } from './panel-display.js';

const INPUT_CLASS = 'form-input min-w-0 w-full';
const LARGE_LOCALITY_THRESHOLD = 300;

type LocalitySearchFieldProps = {
    localities: CatalogCommune[];
    value: string;
    disabled?: boolean;
    placeholder: string;
    onSelect: (locality: CatalogCommune | null) => void;
};

function LocalitySearchField({
    localities,
    value,
    disabled,
    placeholder,
    onSelect,
}: LocalitySearchFieldProps) {
    const [query, setQuery] = useState(value);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setQuery(value);
    }, [value]);

    const suggestions = useMemo(() => {
        const trimmed = query.trim().toLowerCase();
        if (!trimmed) return localities.slice(0, 40);
        return localities
            .filter((item) => item.name.toLowerCase().includes(trimmed))
            .slice(0, 40);
    }, [localities, query]);

    const commitQuery = () => {
        const exact = localities.find(
            (item) => item.name.toLowerCase() === query.trim().toLowerCase(),
        );
        onSelect(exact ?? null);
        setOpen(false);
    };

    return (
        <div className="relative min-w-0">
            <input
                type="text"
                value={query}
                disabled={disabled}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => {
                    window.setTimeout(() => {
                        commitQuery();
                    }, 120);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        commitQuery();
                    }
                }}
                className={INPUT_CLASS}
                placeholder={placeholder}
                autoComplete="address-level2"
            />
            {open && suggestions.length > 0 ? (
                <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-md border border-border bg-bg shadow-md">
                    {suggestions.map((item) => (
                        <li key={item.id}>
                            <button
                                type="button"
                                className="block w-full px-3 py-2 text-left text-sm hover:bg-bg-muted"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    onSelect(item);
                                    setQuery(item.name);
                                    setOpen(false);
                                }}
                            >
                                {item.name}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}

export type StructuredLocationFieldsProps = {
    value: StructuredLocation;
    onChange: (next: StructuredLocation) => void;
    disabled?: boolean;
    regionLabel?: string;
    localityLabel?: string;
    showCountry?: boolean;
    showTimezonePreview?: boolean;
};

export function StructuredLocationFields({
    value,
    onChange,
    disabled,
    regionLabel,
    localityLabel,
    showCountry = true,
    showTimezonePreview = false,
}: StructuredLocationFieldsProps) {
    const normalized = useMemo(() => normalizeStructuredLocation(value), [value]);
    const country = getCountryByCode(normalized.countryCode);
    const labels = useMemo(
        () => getLocationFieldLabels(normalized.countryCode),
        [normalized.countryCode],
    );
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [regions, setRegions] = useState<Awaited<ReturnType<typeof getRegionsForCountryAsync>>>([]);
    const [localities, setLocalities] = useState<CatalogCommune[]>([]);

    useEffect(() => {
        let cancelled = false;
        setCatalogLoading(true);
        getRegionsForCountryAsync(normalized.countryCode)
            .then((nextRegions) => {
                if (!cancelled) setRegions(nextRegions);
            })
            .finally(() => {
                if (!cancelled) setCatalogLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [normalized.countryCode]);

    useEffect(() => {
        if (!normalized.regionId) {
            setLocalities([]);
            return;
        }
        let cancelled = false;
        getLocalitiesForRegionAsync(normalized.countryCode, normalized.regionId)
            .then((nextLocalities) => {
                if (!cancelled) setLocalities(nextLocalities);
            });
        return () => {
            cancelled = true;
        };
    }, [normalized.countryCode, normalized.regionId]);

    const hasCatalog = country?.hasFullCatalog ?? false;
    const useLocalitySearch = localities.length > LARGE_LOCALITY_THRESHOLD;
    const resolvedRegionLabel = regionLabel ?? labels.region;
    const resolvedLocalityLabel = localityLabel ?? labels.locality;
    const previewTimezone = useMemo(
        () => inferTimezoneFromStructuredLocation(normalized),
        [normalized],
    );

    const setPartial = (patch: Partial<StructuredLocation>) => {
        onChange(normalizeStructuredLocation({ ...normalized, ...patch }));
    };

    return (
        <div className="flex w-full min-w-0 flex-col gap-4">
            {showCountry ? (
                <PanelField label="País" className="w-full">
                    <select
                        value={normalized.countryCode}
                        disabled={disabled}
                        onChange={(e) => setPartial({
                            countryCode: e.target.value,
                            regionId: null,
                            regionName: null,
                            localityId: null,
                            localityName: null,
                        })}
                        className={INPUT_CLASS}
                    >
                        {getSupportedCountries().map((item) => (
                            <option key={item.code} value={item.code}>{item.name}</option>
                        ))}
                    </select>
                    {catalogLoading && hasInternationalCatalog(normalized.countryCode) ? (
                        <p className="mt-1.5 text-xs text-fg-muted">Cargando regiones y ciudades…</p>
                    ) : null}
                </PanelField>
            ) : null}

            <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                {hasCatalog ? (
                    <>
                        <PanelField label={resolvedRegionLabel} className="min-w-0">
                            <select
                                value={normalized.regionId ?? ''}
                                disabled={disabled || catalogLoading}
                                onChange={(e) => {
                                    const nextRegion = regions.find((r) => r.id === e.target.value);
                                    setPartial({
                                        regionId: nextRegion?.id ?? null,
                                        regionName: nextRegion?.name ?? null,
                                        localityId: null,
                                        localityName: null,
                                    });
                                }}
                                className={INPUT_CLASS}
                            >
                                <option value="">{labels.regionPlaceholder}</option>
                                {regions.map((item) => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </select>
                        </PanelField>
                        <PanelField label={resolvedLocalityLabel} className="min-w-0">
                            {useLocalitySearch ? (
                                <LocalitySearchField
                                    localities={localities}
                                    value={normalized.localityName ?? ''}
                                    disabled={disabled || !normalized.regionId}
                                    placeholder={labels.localityPlaceholder}
                                    onSelect={(nextLocality) => setPartial({
                                        localityId: nextLocality?.id ?? null,
                                        localityName: nextLocality?.name ?? null,
                                    })}
                                />
                            ) : (
                                <select
                                    value={normalized.localityId ?? ''}
                                    disabled={disabled || !normalized.regionId}
                                    onChange={(e) => {
                                        const nextLocality = localities.find((l) => l.id === e.target.value);
                                        setPartial({
                                            localityId: nextLocality?.id ?? null,
                                            localityName: nextLocality?.name ?? null,
                                        });
                                    }}
                                    className={INPUT_CLASS}
                                >
                                    <option value="">{labels.localityPlaceholder}</option>
                                    {localities.map((item) => (
                                        <option key={item.id} value={item.id}>{item.name}</option>
                                    ))}
                                </select>
                            )}
                        </PanelField>
                    </>
                ) : null}
            </div>

            {showTimezonePreview ? (
                <p className="text-xs text-fg-muted">
                    Zona horaria: {timezoneOptionLabel(previewTimezone)} ({timezoneShortLabel(previewTimezone)})
                </p>
            ) : null}

            <p className="text-xs text-fg-muted">
                Vista previa: {formatStructuredLocationLabel(normalized)}
            </p>
        </div>
    );
}
