'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { ModernSelect } from '@simple/ui';
import { LOCATION_REGIONS, getCommunesForRegion } from '@simple/utils';
import { PanelCard, PanelButton } from '@simple/ui';

interface PropertyFiltersProps {
    currentSection?: 'sale' | 'rent' | 'project';
}

const PROPERTY_TYPE_OPTIONS = [
    { value: '', label: 'Todos los tipos' },
    { value: 'house', label: 'Casa' },
    { value: 'apartment', label: 'Departamento' },
    { value: 'land', label: 'Terreno' },
    { value: 'commercial', label: 'Comercial' },
    { value: 'office', label: 'Oficina' },
    { value: 'warehouse', label: 'Bodega' },
    { value: 'building', label: 'Edificio' },
];

const BEDROOM_OPTIONS = [
    { value: '', label: 'Cualquiera' },
    { value: '1', label: '1+ dormitorio' },
    { value: '2', label: '2+ dormitorios' },
    { value: '3', label: '3+ dormitorios' },
    { value: '4', label: '4+ dormitorios' },
    { value: '5', label: '5+ dormitorios' },
];

const BATHROOM_OPTIONS = [
    { value: '', label: 'Cualquiera' },
    { value: '1', label: '1+ baño' },
    { value: '2', label: '2+ baños' },
    { value: '3', label: '3+ baños' },
    { value: '4', label: '4+ baños' },
];

