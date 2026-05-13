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
import { ModernSelect } from '@simple/ui';
import { PanelButton } from '@simple/ui';

type PropertiesTab = 'comprar' | 'arrendar' | 'proyectos';

type PropertiesFilters = {
    tab: PropertiesTab;
    query: string;
    region: string;
    propertyType: string;
    price: string;
    bedrooms: string;
    bathrooms: string;
    parking: string;
    minArea: string;
};

type Suggestion = {
    label: string;
    hint: string;
    propertyType?: string;
    bedrooms?: string;
};

const STORAGE_KEY = 'simplepropiedades:home-searchbox-v2';

const DEFAULT_FILTERS: PropertiesFilters = {
    tab: 'comprar',
    query: '',
    region: '',
    propertyType: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    parking: '',
    minArea: '',
};

const TAB_META: Record<
    PropertiesTab,
    {
        label: string;
        href: string;
        placeholder: string;
    }
> = {
    comprar: {
        label: 'Comprar',
        href: '/ventas',
        placeholder: 'Comuna, proyecto o palabra clave',
    },
    arrendar: {
        label: 'Arrendar',
        href: '/arriendos',
        placeholder: 'Comuna o tipo de arriendo',
    },
    proyectos: {
        label: 'Proyectos',
        href: '/proyectos',
        placeholder: 'Nombre del proyecto o comuna',
    },
};

const SUGGESTIONS_BY_TAB: Record<PropertiesTab, Suggestion[]> = {
    comprar: [
        { label: 'Deptos en Providencia', hint: '2D · 2B · UF', propertyType: 'departamento', bedrooms: '2' },
        { label: 'Casas en Lo Barnechea', hint: '4D+ · Alto estándar', propertyType: 'casa', bedrooms: '4' },
        { label: 'Oficinas en Las Condes', hint: 'Renta comercial', propertyType: 'oficina' },
        { label: 'Terrenos en Chicureo', hint: 'Lotes urbanizados', propertyType: 'terreno' },
    ],
    arrendar: [
        { label: 'Arriendos en Ñuñoa', hint: 'Cerca de metro' },
        { label: 'Departamentos amoblados', hint: 'Ideal traslado temporal', propertyType: 'departamento' },
        { label: 'Casas con patio', hint: 'Perfil familiar', propertyType: 'casa', bedrooms: '3' },
        { label: 'Lofts en Santiago Centro', hint: 'Estilo urbano', propertyType: 'departamento' },
    ],
    proyectos: [
        { label: 'Proyectos en Vitacura', hint: 'Premium · Baja densidad' },
        { label: 'Con subsidio DS19', hint: 'Compatibles y en verde' },
        { label: 'Entrega inmediata', hint: 'Unidades listas' },
        { label: 'Preventa en la costa', hint: 'Viña / Concón / Reñaca' },
    ],
};

const REGION_OPTIONS = [
    { value: 'rm', label: 'Región Metropolitana' },
    { value: 'valparaiso', label: 'Valparaíso' },
    { value: 'biobio', label: 'Biobío' },
    { value: 'coquimbo', label: 'Coquimbo' },
    { value: 'araucania', label: 'Araucanía' },
];

const PROPERTY_TYPE_OPTIONS = [
    { value: 'departamento', label: 'Departamento' },
    { value: 'casa', label: 'Casa' },
    { value: 'oficina', label: 'Oficina' },
    { value: 'local', label: 'Local' },
    { value: 'terreno', label: 'Terreno' },
];

const PRICE_OPTIONS_UF = [
    { value: '0-2000', label: 'Hasta UF 2.000' },
    { value: '2000-5000', label: 'UF 2.000 - 5.000' },
    { value: '5000-10000', label: 'UF 5.000 - 10.000' },
    { value: '10000-20000', label: 'UF 10.000 - 20.000' },
    { value: '20000+', label: 'UF 20.000+' },
];

const PRICE_OPTIONS_CLP = [
    { value: '0-500000', label: 'Hasta $500.000' },
    { value: '500000-900000', label: '$500.000 - $900.000' },
    { value: '900000-1500000', label: '$900.000 - $1.500.000' },
    { value: '1500000-2500000', label: '$1.500.000 - $2.500.000' },
    { value: '2500000+', label: '$2.500.000+' },
];
const REGION_KEYWORDS: Record<string, string> = {
    santiago: 'rm',
    metropolitana: 'rm',
    valparaiso: 'valparaiso',
    vina: 'valparaiso',
    biobio: 'biobio',
    concepcion: 'biobio',
    coquimbo: 'coquimbo',
    araucania: 'araucania',
    temuco: 'araucania',
};
const PROPERTY_TYPE_KEYWORDS: Array<{ keywords: string[]; value: string }> = [
    { keywords: ['departamento', 'depto', 'dpto'], value: 'departamento' },
    { keywords: ['casa'], value: 'casa' },
    { keywords: ['oficina'], value: 'oficina' },
    { keywords: ['local'], value: 'local' },
    { keywords: ['terreno', 'sitio', 'parcela'], value: 'terreno' },
];

