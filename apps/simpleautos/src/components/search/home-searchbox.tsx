'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
    IconAdjustmentsHorizontal,
    IconChevronDown,
    IconMapPin,
    IconSearch,
    IconX,
} from '@tabler/icons-react';
import ModernSelect from '@/components/ui/modern-select';
import { PanelButton } from '@simple/ui';
import { loadPublishWizardCatalog, type CatalogBrand, type CatalogModel } from '@/lib/publish-wizard-catalog';
import { LOCATION_REGIONS, getCommunesForRegion } from '@simple/utils';

type AutosTab = 'comprar' | 'arrendar' | 'subastas';

type VehicleType = 'car' | 'motorcycle' | 'truck' | 'bus' | 'machinery' | 'nautical' | 'aerial';

type AutosFilters = {
    tab: AutosTab;
    query: string;
    region: string;
    commune: string;
    priceFrom: string;
    priceTo: string;
    brand: string;
    model: string;
    yearFrom: string;
    yearTo: string;
    fuel: string;
    vehicleType: VehicleType | '';
};

type Suggestion = {
    label: string;
    hint: string;
    brand?: string;
    fuel?: string;
};

const STORAGE_KEY = 'simpleautos:home-searchbox-v2';

const DEFAULT_FILTERS: AutosFilters = {
    tab: 'comprar',
    query: '',
    region: '',
    commune: '',
    priceFrom: '',
    priceTo: '',
    brand: '',
    model: '',
    yearFrom: '',
    yearTo: '',
    fuel: '',
    vehicleType: '',
};

const VEHICLE_TYPE_OPTIONS = [
    { value: 'car', label: 'Autos y SUV' },
    { value: 'motorcycle', label: 'Motos' },
    { value: 'truck', label: 'Camiones' },
    { value: 'bus', label: 'Buses' },
    { value: 'machinery', label: 'Maquinaria' },
    { value: 'nautical', label: 'Náutica' },
    { value: 'aerial', label: 'Aéreos' },
];

const TAB_META: Record<
    AutosTab,
    {
        label: string;
        href: string;
        placeholder: string;
    }
> = {
    comprar: {
        label: 'Comprar',
        href: '/ventas',
        placeholder: 'Marca, modelo o versión',
    },
    arrendar: {
        label: 'Arrendar',
        href: '/arriendos',
        placeholder: 'Modelo para arriendo',
    },
    subastas: {
        label: 'Subastas',
        href: '/subastas',
        placeholder: 'Lote, marca o categoría',
    },
};

const SUGGESTIONS_BY_TAB: Record<AutosTab, Suggestion[]> = {
    comprar: [
        { label: 'Toyota Corolla Cross', hint: 'SUV · Híbrido', brand: 'toyota', fuel: 'hibrido' },
        { label: 'Hyundai Tucson', hint: 'SUV · Automático', brand: 'hyundai' },
        { label: 'Kia Sportage', hint: 'SUV · Bencina', brand: 'kia', fuel: 'bencina' },
        { label: 'BYD Song Plus', hint: 'SUV · Eléctrico', brand: 'byd', fuel: 'electrico' },
        { label: 'Pick-up 4x4', hint: 'Trabajo y flota' },
    ],
    arrendar: [
        { label: 'SUV para viaje', hint: 'Automático · 5 plazas' },
        { label: 'City car económico', hint: 'Bajo consumo', fuel: 'bencina' },
        { label: 'Van 7 pasajeros', hint: 'Turismo y traslados' },
        { label: 'Camioneta para obra', hint: 'Trabajo diario' },
    ],
    subastas: [
        { label: 'Subastas activas en Santiago', hint: 'Lotes del día' },
        { label: 'SUV bajo 10M', hint: 'Puja competitiva', fuel: 'bencina' },
        { label: 'Híbridos disponibles', hint: 'Menor consumo', fuel: 'hibrido' },
        { label: 'Pickups comerciales', hint: 'Uso mixto' },
    ],
};

const FUEL_OPTIONS = [
    { value: 'bencina', label: 'Bencina' },
    { value: 'diesel', label: 'Diésel' },
    { value: 'hibrido', label: 'Híbrido' },
    { value: 'electrico', label: 'Eléctrico' },
];

