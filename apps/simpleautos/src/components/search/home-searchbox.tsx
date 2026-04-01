'use client';

import { useRouter } from 'next/navigation';
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

type AutosTab = 'comprar' | 'arrendar' | 'subastas';

type AutosFilters = {
    tab: AutosTab;
    query: string;
    region: string;
    price: string;
    brand: string;
    yearFrom: string;
    yearTo: string;
    fuel: string;
    transmission: string;
};

type Suggestion = {
    label: string;
    hint: string;
    brand?: string;
    fuel?: string;
    transmission?: string;
};

const STORAGE_KEY = 'simpleautos:home-searchbox-v2';

const DEFAULT_FILTERS: AutosFilters = {
    tab: 'comprar',
    query: '',
    region: '',
    price: '',
    brand: '',
    yearFrom: '',
    yearTo: '',
    fuel: '',
    transmission: '',
};

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
        { label: 'Hyundai Tucson', hint: 'SUV · Automático', brand: 'hyundai', transmission: 'AT' },
        { label: 'Kia Sportage', hint: 'SUV · Bencina', brand: 'kia', fuel: 'bencina' },
        { label: 'BYD Song Plus', hint: 'SUV · Eléctrico', brand: 'byd', fuel: 'electrico' },
        { label: 'Pick-up 4x4', hint: 'Trabajo y flota' },
    ],
    arrendar: [
        { label: 'SUV para viaje', hint: 'Automático · 5 plazas', transmission: 'AT' },
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

const REGION_OPTIONS = [
    { value: 'rm', label: 'Región Metropolitana' },
    { value: 'valparaiso', label: 'Valparaíso' },
    { value: 'biobio', label: 'Biobío' },
    { value: 'araucania', label: 'Araucanía' },
    { value: 'antofagasta', label: 'Antofagasta' },
];

const SALE_PRICE_OPTIONS = [
    { value: '0-5000000', label: 'Hasta $5M' },
    { value: '5000000-10000000', label: '$5M - $10M' },
    { value: '10000000-20000000', label: '$10M - $20M' },
    { value: '20000000-40000000', label: '$20M - $40M' },
    { value: '40000000+', label: '$40M+' },
];

const RENT_PRICE_OPTIONS = [
    { value: '0-30000', label: 'Hasta $30.000/día' },
    { value: '30000-50000', label: '$30.000 - $50.000/día' },
    { value: '50000-80000', label: '$50.000 - $80.000/día' },
    { value: '80000-120000', label: '$80.000 - $120.000/día' },
    { value: '120000+', label: '$120.000+/día' },
];

const BRAND_OPTIONS = [
    { value: 'toyota', label: 'Toyota' },
    { value: 'hyundai', label: 'Hyundai' },
    { value: 'kia', label: 'Kia' },
    { value: 'chevrolet', label: 'Chevrolet' },
    { value: 'nissan', label: 'Nissan' },
    { value: 'suzuki', label: 'Suzuki' },
    { value: 'mg', label: 'MG' },
    { value: 'byd', label: 'BYD' },
];

const FUEL_OPTIONS = [
    { value: 'bencina', label: 'Bencina' },
    { value: 'diesel', label: 'Diésel' },
    { value: 'hibrido', label: 'Híbrido' },
    { value: 'electrico', label: 'Eléctrico' },
];

const TRANSMISSION_OPTIONS = [
    { value: 'AT', label: 'AT' },
    { value: 'MT', label: 'MT' },
    { value: 'CVT', label: 'CVT' },
];

const CURRENT_YEAR = new Date().getFullYear() + 1;
const YEAR_OPTIONS = Array.from({ length: 26 }, (_, index) => String(CURRENT_YEAR - index));
const REGION_KEYWORDS: Record<string, string> = {
    santiago: 'rm',
    metropolitana: 'rm',
    valparaiso: 'valparaiso',
    vina: 'valparaiso',
    biobio: 'biobio',
    concepcion: 'biobio',
    araucania: 'araucania',
    temuco: 'araucania',
    antofagasta: 'antofagasta',
};

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

function parseRange(value: string): { min: number; max: number | null } {
    if (value.includes('+')) {
        return { min: Number(value.replace('+', '')), max: null };
    }

    const [minRaw, maxRaw] = value.split('-');
    return {
        min: Number(minRaw),
        max: maxRaw ? Number(maxRaw) : null,
    };
}

function pickPriceBucketByAmount(amount: number, options: Array<{ value: string }>): string | null {
    for (const option of options) {
        const { min, max } = parseRange(option.value);
        if (max === null && amount >= min) return option.value;
        if (max !== null && amount >= min && amount <= max) return option.value;
    }
    return null;
}

function extractAutosPriceBucket(query: string, tab: AutosTab): string | null {
    const normalized = normalizeText(query);
    const options = tab === 'arrendar' ? RENT_PRICE_OPTIONS : SALE_PRICE_OPTIONS;

    const millionsMatch = normalized.match(/(\d{1,3}(?:[.,]\d+)?)\s*(m|millones?)/);
    if (millionsMatch) {
        const millions = Number(millionsMatch[1]?.replace(',', '.'));
        if (!Number.isNaN(millions)) {
            const amount = Math.round(millions * 1_000_000);
            return pickPriceBucketByAmount(amount, options);
        }
    }

    const thousandMatch = normalized.match(/(\d{1,3}(?:[.,]\d+)?)\s*k\b/);
    if (thousandMatch) {
        const thousands = Number(thousandMatch[1]?.replace(',', '.'));
        if (!Number.isNaN(thousands)) {
            const amount = Math.round(thousands * 1_000);
            return pickPriceBucketByAmount(amount, options);
        }
    }

    const rawPriceMatch = normalized.match(/\$?\s?(\d{6,9})\b/);
    if (rawPriceMatch) {
        const amount = Number(rawPriceMatch[1]);
        if (!Number.isNaN(amount)) return pickPriceBucketByAmount(amount, options);
    }

    return null;
}

function parseAutosIntent(query: string, tab: AutosTab): Partial<AutosFilters> {
    const normalized = normalizeText(query);
    if (!normalized) return {};

    const intent: Partial<AutosFilters> = {};

    for (const [keyword, regionValue] of Object.entries(REGION_KEYWORDS)) {
        if (normalized.includes(keyword)) {
            intent.region = regionValue;
            break;
        }
    }

    const matchedBrand = BRAND_OPTIONS.find((brand) => normalized.includes(normalizeText(brand.label)));
    if (matchedBrand) intent.brand = matchedBrand.value;

    if (/\bhibrid/.test(normalized)) intent.fuel = 'hibrido';
    else if (/\bdiesel|di[eé]sel/.test(normalized)) intent.fuel = 'diesel';
    else if (/\belectr/.test(normalized)) intent.fuel = 'electrico';
    else if (/\bbencina|gasolina/.test(normalized)) intent.fuel = 'bencina';

    if (/\bcvt\b/.test(normalized)) intent.transmission = 'CVT';
    else if (/\bmt\b|manual/.test(normalized)) intent.transmission = 'MT';
    else if (/\bat\b|automatic/.test(normalized)) intent.transmission = 'AT';

    const bucket = extractAutosPriceBucket(normalized, tab);
    if (bucket) intent.price = bucket;

    return intent;
}

function mergeFiltersWithIntent(base: AutosFilters, intent: Partial<AutosFilters>): AutosFilters {
    const merged = { ...base };
    if (intent.region && !merged.region) merged.region = intent.region;
    if (intent.brand && !merged.brand) merged.brand = intent.brand;
    if (intent.fuel && !merged.fuel) merged.fuel = intent.fuel;
    if (intent.transmission && !merged.transmission) merged.transmission = intent.transmission;
    if (intent.price && !merged.price) merged.price = intent.price;
    return merged;
}

function buildSearchParams(filters: AutosFilters): URLSearchParams {
    const params = new URLSearchParams();
    const query = filters.query.trim();
    if (query) params.set('q', query);
    if (filters.region) params.set('region', filters.region);
    if (filters.price) params.set('price', filters.price);
    if (filters.brand) params.set('brand', filters.brand);
    if (filters.yearFrom) params.set('year_from', filters.yearFrom);
    if (filters.yearTo) params.set('year_to', filters.yearTo);
    if (filters.fuel) params.set('fuel', filters.fuel);
    if (filters.transmission) params.set('transmission', filters.transmission);
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

export default function HomeSearchBox() {
    const router = useRouter();
    const [filters, setFilters] = useState<AutosFilters>(DEFAULT_FILTERS);
    const [hydrated, setHydrated] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputWrapRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setFilters(readFiltersFromStorage());
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        writeFiltersToStorage(filters);
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
    const priceOptions = filters.tab === 'arrendar' ? RENT_PRICE_OPTIONS : SALE_PRICE_OPTIONS;
    const pricePlaceholder = filters.tab === 'arrendar' ? 'Precio por día' : 'Precio';

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

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const intent = parseAutosIntent(filters.query, filters.tab);
        const resolvedFilters = mergeFiltersWithIntent(filters, intent);
        setFilters(resolvedFilters);
        const params = buildSearchParams(resolvedFilters);

        const queryString = params.toString();
        router.push(queryString ? `${tabMeta.href}?${queryString}` : tabMeta.href);
        setShowSuggestions(false);
    };

    const applySuggestion = (suggestion: Suggestion) => {
        setFilters((current) => ({
            ...current,
            query: suggestion.label,
            brand: suggestion.brand ?? current.brand,
            fuel: suggestion.fuel ?? current.fuel,
            transmission: suggestion.transmission ?? current.transmission,
        }));
        setShowSuggestions(false);
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
                                className="h-8 sm:h-9 px-3 sm:px-4 text-sm font-medium rounded-md border transition-all shrink-0 hover:bg-(--bg-subtle) hover:border-(--border-strong) hover:text-(--fg)"
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
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-stretch">
                        <div className="md:col-span-6 relative" ref={inputWrapRef}>
                            <IconSearch size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--fg-muted)' }} />
                            <input
                                type="text"
                                value={filters.query}
                                onFocus={() => setShowSuggestions(true)}
                                onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                                placeholder={tabMeta.placeholder}
                                className="form-input h-11"
                                style={{ paddingLeft: '2.75rem', paddingRight: '2.5rem' }}
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
                                    className="absolute left-0 right-0 top-[calc(100%+0.35rem)] rounded-xl border overflow-hidden z-30"
                                    style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-lg)' }}
                                >
                                    {suggestions.map((suggestion) => (
                                        <button
                                            key={`${filters.tab}-${suggestion.label}`}
                                            type="button"
                                            onClick={() => applySuggestion(suggestion)}
                                            className="w-full text-left px-3 py-2.5 border-b last:border-b-0 hover:bg-(--bg-subtle) transition-colors"
                                            style={{ borderColor: 'var(--border)' }}
                                        >
                                            <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{suggestion.label}</p>
                                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{suggestion.hint}</p>
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        <div className="md:col-span-2">
                            <ModernSelect
                                value={filters.region}
                                onChange={(value) => setFilters((current) => ({ ...current, region: value }))}
                                options={REGION_OPTIONS}
                                placeholder="Región"
                                ariaLabel="Región"
                                triggerClassName="h-11"
                                leadingIcon={<IconMapPin size={14} />}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <ModernSelect
                                value={filters.price}
                                onChange={(value) => setFilters((current) => ({ ...current, price: value }))}
                                options={priceOptions}
                                placeholder={pricePlaceholder}
                                ariaLabel="Precio"
                                triggerClassName="h-11"
                            />
                        </div>

                        <PanelButton type="submit" variant="primary" className="h-11 justify-center md:col-span-2">
                            <IconSearch size={14} />
                            Buscar
                        </PanelButton>
                    </div>

                    {/* Sin chips visuales: mantenemos interacción simple y limpia. */}

                    {showAdvanced ? (
                        <div className="rounded-xl border p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: 'var(--fg-muted)' }}>Marca</label>
                                <ModernSelect
                                    value={filters.brand}
                                    onChange={(value) => setFilters((current) => ({ ...current, brand: value }))}
                                    options={BRAND_OPTIONS}
                                    placeholder="Sin preferencia"
                                    ariaLabel="Marca"
                                    triggerClassName="h-10"
                                />
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: 'var(--fg-muted)' }}>Año desde</label>
                                <ModernSelect
                                    value={filters.yearFrom}
                                    onChange={(value) => setFilters((current) => ({ ...current, yearFrom: value }))}
                                    options={YEAR_OPTIONS.map((year) => ({ value: year, label: year }))}
                                    placeholder="Sin mínimo"
                                    ariaLabel="Año desde"
                                    triggerClassName="h-10"
                                />
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: 'var(--fg-muted)' }}>Año hasta</label>
                                <ModernSelect
                                    value={filters.yearTo}
                                    onChange={(value) => setFilters((current) => ({ ...current, yearTo: value }))}
                                    options={YEAR_OPTIONS.map((year) => ({ value: year, label: year }))}
                                    placeholder="Sin máximo"
                                    ariaLabel="Año hasta"
                                    triggerClassName="h-10"
                                />
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: 'var(--fg-muted)' }}>Combustible</label>
                                <ModernSelect
                                    value={filters.fuel}
                                    onChange={(value) => setFilters((current) => ({ ...current, fuel: value }))}
                                    options={FUEL_OPTIONS}
                                    placeholder="Sin preferencia"
                                    ariaLabel="Combustible"
                                    triggerClassName="h-10"
                                />
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: 'var(--fg-muted)' }}>Transmisión</label>
                                <ModernSelect
                                    value={filters.transmission}
                                    onChange={(value) => setFilters((current) => ({ ...current, transmission: value }))}
                                    options={TRANSMISSION_OPTIONS}
                                    placeholder="Sin preferencia"
                                    ariaLabel="Transmisión"
                                    triggerClassName="h-10"
                                />
                            </div>

                            <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
                                <PanelButton
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="h-9 px-3 text-xs"
                                    onClick={() => setFilters((current) => ({ ...current, brand: '', yearFrom: '', yearTo: '', fuel: '', transmission: '' }))}
                                >
                                    Limpiar filtros avanzados
                                </PanelButton>
                            </div>
                        </div>
                    ) : null}
                </form>
            </div>
        </section>
    );
}