function isPropertiesTab(value: string): value is PropertiesTab {
    return value === 'comprar' || value === 'arrendar' || value === 'proyectos';
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

function extractPropertiesPriceBucket(query: string, tab: PropertiesTab): string | null {
    const normalized = normalizeText(query);

    if (tab === 'arrendar') {
        const millionMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(m|millones?)/);
        if (millionMatch) {
            const amount = Number(millionMatch[1]?.replace(',', '.')) * 1_000_000;
            if (!Number.isNaN(amount)) return pickPriceBucketByAmount(amount, PRICE_OPTIONS_CLP);
        }

        const thousandMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*k\b/);
        if (thousandMatch) {
            const amount = Number(thousandMatch[1]?.replace(',', '.')) * 1_000;
            if (!Number.isNaN(amount)) return pickPriceBucketByAmount(amount, PRICE_OPTIONS_CLP);
        }

        const rawClpMatch = normalized.match(/\$?\s?(\d{5,9})\b/);
        if (rawClpMatch) {
            const amount = Number(rawClpMatch[1]);
            if (!Number.isNaN(amount)) return pickPriceBucketByAmount(amount, PRICE_OPTIONS_CLP);
        }

        return null;
    }

    const ufMatch = normalized.match(/uf\s*(\d{3,6})|(\d{3,6})\s*uf/);
    if (ufMatch) {
        const amount = Number(ufMatch[1] || ufMatch[2]);
        if (!Number.isNaN(amount)) return pickPriceBucketByAmount(amount, PRICE_OPTIONS_UF);
    }

    const rawUfLike = normalized.match(/\b(\d{3,5})\b/);
    if (rawUfLike) {
        const amount = Number(rawUfLike[1]);
        if (!Number.isNaN(amount) && amount >= 500 && amount <= 50000) {
            return pickPriceBucketByAmount(amount, PRICE_OPTIONS_UF);
        }
    }

    return null;
}

function parsePropertiesIntent(query: string, tab: PropertiesTab): Partial<PropertiesFilters> {
    const normalized = normalizeText(query);
    if (!normalized) return {};

    const intent: Partial<PropertiesFilters> = {};

    for (const [keyword, regionValue] of Object.entries(REGION_KEYWORDS)) {
        if (normalized.includes(keyword)) {
            intent.region = regionValue;
            break;
        }
    }

    const matchedPropertyType = PROPERTY_TYPE_KEYWORDS.find((group) =>
        group.keywords.some((keyword) => normalized.includes(keyword))
    );
    if (matchedPropertyType) intent.propertyType = matchedPropertyType.value;

    const bedroomsMatch = normalized.match(/(\d)\s*(d|dorm)/);
    if (bedroomsMatch) intent.bedrooms = bedroomsMatch[1];

    const bathroomsMatch = normalized.match(/(\d)\s*(b|ban)/);
    if (bathroomsMatch) intent.bathrooms = bathroomsMatch[1];

    const parkingMatch = normalized.match(/(\d)\s*(estac|parking)/);
    if (parkingMatch) intent.parking = parkingMatch[1];

    const areaMatch = normalized.match(/(\d{2,4})\s*m2?/);
    if (areaMatch) intent.minArea = areaMatch[1];

    const bucket = extractPropertiesPriceBucket(normalized, tab);
    if (bucket) intent.price = bucket;

    return intent;
}

function mergeFiltersWithIntent(base: PropertiesFilters, intent: Partial<PropertiesFilters>): PropertiesFilters {
    const merged = { ...base };
    if (intent.region && !merged.region) merged.region = intent.region;
    if (intent.propertyType && !merged.propertyType) merged.propertyType = intent.propertyType;
    if (intent.bedrooms && !merged.bedrooms) merged.bedrooms = intent.bedrooms;
    if (intent.bathrooms && !merged.bathrooms) merged.bathrooms = intent.bathrooms;
    if (intent.parking && !merged.parking) merged.parking = intent.parking;
    if (intent.minArea && !merged.minArea) merged.minArea = intent.minArea;
    if (intent.price && !merged.price) merged.price = intent.price;
    return merged;
}

function buildSearchParams(filters: PropertiesFilters): URLSearchParams {
    const params = new URLSearchParams();
    const query = filters.query.trim();
    if (query) params.set('q', query);
    if (filters.region) params.set('region', filters.region);
    if (filters.propertyType) params.set('property_type', filters.propertyType);
    if (filters.price) params.set('price', filters.price);
    if (filters.bedrooms) params.set('bedrooms', filters.bedrooms);
    if (filters.bathrooms) params.set('bathrooms', filters.bathrooms);
    if (filters.parking) params.set('parking', filters.parking);
    if (filters.minArea) params.set('min_area', filters.minArea);
    return params;
}