export default function PropertyFilters({ currentSection = 'sale' }: PropertyFiltersProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const searchParamsRef = useRef(searchParams);
    const [isExpanded, setIsExpanded] = useState(false);
    
    const [query, setQuery] = useState('');
    const [region, setRegion] = useState('');
    const [commune, setCommune] = useState('');
    const [priceFrom, setPriceFrom] = useState('');
    const [priceTo, setPriceTo] = useState('');
    const [propertyType, setPropertyType] = useState('');
    const [bedrooms, setBedrooms] = useState('');
    const [bathrooms, setBathrooms] = useState('');
    const [areaFrom, setAreaFrom] = useState('');
    const [areaTo, setAreaTo] = useState('');

    // Inicializar filtros desde searchParams al montar (solo una vez)
    useEffect(() => {
        setQuery(searchParams.get('q') || '');
        setRegion(searchParams.get('region') || '');
        setCommune(searchParams.get('commune') || '');
        setPriceFrom(searchParams.get('price_from') || '');
        setPriceTo(searchParams.get('price_to') || '');
        setPropertyType(searchParams.get('property_type') || '');
        setBedrooms(searchParams.get('bedrooms') || '');
        setBathrooms(searchParams.get('bathrooms') || '');
        setAreaFrom(searchParams.get('area_from') || '');
        setAreaTo(searchParams.get('area_to') || '');
    }, []);

    // Actualizar searchParamsRef cuando cambian
    useEffect(() => {
        searchParamsRef.current = searchParams;
    }, [searchParams]);

    const updateUrl = () => {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (region) params.set('region', region);
        if (commune) params.set('commune', commune);
        if (priceFrom) params.set('price_from', priceFrom);
        if (priceTo) params.set('price_to', priceTo);
        if (propertyType) params.set('property_type', propertyType);
        if (bedrooms) params.set('bedrooms', bedrooms);
        if (bathrooms) params.set('bathrooms', bathrooms);
        if (areaFrom) params.set('area_from', areaFrom);
        if (areaTo) params.set('area_to', areaTo);
        
        router.push(`/${currentSection === 'rent' ? 'arriendos' : currentSection === 'project' ? 'proyectos' : 'ventas'}${params.toString() ? '?' + params.toString() : ''}`);
    };

    const handleRegionChange = (value: string) => {
        setRegion(value);
        setCommune('');
    };

    const hasActiveFilters = query || region || commune || priceFrom || priceTo || propertyType || bedrooms || bathrooms || areaFrom || areaTo;

    const clearFilters = () => {
        setQuery('');
        setRegion('');
        setCommune('');
        setPriceFrom('');
        setPriceTo('');
        setPropertyType('');
        setBedrooms('');
        setBathrooms('');
        setAreaFrom('');
        setAreaTo('');
        router.push(`/${currentSection === 'rent' ? 'arriendos' : currentSection === 'project' ? 'proyectos' : 'ventas'}`);
    };

    const communes = region ? getCommunesForRegion(region) : [];

    return (
        <PanelCard size="sm">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between gap-2 md:hidden mb-4"
                style={{ color: 'var(--fg)' }}
            >
                <div className="flex items-center gap-2">
                    <IconAdjustmentsHorizontal size={18} />
                    <span className="text-sm font-medium">Filtros</span>
                    {hasActiveFilters && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--button-primary-bg)', color: 'var(--button-primary-color)' }}>•</span>}
                </div>
                <IconAdjustmentsHorizontal size={18} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            <div className={`space-y-4 ${isExpanded ? 'block' : 'hidden md:block'}`}>
                {/* Búsqueda */}
                <div className="space-y-1.5">
                    <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Búsqueda</label>
                    <input
                        type="text"
                        placeholder="Título, dirección..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && updateUrl()}
                        className="w-full px-3 py-2 rounded-lg border text-sm"
                        style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                    />
                </div>

                {/* Ubicación */}
                <div className="space-y-1.5">
                    <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Región</label>
                    <ModernSelect
                        value={region}
                        onChange={handleRegionChange}
                        options={LOCATION_REGIONS.map(r => ({ value: r.id, label: r.name }))}
                        placeholder="Todas las regiones"
                        triggerClassName="w-full text-sm"
                    />
                </div>

                {region && (
                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Comuna</label>
                        <ModernSelect
                            value={commune}
                            onChange={setCommune}
                            options={communes.map(c => ({ value: String(c), label: String(c) }))}
                            placeholder="Todas las comunas"
                            triggerClassName="w-full text-sm"
                        />
                    </div>
                )}

                {/* Precio */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Precio desde</label>
                        <input
                            type="text"
                            placeholder="$0"
                            value={priceFrom}
                            onChange={(e) => setPriceFrom(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && updateUrl()}
                            className="w-full px-3 py-2 rounded-lg border text-sm"
                            style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Precio hasta</label>
                        <input
                            type="text"
                            placeholder="Sin límite"
                            value={priceTo}
                            onChange={(e) => setPriceTo(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && updateUrl()}
                            className="w-full px-3 py-2 rounded-lg border text-sm"
                            style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                        />
                    </div>
                </div>

                {/* Tipo de propiedad */}
                <div className="space-y-1.5">
                    <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Tipo de propiedad</label>
                    <ModernSelect
                        value={propertyType}
                        onChange={setPropertyType}
                        options={PROPERTY_TYPE_OPTIONS}
                        triggerClassName="w-full text-sm"
                    />
                </div>

                {/* Dormitorios y baños */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Dormitorios</label>
                        <ModernSelect
                            value={bedrooms}
                            onChange={setBedrooms}
                            options={BEDROOM_OPTIONS}
                            triggerClassName="w-full text-sm"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Baños</label>
                        <ModernSelect
                            value={bathrooms}
                            onChange={setBathrooms}
                            options={BATHROOM_OPTIONS}
                            triggerClassName="w-full text-sm"
                        />
                    </div>
                </div>

                {/* Área */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Área desde (m²)</label>
                        <input
                            type="number"
                            placeholder="0"
                            value={areaFrom}
                            onChange={(e) => setAreaFrom(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && updateUrl()}
                            className="w-full px-3 py-2 rounded-lg border text-sm"
                            style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Área hasta (m²)</label>
                        <input
                            type="number"
                            placeholder="Sin límite"
                            value={areaTo}
                            onChange={(e) => setAreaTo(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && updateUrl()}
                            className="w-full px-3 py-2 rounded-lg border text-sm"
                            style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                        />
                    </div>
                </div>

                {/* Botones */}
                <div className="flex flex-col gap-2 pt-2">
                    <PanelButton
                        type="button"
                        onClick={updateUrl}
                        className="w-full"
                    >
                        Aplicar filtros
                    </PanelButton>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="w-full text-sm py-2 rounded-lg border"
                            style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>
            </div>
        </PanelCard>
    );
}
