'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
    IconAdjustmentsHorizontal,
    IconCamera,
    IconChevronDown,
    IconClock,
    IconFlame,
    IconMap,
    IconMapPin,
    IconMicrophone,
    IconSearch,
    IconX,
} from '@tabler/icons-react';
import { ModernSelect } from '@simple/ui';
import { PanelButton } from '@simple/ui';
import { LOCATION_REGIONS, getCommunesForRegion } from '@simple/utils';
import { loadPublishWizardCatalog, type CatalogBrand, type CatalogModel } from '@/lib/publish-wizard-catalog';
import dynamic from 'next/dynamic';

const SearchMap = dynamic(() => import('../map/search-map'), {
    ssr: false,
});

import { fetchPublicListings, type PublicListing } from '../../lib/public-listings';

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

type FilterChip = {
    key: string;
    label: string;
    value: string;
    type: 'brand' | 'model' | 'vehicleType' | 'fuel' | 'region' | 'commune' | 'price' | 'year';
};

type PreviewResult = {
    id: string;
    title: string;
    price: string;
    location: string;
    image: string;
    year: string;
};

const SEARCH_HISTORY_KEY = 'simpleautos:search-history';
const MAX_HISTORY_ITEMS = 5;

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

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 30 }, (_, i) => ({
    value: (CURRENT_YEAR - i).toString(),
    label: (CURRENT_YEAR - i).toString(),
}));

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

function detectVehicleType(query: string): VehicleType | '' {
    const normalized = normalizeText(query);
    if (!normalized) return '';

    if (/\b(moto|motocicleta|motorcycle)\b/.test(normalized)) return 'motorcycle';
    if (/\b(camión|camion|truck|camioneta)\b/.test(normalized)) return 'truck';
    if (/\b(bus|buses|ómnibus|omnibus)\b/.test(normalized)) return 'bus';
    if (/\b(maquinaria|maquina|machinery)\b/.test(normalized)) return 'machinery';
    if (/\b(náutica|nautica|barco|embarcación|embarcacion|bote)\b/.test(normalized)) return 'nautical';
    if (/\b(aéreo|aereo|aviación|aviacion|avión|avion|helicóptero|helicoptero)\b/.test(normalized)) return 'aerial';
    
    return '';
}

