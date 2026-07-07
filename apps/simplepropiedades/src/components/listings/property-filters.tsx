'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { IconChevronDown, IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { ModernSelect } from '@simple/ui/forms';
import { LOCATION_REGIONS, getCommunesForRegion } from '@simple/utils';
import type { PublicListingSection } from '@/lib/public-listings';

interface PropertyFiltersProps {
    section: PublicListingSection;
}

const PROPERTY_TYPE_OPTIONS = [
    { value: '', label: 'Todos los tipos' },
    { value: 'departamento', label: 'Departamento' },
    { value: 'casa', label: 'Casa' },
    { value: 'oficina', label: 'Oficina' },
    { value: 'local', label: 'Local comercial' },
    { value: 'terreno', label: 'Terreno' },
    { value: 'parcela', label: 'Parcela' },
    { value: 'bodega', label: 'Bodega' },
];

const BEDROOM_OPTIONS = [
    { value: '', label: 'Cualquiera' },
    ...['1', '2', '3', '4', '5+'].map((value) => ({ value, label: `${value} dorm.` })),
];

const BATHROOM_OPTIONS = [
    { value: '', label: 'Cualquiera' },
    ...['1', '2', '3', '4+'].map((value) => ({ value, label: `${value} baño${value === '1' ? '' : 's'}` })),
];

const PARKING_OPTIONS = [
    { value: '', label: 'Cualquiera' },
    ...['1', '2', '3+'].map((value) => ({ value, label: `${value} est.` })),
];

const MIN_AREA_OPTIONS = [
    { value: '', label: 'Sin mínimo' },
    { value: '40', label: 'Desde 40 m²' },
    { value: '60', label: 'Desde 60 m²' },
    { value: '80', label: 'Desde 80 m²' },
    { value: '100', label: 'Desde 100 m²' },
    { value: '150', label: 'Desde 150 m²' },
    { value: '200', label: 'Desde 200 m²' },
];

const SALES_STAGE_OPTIONS = [
    { value: '', label: 'Todas las etapas' },
    { value: 'lanzamiento', label: 'Lanzamiento' },
    { value: 'preventa', label: 'Preventa' },
    { value: 'en verde', label: 'En verde' },
    { value: 'en blanco', label: 'En blanco' },
    { value: 'ultimas unidades', label: 'Últimas unidades' },
    { value: 'entrega inmediata', label: 'Entrega inmediata' },
];

const DELIVERY_STATUS_OPTIONS = [
    { value: '', label: 'Cualquier entrega' },
    { value: 'entrega inmediata', label: 'Entrega inmediata' },
    { value: 'entrega este ano', label: 'Entrega este año' },
    { value: 'entrega futura', label: 'Entrega futura' },
    { value: 'por confirmar', label: 'Por confirmar' },
];