const CURRENT_YEAR = new Date().getFullYear() + 1;
const YEAR_OPTIONS = Array.from({ length: 26 }, (_, index) => String(CURRENT_YEAR - index));

function isAutosTab(value: string): value is AutosTab {
    return value === 'comprar' || value === 'arrendar' || value === 'subastas';
}

function normalizeText(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function parseAutosIntent(query: string, brands: CatalogBrand[], models: CatalogModel[]): Partial<AutosFilters> {
    const normalized = normalizeText(query);
    if (!normalized) return {};

    const intent: Partial<AutosFilters> = {};

    const matchedRegion = LOCATION_REGIONS.find((region) => normalized.includes(normalizeText(region.name)));
    if (matchedRegion) intent.region = matchedRegion.id;

    const matchedBrand = brands.find((brand) => normalized.includes(normalizeText(brand.name)));
    if (matchedBrand) {
        intent.brand = matchedBrand.id;
        const brandModels = models.filter((m) => m.brandId === matchedBrand.id);
        const matchedModel = brandModels.find((model) => normalized.includes(normalizeText(model.name)));
        if (matchedModel) intent.model = matchedModel.id;
    }

    if (/\bhibrid/.test(normalized)) intent.fuel = 'hibrido';
    else if (/\bdiesel|di[eé]sel/.test(normalized)) intent.fuel = 'diesel';
    else if (/\belectr/.test(normalized)) intent.fuel = 'electrico';
    else if (/\bbencina|gasolina/.test(normalized)) intent.fuel = 'bencina';

    return intent;
}

function mergeFiltersWithIntent(base: AutosFilters, intent: Partial<AutosFilters>): AutosFilters {
    const merged = { ...base };
    if (intent.region) merged.region = intent.region;
    if (intent.brand) merged.brand = intent.brand;
    else merged.brand = '';
    if (intent.model) merged.model = intent.model;
    else merged.model = '';
    if (intent.fuel) merged.fuel = intent.fuel;
    else merged.fuel = '';
    return merged;
}

function buildSearchParams(filters: AutosFilters): URLSearchParams {
    const params = new URLSearchParams();
    const query = filters.query.trim();
    if (query) params.set('q', query);
    if (filters.region) params.set('region', filters.region);
    if (filters.commune) params.set('commune', filters.commune);
    if (filters.priceFrom) params.set('price_from', filters.priceFrom);
    if (filters.priceTo) params.set('price_to', filters.priceTo);
    if (filters.brand) params.set('brand', filters.brand);
    if (filters.model) params.set('model', filters.model);
    if (filters.yearFrom) params.set('year_from', filters.yearFrom);
    if (filters.yearTo) params.set('year_to', filters.yearTo);
    if (filters.fuel) params.set('fuel', filters.fuel);
    if (filters.vehicleType) params.set('vehicle_type', filters.vehicleType);
    return params;
}

function readFiltersFromStorage(): AutosFilters {
    if (typeof window === 'undefined') return DEFAULT_FILTERS;

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_FILTERS;
        const parsed = JSON.parse(raw) as Partial<AutosFilters>;
        const safeTab: AutosTab = typeof parsed.tab === 'string' && isAutosTab(parsed.tab) ? parsed.tab : DEFAULT_FILTERS.tab;
        return {
            ...DEFAULT_FILTERS,
            ...parsed,
            tab: safeTab,
        };
    } catch {
        return DEFAULT_FILTERS;
    }
}

function writeFiltersToStorage(filters: AutosFilters): void {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
        // Ignorar errores de storage en modo privado/cuota.
    }
}