function levenshteinDistance(a: string, b: string): number {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function findClosestMatch(query: string, options: string[], threshold = 2): string | null {
    const normalized = normalizeText(query);
    if (normalized.length < 3) return null;
    
    let bestMatch: string | null = null;
    let bestDistance = threshold;
    
    for (const option of options) {
        const normalizedOption = normalizeText(option);
        const distance = levenshteinDistance(normalized, normalizedOption);
        
        if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = option;
        }
    }
    
    return bestMatch;
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

function getActiveFilters(filters: AutosFilters, catalog: { brands: CatalogBrand[]; models: CatalogModel[] } | null): FilterChip[] {
    const chips: FilterChip[] = [];
    
    if (filters.brand) {
        const brand = catalog?.brands.find(b => b.id === filters.brand);
        chips.push({
            key: 'brand',
            label: brand?.name || filters.brand,
            value: filters.brand,
            type: 'brand',
        });
    }
    
    if (filters.model) {
        const model = catalog?.models.find(m => m.id === filters.model);
        chips.push({
            key: 'model',
            label: model?.name || filters.model,
            value: filters.model,
            type: 'model',
        });
    }
    
    if (filters.vehicleType) {
        const vehicleType = VEHICLE_TYPE_OPTIONS.find(v => v.value === filters.vehicleType);
        chips.push({
            key: 'vehicleType',
            label: vehicleType?.label || filters.vehicleType,
            value: filters.vehicleType,
            type: 'vehicleType',
        });
    }
    
    if (filters.fuel) {
        const fuel = FUEL_OPTIONS.find(f => f.value === filters.fuel);
        chips.push({
            key: 'fuel',
            label: fuel?.label || filters.fuel,
            value: filters.fuel,
            type: 'fuel',
        });
    }
    
    if (filters.region) {
        const region = LOCATION_REGIONS.find(r => r.id === filters.region);
        chips.push({
            key: 'region',
            label: region?.name || filters.region,
            value: filters.region,
            type: 'region',
        });
    }
    
    if (filters.commune) {
        const communes = getCommunesForRegion(filters.region);
        const commune = communes.find(c => c.id === filters.commune);
        chips.push({
            key: 'commune',
            label: commune?.name || filters.commune,
            value: filters.commune,
            type: 'commune',
        });
    }
    
    if (filters.priceFrom || filters.priceTo) {
        const priceLabel = filters.priceFrom && filters.priceTo 
            ? `$${filters.priceFrom}M - $${filters.priceTo}M`
            : filters.priceFrom 
                ? `Desde $${filters.priceFrom}M` 
                : `Hasta $${filters.priceTo}M`;
        chips.push({
            key: 'price',
            label: priceLabel,
            value: `${filters.priceFrom}-${filters.priceTo}`,
            type: 'price',
        });
    }
    
    if (filters.yearFrom || filters.yearTo) {
        const yearLabel = filters.yearFrom && filters.yearTo 
            ? `${filters.yearFrom} - ${filters.yearTo}`
            : filters.yearFrom 
                ? `Desde ${filters.yearFrom}` 
                : `Hasta ${filters.yearTo}`;
        chips.push({
            key: 'year',
            label: yearLabel,
            value: `${filters.yearFrom}-${filters.yearTo}`,
            type: 'year',
        });
    }
    
    return chips;
}

function getSearchHistory(): string[] {
    if (typeof window === 'undefined') return [];
    
    try {
        const raw = window.localStorage.getItem(SEARCH_HISTORY_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as string[];
    } catch {
        return [];
    }
}

function addToSearchHistory(query: string): void {
    if (typeof window === 'undefined' || !query.trim()) return;
    
    try {
        const history = getSearchHistory();
        const filtered = history.filter(h => h !== query);
        const updated = [query, ...filtered].slice(0, MAX_HISTORY_ITEMS);
        window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    } catch {
        // Ignorar errores
    }
}

const TRENDING_SEARCHES = [
    'Toyota Corolla',
    'SUV 4x4',
    'Buses',
    'Motos',
    'Camionetas',
    'Eléctricos',
    'Híbridos',
    'Pick-ups',
];

function getPersonalizedSuggestions(history: string[]): string[] {
    if (history.length === 0) return [];
    
    // Analizar historial para detectar patrones
    const brands = new Set<string>();
    const vehicleTypes = new Set<string>();
    
    for (const query of history) {
        const normalized = normalizeText(query);
        
        // Detectar marcas comunes
        if (/\b(toyota|hyundai|kia|chevrolet|nissan|volkswagen|suzuki|renault|peugeot)\b/i.test(normalized)) {
            const match = normalized.match(/\b(toyota|hyundai|kia|chevrolet|nissan|volkswagen|suzuki|renault|peugeot)\b/i);
            if (match) brands.add(match[1]);
        }
        
        // Detectar tipos de vehículo
        if (/\b(suv|camioneta|pickup|moto|camión|camion|bus)\b/i.test(normalized)) {
            const match = normalized.match(/\b(suv|camioneta|pickup|moto|camión|camion|bus)\b/i);
            if (match) vehicleTypes.add(match[1]);
        }
    }
    
    // Generar sugerencias personalizadas
    const suggestions: string[] = [];
    
    // Sugerir búsquedas relacionadas con marcas favoritas
    brands.forEach(brand => {
        suggestions.push(`${brand.charAt(0).toUpperCase() + brand.slice(1)} SUV`);
        suggestions.push(`${brand.charAt(0).toUpperCase() + brand.slice(1)} 2024`);
    });
    
    // Sugerir búsquedas relacionadas con tipos favoritos
    vehicleTypes.forEach(type => {
        suggestions.push(`${type.charAt(0).toUpperCase() + type.slice(1)} económico`);
        suggestions.push(`${type.charAt(0).toUpperCase() + type.slice(1)} nuevo`);
    });
    
    return suggestions.slice(0, 4);
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
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const [previewResults, setPreviewResults] = useState<PreviewResult[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isInitialMount, setIsInitialMount] = useState(true);
    const [mapPublications, setMapPublications] = useState<any[]>([]);
    const [loadingPublications, setLoadingPublications] = useState(false);
    const inputWrapRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        // Solo leer filtros de URL, ignorar localStorage para evitar redirección
        const urlFilters = readFiltersFromURL(searchParams);
        
        // Si no hay parámetros de URL, usar filtros por defecto
        const mergedFilters = Object.keys(urlFilters).length > 0 ? { ...DEFAULT_FILTERS, ...urlFilters } : DEFAULT_FILTERS;
        setFilters(mergedFilters);
        setHydrated(true);
        
        // Cargar historial de búsqueda
        setSearchHistory(getSearchHistory());
        
        loadPublishWizardCatalog()
            .then(setCatalog)
            .catch(() => {
                // Error silencioso - el catálogo se mantendrá null
            })
            .finally(() => setCatalogLoading(false));
        
        // Marcar que ya no es el montaje inicial después de cargar
        setTimeout(() => setIsInitialMount(false), 1000);
    }, [searchParams.toString()]);

    useEffect(() => {
        if (!hydrated) return;
        // Debounce para evitar escrituras excesivas a localStorage
        // DESACTIVADO POR AHORA para evitar efectos secundarios
        // const timer = setTimeout(() => {
        //     writeFiltersToStorage(filters);
        // }, 300);
        // return () => clearTimeout(timer);
    }, [filters, hydrated]);

    const tabMeta = TAB_META[filters.tab];

    // Filtros en tiempo real - DESACTIVADO POR AHORA para evitar redirección automática
    // TODO: Reactivar cuando se resuelva el problema de redirección
    // useEffect(() => {
    //     if (!hydrated || isInitialMount) return;
    //     
    //     // Solo actualizar si hay filtros activos que no sean query
    //     const hasActiveFilters = filters.brand || filters.model || filters.vehicleType || filters.fuel || 
    //                              filters.region || filters.commune || filters.priceFrom || filters.priceTo || 
    //                              filters.yearFrom || filters.yearTo;
    //     
    //     if (!hasActiveFilters) return;
    //     
    //     const timer = setTimeout(() => {
    //         const params = buildSearchParams(filters);
    //         const queryString = params.toString();
    //         router.replace(queryString ? `${tabMeta.href}?${queryString}` : tabMeta.href, { scroll: false });
    //     }, 500); // 500ms debounce para filtros en tiempo real
    //     
    //     return () => clearTimeout(timer);
    // }, [filters.brand, filters.model, filters.vehicleType, filters.fuel, 
    //     filters.region, filters.commune, filters.priceFrom, filters.priceTo, 
    //     filters.yearFrom, filters.yearTo, hydrated, isInitialMount, tabMeta.href, router]);

    useEffect(() => {
        const onPointerDown = (event: PointerEvent) => {
            if (!inputWrapRef.current?.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        window.addEventListener('pointerdown', onPointerDown);
        return () => window.removeEventListener('pointerdown', onPointerDown);
    }, []);

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

    const brandSuggestions = useMemo(() => {
        const query = filters.query.trim().toLowerCase();
        if (query.length < 2) return [];
        
        const selectedVehicleType = filters.vehicleType || 'car';
        return catalog?.brands
            .filter(b => b.vehicleTypes.includes(selectedVehicleType))
            .filter(b => normalizeText(b.name).includes(query))
            .slice(0, 5)
            .map(b => ({ id: b.id, name: b.name, type: 'brand' as const })) || [];
    }, [filters.query, filters.vehicleType, catalog]);

    const modelSuggestions = useMemo(() => {
        const query = filters.query.trim().toLowerCase();
        if (query.length < 2) return [];
        
        const selectedVehicleType = filters.vehicleType || 'car';
        return catalog?.models
            .filter(m => m.vehicleTypes.includes(selectedVehicleType))
            .filter(m => normalizeText(m.name).includes(query))
            .slice(0, 5)
            .map(m => ({ id: m.id, name: m.name, type: 'model' as const })) || [];
    }, [filters.query, filters.vehicleType, catalog]);

    const vehicleTypeSuggestions = useMemo(() => {
        const query = filters.query.trim().toLowerCase();
        if (query.length < 2) return [];
        
        return VEHICLE_TYPE_OPTIONS
            .filter(v => normalizeText(v.label).includes(query))
            .slice(0, 3)
            .map(v => ({ id: v.value, name: v.label, type: 'vehicleType' as const }));
    }, [filters.query]);

    const typoCorrection = useMemo(() => {
        const query = filters.query.trim();
        if (query.length < 3) return null;
        
        // Buscar corrección en marcas
        const allBrands = catalog?.brands.map(b => b.name) || [];
        const brandMatch = findClosestMatch(query, allBrands, 2);
        if (brandMatch) return { correction: brandMatch, type: 'brand' };
        
        // Buscar corrección en modelos
        const allModels = catalog?.models.map(m => m.name) || [];
        const modelMatch = findClosestMatch(query, allModels, 2);
        if (modelMatch) return { correction: modelMatch, type: 'model' };
        
        return null;
    }, [filters.query, catalog]);

    const personalizedSuggestions = useMemo(() => getPersonalizedSuggestions(searchHistory), [searchHistory]);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string);
                
                // Extraer metadatos básicos de la imagen
                const imageDate = file.lastModified ? new Date(file.lastModified) : null;
                if (imageDate) {
                    // Estimar año del vehículo basado en la fecha de la foto
                    const estimatedYear = imageDate.getFullYear();
                    setFilters((current) => ({ ...current, yearFrom: estimatedYear.toString() }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const searchByImage = () => {
        if (uploadedImage) {
            // Usar Google Reverse Image Search (gratuito)
            const googleLensUrl = `https://lens.google.com/upload?hl=es-419`;
            window.open(googleLensUrl, '_blank');
        }
    };

    const toggleVoiceSearch = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            // No hacer nada si no está soportado - el botón simplemente no funcionará
            return;
        }

        if (isListening) {
            // Detener reconocimiento
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            // Iniciar reconocimiento
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.lang = 'es-CL';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setFilters((current) => ({ ...current, query: transcript }));
                setIsListening(false);
            };

            recognition.onerror = (error: any) => {
                console.error('Error en reconocimiento de voz:', error);
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
            recognition.start();
            setIsListening(true);
        }
    };

    // Cargar publicaciones para el mapa
    useEffect(() => {
        if (!showMap) {
            setMapPublications([]);
            return;
        }

        const loadMapPublications = async () => {
            setLoadingPublications(true);
            try {
                const section = filters.tab === 'comprar' ? 'sale' : filters.tab === 'arrendar' ? 'rent' : 'auction';
                const listings = await fetchPublicListings(section as any, {
                    q: filters.query,
                    region: filters.region,
                    commune: filters.commune,
                    price_from: filters.priceFrom,
                    price_to: filters.priceTo,
                    brand: filters.brand,
                    model: filters.model,
                    year_from: filters.yearFrom,
                    year_to: filters.yearTo,
                    fuel: filters.fuel,
                    vehicle_type: filters.vehicleType,
                });

                const mappedPublications = listings.map((listing: any) => ({
                    id: listing.id,
                    title: listing.title,
                    price: listing.price,
                    year: listing.summary?.find((s: string) => /^\d{4}$/.test(s)),
                    location: listing.location,
                    image: listing.images?.[0],
                    href: listing.href,
                }));

                setMapPublications(mappedPublications);
            } catch (error) {
                console.error('Error loading publications for map:', error);
                setMapPublications([]);
            } finally {
                setLoadingPublications(false);
            }
        };

        loadMapPublications();
    }, [showMap, filters.tab, filters.query, filters.region, filters.commune, filters.brand, filters.model, filters.priceFrom, filters.priceTo, filters.yearFrom, filters.yearTo, filters.fuel, filters.vehicleType]);

    const handleSubmit = (event?: FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Detectar tipo de vehículo en la consulta
        const detectedVehicleType = detectVehicleType(filters.query);
        const finalFilters = detectedVehicleType 
            ? { ...filters, vehicleType: detectedVehicleType }
            : filters;
        
        // Agregar al historial de búsqueda
        if (filters.query.trim()) {
            addToSearchHistory(filters.query);
            setSearchHistory(getSearchHistory());
        }
        
        const params = buildSearchParams(finalFilters);
        const queryString = params.toString();
        router.push(queryString ? `${tabMeta.href}?${queryString}` : tabMeta.href);
        setShowSuggestions(false);
        setActiveSuggestion(-1);
    };

    const removeChip = (chip: FilterChip) => {
        switch (chip.type) {
            case 'brand':
                setFilters((current) => ({ ...current, brand: '', model: '' }));
                break;
            case 'model':
                setFilters((current) => ({ ...current, model: '' }));
                break;
            case 'vehicleType':
                setFilters((current) => ({ ...current, vehicleType: '', brand: '', model: '' }));
                break;
            case 'fuel':
                setFilters((current) => ({ ...current, fuel: '' }));
                break;
            case 'region':
                setFilters((current) => ({ ...current, region: '', commune: '' }));
                break;
            case 'commune':
                setFilters((current) => ({ ...current, commune: '' }));
                break;
            case 'price':
                setFilters((current) => ({ ...current, priceFrom: '', priceTo: '' }));
                break;
            case 'year':
                setFilters((current) => ({ ...current, yearFrom: '', yearTo: '' }));
                break;
        }
    };

    const activeChips = useMemo(() => getActiveFilters(filters, catalog), [filters, catalog]);

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
                                style={{ paddingLeft: '2.75rem', paddingRight: uploadedImage || isListening ? '7rem' : '4.5rem' }}
                                aria-expanded={showSuggestions}
                                aria-autocomplete="list"
                                aria-controls={showSuggestions ? 'search-suggestions' : undefined}
                                aria-activedescendant={activeSuggestion >= 0 ? `suggestion-${activeSuggestion}` : undefined}
                            />
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                                aria-label="Subir imagen para búsqueda"
                            />
                            <button
                                type="button"
                                onClick={toggleVoiceSearch}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full inline-flex items-center justify-center ${isListening ? 'animate-pulse' : ''}`}
                                style={{ background: isListening ? 'var(--button-primary-bg)' : 'var(--bg-muted)', color: isListening ? 'var(--button-primary-color)' : 'var(--fg-secondary)' }}
                                aria-label="Buscar por voz"
                            >
                                <IconMicrophone size={12} />
                            </button>
                            {uploadedImage ? (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                                    <button
                                        type="button"
                                        onClick={searchByImage}
                                        className="h-6 w-6 rounded-full inline-flex items-center justify-center"
                                        style={{ background: 'var(--button-primary-bg)', color: 'var(--button-primary-color)' }}
                                        aria-label="Buscar en Google Lens"
                                        title="Buscar vehículos similares"
                                    >
                                        <IconSearch size={12} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setUploadedImage(null)}
                                        className="h-6 w-6 rounded-full inline-flex items-center justify-center"
                                        style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}
                                        aria-label="Eliminar imagen"
                                    >
                                        <IconX size={12} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute right-12 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full inline-flex items-center justify-center"
                                    style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}
                                    aria-label="Buscar por imagen"
                                >
                                    <IconCamera size={12} />
                                </button>
                            )}
                            {filters.query && !uploadedImage ? (
                                <button
                                    type="button"
                                    aria-label="Limpiar búsqueda"
                                    onClick={() => setFilters((current) => ({ ...current, query: '' }))}
                                    className="absolute right-20 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full inline-flex items-center justify-center"
                                    style={{ background: 'var(--bg-muted)', color: 'var(--fg-secondary)' }}
                                >
                                    <IconX size={12} />
                                </button>
                            ) : null}

                            {showSuggestions && (suggestions.length > 0 || searchHistory.length > 0 || filters.query.length < 2) ? (
                                <div
                                    id="search-suggestions"
                                    role="listbox"
                                    className="absolute left-0 right-0 top-[calc(100%+0.35rem)] rounded-xl border overflow-hidden z-30"
                                    style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-lg)' }}
                                >
                                    {/* Historial de búsqueda */}
                                    {searchHistory.length > 0 && filters.query.length < 2 && (
                                        <>
                                            <div className="px-3 py-1.5 text-xs border-b flex items-center gap-2" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)', background: 'var(--bg-subtle)' }}>
                                                <IconClock size={12} />
                                                Recientes
                                            </div>
                                            {searchHistory.map((historyItem, index) => (
                                                <button
                                                    key={`history-${index}`}
                                                    type="button"
                                                    onClick={() => {
                                                        setFilters((current) => ({ ...current, query: historyItem }));
                                                        setShowSuggestions(false);
                                                    }}
                                                    className="w-full text-left px-3 py-2.5 border-b last:border-b-0 hover:bg-[var(--bg-subtle)] transition-colors"
                                                    style={{ borderColor: 'var(--border)' }}
                                                >
                                                    <p className="text-sm" style={{ color: 'var(--fg)' }}>{historyItem}</p>
                                                </button>
                                            ))}
                                        </>
                                    )}

                                    {/* Sugerencias personalizadas */}
                                    {personalizedSuggestions.length > 0 && filters.query.length < 2 && (
                                        <>
                                            <div className="px-3 py-1.5 text-xs border-b flex items-center gap-2" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)', background: 'var(--bg-subtle)' }}>
                                                <IconFlame size={12} />
                                                Para ti
                                            </div>
                                            {personalizedSuggestions.map((suggestion, index) => (
                                                <button
                                                    key={`personalized-${index}`}
                                                    type="button"
                                                    onClick={() => {
                                                        setFilters((current) => ({ ...current, query: suggestion }));
                                                        handleSubmit();
                                                    }}
                                                    className="w-full text-left px-3 py-2.5 border-b last:border-b-0 hover:bg-[var(--bg-subtle)] transition-colors"
                                                    style={{ borderColor: 'var(--border)' }}
                                                >
                                                    <p className="text-sm" style={{ color: 'var(--fg)' }}>{suggestion}</p>
                                                </button>
                                            ))}
                                        </>
                                    )}

                                    {/* Búsquedas populares */}
                                    {filters.query.length < 2 && (
                                        <>
                                            <div className="px-3 py-1.5 text-xs border-b flex items-center gap-2" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)', background: 'var(--bg-subtle)' }}>
                                                <IconFlame size={12} />
                                                Populares
                                            </div>
                                            {TRENDING_SEARCHES.map((trendingItem, index) => (
                                                <button
                                                    key={`trending-${index}`}
                                                    type="button"
                                                    onClick={() => {
                                                        setFilters((current) => ({ ...current, query: trendingItem }));
                                                        handleSubmit();
                                                    }}
                                                    className="w-full text-left px-3 py-2.5 border-b last:border-b-0 hover:bg-[var(--bg-subtle)] transition-colors"
                                                    style={{ borderColor: 'var(--border)' }}
                                                >
                                                    <p className="text-sm" style={{ color: 'var(--fg)' }}>{trendingItem}</p>
                                                </button>
                                            ))}
                                        </>
                                    )}

                                    {/* Sugerencias categorizadas */}
                                    {filters.query.length >= 2 && (typoCorrection || brandSuggestions.length > 0 || modelSuggestions.length > 0 || vehicleTypeSuggestions.length > 0 || suggestions.length > 0) && (
                                        <>
                                            {/* Corrección de typo */}
                                            {typoCorrection && (
                                                <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                                                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                                        ¿Quisiste decir <span style={{ color: 'var(--fg)', fontWeight: 'medium' }}>{typoCorrection.correction}</span>?
                                                    </p>
                                                </div>
                                            )}

                                            {/* Marcas */}
                                            {brandSuggestions.length > 0 && (
                                                <>
                                                    <div className="px-3 py-1.5 text-xs border-b" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)', background: 'var(--bg-subtle)' }}>
                                                        Marcas
                                                    </div>
                                                    {brandSuggestions.map((brand, index) => (
                                                        <button
                                                            key={`brand-${index}`}
                                                            type="button"
                                                            onClick={() => {
                                                                setFilters((current) => ({ ...current, brand: brand.id, model: '' }));
                                                                setShowSuggestions(false);
                                                            }}
                                                            className="w-full text-left px-3 py-2.5 border-b last:border-b-0 hover:bg-[var(--bg-subtle)] transition-colors"
                                                            style={{ borderColor: 'var(--border)' }}
                                                        >
                                                            <p className="text-sm" style={{ color: 'var(--fg)' }}>{brand.name}</p>
                                                        </button>
                                                    ))}
                                                </>
                                            )}

                                            {/* Modelos */}
                                            {modelSuggestions.length > 0 && (
                                                <>
                                                    <div className="px-3 py-1.5 text-xs border-b" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)', background: 'var(--bg-subtle)' }}>
                                                        Modelos
                                                    </div>
                                                    {modelSuggestions.map((model, index) => (
                                                        <button
                                                            key={`model-${index}`}
                                                            type="button"
                                                            onClick={() => {
                                                                setFilters((current) => ({ ...current, model: model.id }));
                                                                setShowSuggestions(false);
                                                            }}
                                                            className="w-full text-left px-3 py-2.5 border-b last:border-b-0 hover:bg-[var(--bg-subtle)] transition-colors"
                                                            style={{ borderColor: 'var(--border)' }}
                                                        >
                                                            <p className="text-sm" style={{ color: 'var(--fg)' }}>{model.name}</p>
                                                        </button>
                                                    ))}
                                                </>
                                            )}

                                            {/* Tipos de vehículo */}
                                            {vehicleTypeSuggestions.length > 0 && (
                                                <>
                                                    <div className="px-3 py-1.5 text-xs border-b" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)', background: 'var(--bg-subtle)' }}>
                                                        Tipo de vehículo
                                                    </div>
                                                    {vehicleTypeSuggestions.map((vt, index) => (
                                                        <button
                                                            key={`vt-${index}`}
                                                            type="button"
                                                            onClick={() => {
                                                                setFilters((current) => ({ ...current, vehicleType: vt.id as VehicleType, brand: '', model: '' }));
                                                                setShowSuggestions(false);
                                                            }}
                                                            className="w-full text-left px-3 py-2.5 border-b last:border-b-0 hover:bg-[var(--bg-subtle)] transition-colors"
                                                            style={{ borderColor: 'var(--border)' }}
                                                        >
                                                            <p className="text-sm" style={{ color: 'var(--fg)' }}>{vt.name}</p>
                                                        </button>
                                                    ))}
                                                </>
                                            )}

                                            {/* Sugerencias */}
                                            {suggestions.length > 0 && (
                                                <>
                                                    <div className="px-3 py-1.5 text-xs border-b" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)', background: 'var(--bg-subtle)' }}>
                                                        Sugerencias (↓↑ para navegar, Enter para seleccionar)
                                                    </div>
                                                    {suggestions.map((suggestion, index) => (
                                                        <button
                                                            key={`${filters.tab}-${index}`}
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
                                                </>
                                            )}
                                        </>
                                    )}

                                    {/* Preview de resultados */}
                                    {showPreview && previewResults.length > 0 && (
                                        <>
                                            <div className="px-3 py-1.5 text-xs border-b" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)', background: 'var(--bg-subtle)' }}>
                                                Resultados destacados
                                            </div>
                                            {previewResults.map((result) => (
                                                <button
                                                    key={result.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFilters((current) => ({ ...current, query: result.title }));
                                                        handleSubmit();
                                                    }}
                                                    className="w-full text-left px-3 py-2.5 border-b last:border-b-0 hover:bg-[var(--bg-subtle)] transition-colors flex items-center gap-3"
                                                    style={{ borderColor: 'var(--border)' }}
                                                >
                                                    <div className="w-12 h-12 rounded-lg bg-[var(--bg-muted)] flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--bg-muted)' }}>
                                                        <IconSearch size={16} style={{ color: 'var(--fg-muted)' }} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>{result.title}</p>
                                                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{result.location} · {result.year}</p>
                                                    </div>
                                                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{result.price}</p>
                                                </button>
                                            ))}
                                        </>
                                    )}
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

                        <div className="flex gap-2">
                            <PanelButton type="submit" variant="primary" className="h-11 justify-center md:w-auto md:px-6">
                                <IconSearch size={14} />
                                Buscar
                            </PanelButton>
                            <PanelButton
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-11 px-3 shrink-0"
                                onClick={() => setShowMap((current) => !current)}
                                aria-label="Ver mapa"
                            >
                                <IconMap size={15} />
                            </PanelButton>
                        </div>
                    </div>

                    {/* Chips visuales de filtros activos */}
                    {activeChips.length > 0 && (
                        <div className="flex flex-wrap gap-2 items-center mt-3">
                            {activeChips.map((chip) => (
                                <button
                                    key={chip.key}
                                    type="button"
                                    onClick={() => removeChip(chip)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                                    style={{
                                        background: 'var(--bg-subtle)',
                                        borderColor: 'var(--border)',
                                        color: 'var(--fg-secondary)',
                                    }}
                                >
                                    {chip.label}
                                    <IconX size={12} />
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setFilters((current) => ({ ...current, brand: '', model: '', vehicleType: '', fuel: '', region: '', commune: '', priceFrom: '', priceTo: '', yearFrom: '', yearTo: '' }))}
                                className="text-xs underline"
                                style={{ color: 'var(--fg-muted)' }}
                            >
                                Limpiar todos
                            </button>
                        </div>
                    )}

                    {/* Mapa de búsqueda */}
                    <SearchMap showMap={showMap} publications={mapPublications} brandColor="#ff3600" />
                </form>
            </div>
        </section>
    );
}