export default function PropertyFilters({ section }: PropertyFiltersProps) {
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
    const [parking, setParking] = useState('');
    const [minArea, setMinArea] = useState('');
    const [salesStage, setSalesStage] = useState('');
    const [deliveryStatus, setDeliveryStatus] = useState('');

    useEffect(() => {
        setQuery(searchParams.get('q') || '');
        setRegion(searchParams.get('region') || '');
        setCommune(searchParams.get('commune') || '');
        setPriceFrom(searchParams.get('price_from') || '');
        setPriceTo(searchParams.get('price_to') || '');
        setPropertyType(searchParams.get('property_type') || '');
        setBedrooms(searchParams.get('bedrooms') || '');
        setBathrooms(searchParams.get('bathrooms') || '');
        setParking(searchParams.get('parking') || '');
        setMinArea(searchParams.get('min_area') || '');
        setSalesStage(searchParams.get('sales_stage') || '');
        setDeliveryStatus(searchParams.get('delivery_status') || '');
    }, []);

    useEffect(() => {
        searchParamsRef.current = searchParams;
    }, [searchParams]);

    const updateFilters = useCallback(() => {
        const params = new URLSearchParams(searchParamsRef.current.toString());

        const setOrDelete = (key: string, value: string) => {
            if (value) params.set(key, value);
            else params.delete(key);
        };

        setOrDelete('q', query);
        setOrDelete('region', region);
        setOrDelete('commune', commune);
        setOrDelete('price_from', priceFrom);
        setOrDelete('price_to', priceTo);
        setOrDelete('property_type', propertyType);
        setOrDelete('bedrooms', bedrooms);
        setOrDelete('bathrooms', bathrooms);
        setOrDelete('parking', parking);
        setOrDelete('min_area', minArea);
        setOrDelete('sales_stage', salesStage);
        setOrDelete('delivery_status', deliveryStatus);
        params.delete('price');

        router.push(`?${params.toString()}`);
    }, [query, region, commune, priceFrom, priceTo, propertyType, bedrooms, bathrooms, parking, minArea, salesStage, deliveryStatus, router]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            updateFilters();
        }, 500);
        return () => window.clearTimeout(timer);
    }, [updateFilters]);

    const clearFilters = () => {
        router.push('?');
        setQuery('');
        setRegion('');
        setCommune('');
        setPriceFrom('');
        setPriceTo('');
        setPropertyType('');
        setBedrooms('');
        setBathrooms('');
        setParking('');
        setMinArea('');
        setSalesStage('');
        setDeliveryStatus('');
    };

    const regionOptions = LOCATION_REGIONS.map((item) => ({ value: item.id, label: item.name }));
    const communeOptions = getCommunesForRegion(region).map((item) => ({ value: item.id, label: item.name }));
    const isProject = section === 'project';

    return (
        <div className="w-full">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>Filtros</h3>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="text-xs underline hidden sm:inline-block"
                            style={{ color: 'var(--fg-muted)' }}
                        >
                            Limpiar filtros
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                            style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                            aria-label={isExpanded ? 'Contraer filtros' : 'Expandir filtros'}
                        >
                            <IconAdjustmentsHorizontal size={14} />
                            {isExpanded ? 'Ocultar' : 'Filtros'}
                            <IconChevronDown size={14} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </button>
                    </div>
                </div>

                <div className={`space-y-4 ${isExpanded ? 'block' : 'hidden sm:block'}`}>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Buscar</label>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={isProject ? 'Proyecto o comuna' : 'Comuna, barrio o palabra clave'}
                            className="w-full h-9 px-3 rounded-lg border text-sm"
                            style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                        />
                    </div>

                    {!isProject ? (
                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Tipo de propiedad</label>
                            <ModernSelect
                                value={propertyType}
                                onChange={setPropertyType}
                                options={PROPERTY_TYPE_OPTIONS}
                                placeholder="Todos los tipos"
                                ariaLabel="Tipo de propiedad"
                                triggerClassName="h-9"
                            />
                        </div>
                    ) : null}

                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Región</label>
                        <ModernSelect
                            value={region}
                            onChange={(value) => {
                                setRegion(value);
                                setCommune('');
                            }}
                            options={regionOptions}
                            placeholder="Todas las regiones"
                            ariaLabel="Región"
                            triggerClassName="h-9"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Comuna</label>
                        <ModernSelect
                            value={commune}
                            onChange={setCommune}
                            options={communeOptions}
                            placeholder="Todas las comunas"
                            ariaLabel="Comuna"
                            triggerClassName="h-9"
                            disabled={!region}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Precio desde</label>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={priceFrom}
                                onChange={(e) => setPriceFrom(e.target.value)}
                                placeholder="$0"
                                className="w-full h-9 px-3 rounded-lg border text-sm"
                                style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Precio hasta</label>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={priceTo}
                                onChange={(e) => setPriceTo(e.target.value)}
                                placeholder="Sin límite"
                                className="w-full h-9 px-3 rounded-lg border text-sm"
                                style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                            />
                        </div>
                    </div>

                    {!isProject ? (
                        <>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Dormitorios</label>
                                <ModernSelect
                                    value={bedrooms}
                                    onChange={setBedrooms}
                                    options={BEDROOM_OPTIONS}
                                    placeholder="Cualquiera"
                                    ariaLabel="Dormitorios"
                                    triggerClassName="h-9"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Baños</label>
                                <ModernSelect
                                    value={bathrooms}
                                    onChange={setBathrooms}
                                    options={BATHROOM_OPTIONS}
                                    placeholder="Cualquiera"
                                    ariaLabel="Baños"
                                    triggerClassName="h-9"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Estacionamientos</label>
                                <ModernSelect
                                    value={parking}
                                    onChange={setParking}
                                    options={PARKING_OPTIONS}
                                    placeholder="Cualquiera"
                                    ariaLabel="Estacionamientos"
                                    triggerClassName="h-9"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Superficie mínima</label>
                                <ModernSelect
                                    value={minArea}
                                    onChange={setMinArea}
                                    options={MIN_AREA_OPTIONS}
                                    placeholder="Sin mínimo"
                                    ariaLabel="Superficie mínima"
                                    triggerClassName="h-9"
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Etapa de venta</label>
                                <ModernSelect
                                    value={salesStage}
                                    onChange={setSalesStage}
                                    options={SALES_STAGE_OPTIONS}
                                    placeholder="Todas las etapas"
                                    ariaLabel="Etapa de venta"
                                    triggerClassName="h-9"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Estado de entrega</label>
                                <ModernSelect
                                    value={deliveryStatus}
                                    onChange={setDeliveryStatus}
                                    options={DELIVERY_STATUS_OPTIONS}
                                    placeholder="Cualquier entrega"
                                    ariaLabel="Estado de entrega"
                                    triggerClassName="h-9"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>Superficie mínima</label>
                                <ModernSelect
                                    value={minArea}
                                    onChange={setMinArea}
                                    options={MIN_AREA_OPTIONS}
                                    placeholder="Sin mínimo"
                                    ariaLabel="Superficie mínima"
                                    triggerClassName="h-9"
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