function readFiltersFromURL(searchParams: URLSearchParams): Partial<AutosFilters> {
    const filters: Partial<AutosFilters> = {};
    
    const q = searchParams.get('q');
    if (q) filters.query = q;
    
    const region = searchParams.get('region');
    if (region) filters.region = region;
    
    const commune = searchParams.get('commune');
    if (commune) filters.commune = commune;
    
    const priceFrom = searchParams.get('price_from');
    if (priceFrom) filters.priceFrom = priceFrom;
    
    const priceTo = searchParams.get('price_to');
    if (priceTo) filters.priceTo = priceTo;
    
    const brand = searchParams.get('brand');
    if (brand) filters.brand = brand;
    
    const model = searchParams.get('model');
    if (model) filters.model = model;
    
    const yearFrom = searchParams.get('year_from');
    if (yearFrom) filters.yearFrom = yearFrom;
    
    const yearTo = searchParams.get('year_to');
    if (yearTo) filters.yearTo = yearTo;
    
    const fuel = searchParams.get('fuel');
    if (fuel) filters.fuel = fuel;
    
    const vehicleType = searchParams.get('vehicle_type');
    if (vehicleType && ['car', 'motorcycle', 'truck', 'bus', 'machinery', 'nautical', 'aerial'].includes(vehicleType)) {
        filters.vehicleType = vehicleType as VehicleType;
    }
    
    return filters;
}

