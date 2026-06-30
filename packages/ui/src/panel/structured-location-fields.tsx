'use client';

import { useEffect, useMemo, useState } from 'react';
import type { StructuredLocation } from '@simple/types';
import type { CatalogCommune } from '@simple/utils';
import {
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
import { PanelSelect } from './panel-select.js';
import { PANEL_INPUT_CLASS } from './panel-form-classes.js';
import { FLOATING_POPOVER_Z_INDEX } from '../floating-portal.js';
import {
    PANEL_DROPDOWN_POPOVER_CLASS,
    PANEL_DROPDOWN_POPOVER_STYLE,
    panelDropdownItemStyle,
} from '../shared/select-options.js';
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
                className={PANEL_INPUT_CLASS}
                placeholder={placeholder}
                autoComplete="address-level2"
            />
            {open && suggestions.length > 0 ? (
                <ul
                    className={`absolute mt-1.5 w-full ${PANEL_DROPDOWN_POPOVER_CLASS}`}
                    style={{ ...PANEL_DROPDOWN_POPOVER_STYLE, zIndex: FLOATING_POPOVER_Z_INDEX }}
                >
                    {suggestions.map((item) => {
                        const selected = item.name === value;
                        return (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    className="flex h-9 w-full items-center rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-(--bg-muted)"
                                    style={panelDropdownItemStyle(selected)}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        onSelect(item);
                                        setQuery(item.name);
                                        setOpen(false);
                                    }}
                                >
                                    <span className="truncate">{item.name}</span>
                                </button>
                            </li>
                        );
                    })}
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
    showTimezonePreview?: boolean;
};

export function StructuredLocationFields({
    value,
    onChange,
    disabled,
    regionLabel,
    localityLabel,
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
            <PanelField label="País" className="w-full">
                <PanelSelect
                    value={normalized.countryCode}
                    disabled={disabled}
                    onChange={(e) => setPartial({
                        countryCode: e.target.value,
                        regionId: null,
                        regionName: null,
                        localityId: null,
                        localityName: null,
                    })}
                >
                    {getSupportedCountries().map((item) => (
                        <option key={item.code} value={item.code}>{item.name}</option>
                    ))}
                </PanelSelect>
                {catalogLoading && hasInternationalCatalog(normalized.countryCode) ? (
                    <p className="mt-1.5 text-xs text-fg-muted">Cargando regiones y ciudades…</p>
                ) : null}
            </PanelField>

            <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                {hasCatalog ? (
                    <>
                        <PanelField label={resolvedRegionLabel} className="min-w-0">
                            <PanelSelect
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
                            >
                                <option value="">{labels.regionPlaceholder}</option>
                                {regions.map((item) => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </PanelSelect>
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
                                <PanelSelect
                                    value={normalized.localityId ?? ''}
                                    disabled={disabled || !normalized.regionId}
                                    onChange={(e) => {
                                        const nextLocality = localities.find((l) => l.id === e.target.value);
                                        setPartial({
                                            localityId: nextLocality?.id ?? null,
                                            localityName: nextLocality?.name ?? null,
                                        });
                                    }}
                                >
                                    <option value="">{labels.localityPlaceholder}</option>
                                    {localities.map((item) => (
                                        <option key={item.id} value={item.id}>{item.name}</option>
                                    ))}
                                </PanelSelect>
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
        </div>
    );
}