function readFiltersFromStorage(): PropertiesFilters {
    if (typeof window === 'undefined') return DEFAULT_FILTERS;

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_FILTERS;
        const parsed = JSON.parse(raw) as Partial<PropertiesFilters>;
        const safeTab: PropertiesTab = typeof parsed.tab === 'string' && isPropertiesTab(parsed.tab) ? parsed.tab : DEFAULT_FILTERS.tab;
        return {
            ...DEFAULT_FILTERS,
            ...parsed,
            tab: safeTab,
        };
    } catch {
        return DEFAULT_FILTERS;
    }
}

function writeFiltersToStorage(filters: PropertiesFilters): void {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
        // Ignorar errores de storage.
    }
}

export default function HomeSearchBox() {
    const router = useRouter();
    const [filters, setFilters] = useState<PropertiesFilters>(DEFAULT_FILTERS);
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
    const priceOptions = filters.tab === 'arrendar' ? PRICE_OPTIONS_CLP : PRICE_OPTIONS_UF;
    const pricePlaceholder = filters.tab === 'arrendar' ? 'Precio (CLP)' : 'Precio (UF)';

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

    const applySuggestion = (suggestion: Suggestion) => {
        setFilters((current) => ({
            ...current,
            query: suggestion.label,
            propertyType: suggestion.propertyType ?? current.propertyType,
            bedrooms: suggestion.bedrooms ?? current.bedrooms,
        }));
        setShowSuggestions(false);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const intent = parsePropertiesIntent(filters.query, filters.tab);
        const resolvedFilters = mergeFiltersWithIntent(filters, intent);
        setFilters(resolvedFilters);
        const params = buildSearchParams(resolvedFilters);

        const queryString = params.toString();
        router.push(queryString ? `${tabMeta.href}?${queryString}` : tabMeta.href);
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
                        {(Object.keys(TAB_META) as PropertiesTab[]).map((tabKey) => (
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
                        <div className="md:col-span-5 relative" ref={inputWrapRef}>
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
                                value={filters.propertyType}
                                onChange={(value) => setFilters((current) => ({ ...current, propertyType: value }))}
                                options={PROPERTY_TYPE_OPTIONS}
                                placeholder="Tipo"
                                ariaLabel="Tipo de propiedad"
                                triggerClassName="h-11"
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

                        <PanelButton type="submit" variant="primary" className="h-11 justify-center md:col-span-1">
                            <IconSearch size={14} />
                            Buscar
                        </PanelButton>
                    </div>

                    {/* Sin chips visuales: mantenemos interacción simple y limpia. */}

                    {showAdvanced ? (
                        <div className="rounded-xl border p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: 'var(--fg-muted)' }}>Dormitorios</label>
                                <ModernSelect
                                    value={filters.bedrooms}
                                    onChange={(value) => setFilters((current) => ({ ...current, bedrooms: value }))}
                                    options={['1', '2', '3', '4', '5+'].map((bedrooms) => ({ value: bedrooms, label: bedrooms }))}
                                    placeholder="Sin preferencia"
                                    ariaLabel="Dormitorios"
                                    triggerClassName="h-10"
                                />
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: 'var(--fg-muted)' }}>Baños</label>
                                <ModernSelect
                                    value={filters.bathrooms}
                                    onChange={(value) => setFilters((current) => ({ ...current, bathrooms: value }))}
                                    options={['1', '2', '3', '4+'].map((bathrooms) => ({ value: bathrooms, label: bathrooms }))}
                                    placeholder="Sin preferencia"
                                    ariaLabel="Baños"
                                    triggerClassName="h-10"
                                />
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: 'var(--fg-muted)' }}>Estacionamientos</label>
                                <ModernSelect
                                    value={filters.parking}
                                    onChange={(value) => setFilters((current) => ({ ...current, parking: value }))}
                                    options={['0', '1', '2', '3+'].map((parking) => ({ value: parking, label: parking }))}
                                    placeholder="Sin preferencia"
                                    ariaLabel="Estacionamientos"
                                    triggerClassName="h-10"
                                />
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: 'var(--fg-muted)' }}>Superficie mínima</label>
                                <input
                                    type="number"
                                    min={0}
                                    inputMode="numeric"
                                    value={filters.minArea}
                                    onChange={(event) => setFilters((current) => ({ ...current, minArea: event.target.value }))}
                                    className="form-input h-10"
                                    placeholder="m²"
                                />
                            </div>

                            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                                <PanelButton
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="h-9 px-3 text-xs"
                                    onClick={() => setFilters((current) => ({ ...current, bedrooms: '', bathrooms: '', parking: '', minArea: '' }))}
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