export default function HomeSearchBox() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [filters, setFilters] = useState<AutosFilters>(DEFAULT_FILTERS);
    const [hydrated, setHydrated] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSuggestion, setActiveSuggestion] = useState(-1);
    const [catalog, setCatalog] = useState<{ brands: CatalogBrand[]; models: CatalogModel[] } | null>(null);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const inputWrapRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const storageFilters = readFiltersFromStorage();
        const urlFilters = readFiltersFromURL(searchParams);
        // URL tiene prioridad sobre localStorage
        const mergedFilters = { ...storageFilters, ...urlFilters };
        setFilters(mergedFilters);
        setHydrated(true);
        loadPublishWizardCatalog()
            .then(setCatalog)
            .catch(() => {
                // Error silencioso - el catálogo se mantendrá null
            })
            .finally(() => setCatalogLoading(false));
    }, [searchParams]);

    useEffect(() => {
        if (!hydrated) return;
        // Debounce para evitar escrituras excesivas a localStorage
        const timer = setTimeout(() => {
            writeFiltersToStorage(filters);
        }, 300);
        return () => clearTimeout(timer);
    }, [filters, hydrated]);

    useEffect(() => {
        const onPointerDown = (event: PointerEvent) => {
            if (!inputWrapRef.current?.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        window.addEventListener('pointerdown', onPointerDown);
        return () => window.removeEventListener('pointerdown', onPointerDown);
    }, []);

    const tabMeta = TAB_META[filters.tab];

    const selectedVehicleType = filters.vehicleType || 'car';
    const brandOptions = catalog?.brands.filter(b => b.vehicleTypes.includes(selectedVehicleType)).map(b => ({ value: b.id, label: b.name })) || [];
    const modelOptions = catalog?.models.filter(m => m.brandId === filters.brand && m.vehicleTypes.includes(selectedVehicleType)).map(m => ({ value: m.id, label: m.name })) || [];
    const regionOptions = LOCATION_REGIONS.map(r => ({ value: r.id, label: r.name }));
    const communeOptions = getCommunesForRegion(filters.region).map(c => ({ value: c.id, label: c.name }));

    const suggestions = useMemo(() => {
        const query = filters.query.trim().toLowerCase();
        if (query.length < 2) return [];

        return SUGGESTIONS_BY_TAB[filters.tab]
            .filter((item) => {
                const searchable = `${item.label} ${item.hint}`.toLowerCase();
                return searchable.includes(query);
            })
            .slice(0, 6);
    }, [filters.query, filters.tab]);

    const handleSubmit = (event?: FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        let resolvedFilters = filters;
        if (catalog) {
            const intent = parseAutosIntent(filters.query, catalog.brands, catalog.models);
            resolvedFilters = mergeFiltersWithIntent(filters, intent);
            setFilters(resolvedFilters);
        }
        
        const params = buildSearchParams(resolvedFilters);
        const queryString = params.toString();
        router.push(queryString ? `${tabMeta.href}?${queryString}` : tabMeta.href);
        setShowSuggestions(false);
        setActiveSuggestion(-1);
    };

    const applySuggestion = (suggestion: Suggestion) => {
        setFilters((current) => ({
            ...current,
            query: suggestion.label,
            brand: suggestion.brand ?? current.brand,
            fuel: suggestion.fuel ?? current.fuel,
        }));
        setShowSuggestions(false);
        setActiveSuggestion(-1);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions || suggestions.length === 0) return;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                setActiveSuggestion((prev) => 
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                event.preventDefault();
                setActiveSuggestion((prev) => 
                    prev > 0 ? prev - 1 : suggestions.length - 1
                );
                break;
            case 'Enter':
                if (activeSuggestion >= 0) {
                    event.preventDefault();
                    applySuggestion(suggestions[activeSuggestion]);
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                setActiveSuggestion(-1);
                break;
        }
    };

    return (
        <section className="container-app relative z-11 mt-0 mb-10">
            <div
                className="rounded-[22px] border overflow-visible"
                style={{
                    borderColor: 'var(--border)',
                    background: 'var(--surface)',
                    boxShadow: '0 16px 46px rgba(0,0,0,0.12)',
                }}
            >
                <div className="flex flex-nowrap items-center justify-between gap-2 px-3 sm:px-4 pt-3 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div className="inline-flex rounded-xl p-1 flex-1 min-w-0 overflow-x-auto" style={{ background: 'var(--bg-subtle)', scrollbarWidth: 'none' }}>
                        {(Object.keys(TAB_META) as AutosTab[]).map((tabKey) => (
                            <button
                                key={tabKey}
                                type="button"
                                onClick={() => setFilters((current) => ({ ...current, tab: tabKey }))}
                                className="h-8 sm:h-9 px-3 sm:px-4 text-sm font-medium rounded-md border transition-all shrink-0 hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                                style={{
                                    background: filters.tab === tabKey ? 'var(--button-primary-bg)' : 'transparent',
                                    color: filters.tab === tabKey ? 'var(--button-primary-color)' : 'var(--fg-secondary)',
                                    borderColor: filters.tab === tabKey ? 'var(--button-primary-border)' : 'transparent',
                                }}
                            >
                                {TAB_META[tabKey].label}
                            </button>
                        ))}
                    </div>

                    <PanelButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8 w-8 shrink-0 justify-center px-0 sm:h-9 sm:w-auto sm:px-3"
                        onClick={() => setShowAdvanced((current) => !current)}
                        aria-label="Mostrar filtros avanzados"
                    >
                        <IconAdjustmentsHorizontal size={15} />
                        <span className="hidden sm:inline">Más filtros</span>
                        <IconChevronDown
                            size={14}
                            className="hidden sm:inline"
                            style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 180ms ease' }}
                        />
                    </PanelButton>
                </div>

                <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-3">
                    <div className="flex flex-col md:flex-row gap-2.5 items-stretch">
                        <div className="flex-1 relative" ref={inputWrapRef}>
                            <IconSearch size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--fg-muted)' }} />
                            <input
                                ref={inputRef}
                                type="text"
                                value={filters.query}
                                onFocus={() => {
                                    setShowSuggestions(true);
                                    setActiveSuggestion(-1);
                                }}
                                onChange={(event) => {
                                    setFilters((current) => ({ ...current, query: event.target.value }));
                                    setActiveSuggestion(-1);
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder={tabMeta.placeholder}
                                className="form-input h-11"
                                style={{ paddingLeft: '2.75rem', paddingRight: '2.5rem' }}
                                aria-expanded={showSuggestions}
                                aria-autocomplete="list"
                                aria-controls={showSuggestions ? 'search-suggestions' : undefined}
                                aria-activedescendant={activeSuggestion >= 0 ? `suggestion-${activeSuggestion}` : undefined}
                            />
                            {filters.query ? (
                                <button
                                    type="button"
                                    aria-label="Limpiar búsqueda"
                                    onClick={() => setFilters((current) => ({ ...current, query: '' }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full inline-flex items-center justify-center"
                                    style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}
                                >
                                    <IconX size={12} />
                                </button>
                            ) : null}

                            {showSuggestions && suggestions.length > 0 ? (
                                <div
                                    id="search-suggestions"
                                    role="listbox"
                                    className="absolute left-0 right-0 top-[calc(100%+0.35rem)] rounded-xl border overflow-hidden z-30"
                                    style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-lg)' }}
                                >
                                    <div className="px-3 py-1.5 text-xs border-b" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)', background: 'var(--bg-subtle)' }}>
                                        Sugerencias (↓↑ para navegar, Enter para seleccionar)
                                    </div>
                                    {suggestions.map((suggestion, index) => (
                                        <button
                                            key={suggestion.label}
                                            id={`suggestion-${index}`}
                                            type="button"
                                            role="option"
                                            aria-selected={index === activeSuggestion}
                                            onClick={() => applySuggestion(suggestion)}
                                            className={`w-full text-left px-3 py-2.5 border-b last:border-b-0 hover:bg-[var(--bg-subtle)] transition-colors ${index === activeSuggestion ? 'bg-[var(--bg-subtle)]' : ''}`}
                                            style={{ borderColor: 'var(--border)' }}
                                        >
                                            <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{suggestion.label}</p>
                                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{suggestion.hint}</p>
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        <div className="md:w-56">
                            <ModernSelect
                                value={filters.region}
                                onChange={(value) => {
                                    setFilters((current) => ({ ...current, region: value, commune: '' }));
                                }}
                                options={regionOptions}
                                placeholder="Región"
                                ariaLabel="Región"
                                triggerClassName="h-11"
                                leadingIcon={<IconMapPin size={14} />}
                            />
                        </div>

                        <div className="md:w-56">
                            <ModernSelect
                                value={filters.commune}
                                onChange={(value) => setFilters((current) => ({ ...current, commune: value }))}
                                options={communeOptions}
                                placeholder="Comuna"
                                ariaLabel="Comuna"
                                triggerClassName="h-11"
                                disabled={!filters.region}
                            />
                        </div>

                        <PanelButton type="submit" variant="primary" className="h-11 justify-center md:w-auto md:px-6">
                            <IconSearch size={14} />
                            Buscar
                        </PanelButton>
                    </div>

                    {/* Sin chips visuales: mantenemos interacción simple y limpia. */}

                    {showAdvanced ? (
                        <div className="rounded-xl border p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5" style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}>
                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: "var(--fg-muted)" }}>Tipo de vehículo</label>
                                <ModernSelect
                                    value={filters.vehicleType}
                                    onChange={(value) => setFilters((current) => ({ ...current, vehicleType: value as VehicleType, brand: "", model: "" }))}
                                    options={VEHICLE_TYPE_OPTIONS}
                                    placeholder="Autos y SUV"
                                    ariaLabel="Tipo de vehículo"
                                    triggerClassName="h-10"
                                />
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: "var(--fg-muted)" }}>Marca</label>
                                <ModernSelect
                                    value={filters.brand}
                                    onChange={(value) => setFilters((current) => ({ ...current, brand: value, model: "" }))}
                                    options={brandOptions}
                                    placeholder={catalogLoading ? "Cargando..." : brandOptions.length === 0 ? "No hay marcas disponibles" : "Sin preferencia"}
                                    ariaLabel="Marca"
                                    triggerClassName="h-10"
                                    disabled={catalogLoading || brandOptions.length === 0}
                                />
                                {!catalogLoading && brandOptions.length === 0 && (
                                    <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                                        No hay marcas disponibles para este tipo de vehículo
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: "var(--fg-muted)" }}>Modelo</label>
                                <ModernSelect
                                    value={filters.model}
                                    onChange={(value) => setFilters((current) => ({ ...current, model: value }))}
                                    options={modelOptions}
                                    placeholder={catalogLoading ? "Cargando..." : !filters.brand ? "Selecciona marca primero" : modelOptions.length === 0 ? "No hay modelos disponibles" : "Sin preferencia"}
                                    ariaLabel="Modelo"
                                    triggerClassName="h-10"
                                    disabled={!filters.brand || catalogLoading || modelOptions.length === 0}
                                />
                                {filters.brand && !catalogLoading && modelOptions.length === 0 && (
                                    <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                                        No hay modelos disponibles para esta marca
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: "var(--fg-muted)" }}>Precio desde</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={filters.priceFrom}
                                    onChange={(event) => setFilters((current) => {
                                        const newPriceFrom = event.target.value;
                                        // Si priceFrom > priceTo, limpiar priceTo
                                        if (newPriceFrom && current.priceTo && parseInt(newPriceFrom, 10) > parseInt(current.priceTo, 10)) {
                                            return { ...current, priceFrom: newPriceFrom, priceTo: "" };
                                        }
                                        return { ...current, priceFrom: newPriceFrom };
                                    })}
                                    placeholder="Sin mínimo"
                                    className="form-input h-10"
                                />
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: "var(--fg-muted)" }}>Precio hasta</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={filters.priceTo}
                                    onChange={(event) => setFilters((current) => {
                                        const newPriceTo = event.target.value;
                                        // Si priceTo < priceFrom, limpiar priceFrom
                                        if (newPriceTo && current.priceFrom && parseInt(newPriceTo, 10) < parseInt(current.priceFrom, 10)) {
                                            return { ...current, priceTo: newPriceTo, priceFrom: "" };
                                        }
                                        return { ...current, priceTo: newPriceTo };
                                    })}
                                    placeholder="Sin máximo"
                                    className="form-input h-10"
                                />
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: "var(--fg-muted)" }}>Año desde</label>
                                <ModernSelect
                                    value={filters.yearFrom}
                                    onChange={(value) => setFilters((current) => {
                                        const newYearFrom = value;
                                        // Si yearFrom > yearTo, limpiar yearTo
                                        if (newYearFrom && current.yearTo && parseInt(newYearFrom, 10) > parseInt(current.yearTo, 10)) {
                                            return { ...current, yearFrom: newYearFrom, yearTo: "" };
                                        }
                                        return { ...current, yearFrom: newYearFrom };
                                    })}
                                    options={YEAR_OPTIONS.map((year) => ({ value: year, label: year }))}
                                    placeholder="Sin mínimo"
                                    ariaLabel="Año desde"
                                    triggerClassName="h-10"
                                />
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: "var(--fg-muted)" }}>Año hasta</label>
                                <ModernSelect
                                    value={filters.yearTo}
                                    onChange={(value) => setFilters((current) => {
                                        const newYearTo = value;
                                        // Si yearTo < yearFrom, limpiar yearFrom
                                        if (newYearTo && current.yearFrom && parseInt(newYearTo, 10) < parseInt(current.yearFrom, 10)) {
                                            return { ...current, yearTo: newYearTo, yearFrom: "" };
                                        }
                                        return { ...current, yearTo: newYearTo };
                                    })}
                                    options={YEAR_OPTIONS.map((year) => ({ value: year, label: year }))}
                                    placeholder="Sin máximo"
                                    ariaLabel="Año hasta"
                                    triggerClassName="h-10"
                                />
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: "var(--fg-muted)" }}>Combustible</label>
                                <ModernSelect
                                    value={filters.fuel}
                                    onChange={(value) => setFilters((current) => ({ ...current, fuel: value }))}
                                    options={FUEL_OPTIONS}
                                    placeholder="Sin preferencia"
                                    ariaLabel="Combustible"
                                    triggerClassName="h-10"
                                />
                            </div>

                            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2">
                                <PanelButton
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="h-9 px-3 text-xs"
                                    onClick={() => {
                                        const cleared: AutosFilters = { ...filters, vehicleType: "", brand: "", model: "", priceFrom: "", priceTo: "", yearFrom: "", yearTo: "", fuel: "" };
                                        setFilters(cleared);
                                        // Actualizar URL sin filtros avanzados
                                        const params = buildSearchParams(cleared);
                                        const queryString = params.toString();
                                        router.replace(queryString ? `${tabMeta.href}?${queryString}` : tabMeta.href, { scroll: false });
                                    }}
                                >
                                    Limpiar filtros avanzados
                                </PanelButton>
                                <PanelButton
                                    type="submit"
                                    variant="primary"
                                    size="sm"
                                    className="h-9 px-3 text-xs"
                                >
                                    Aplicar filtros
                                </PanelButton>
                            </div>
                        </div>
                    ) : null}
                </form>
            </div>
        </section>
    );
}
