'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ModernSelect from '@/components/ui/modern-select';
import { LOCATION_REGIONS, getCommunesForRegion } from '@simple/utils';
import { loadPublishWizardCatalog, type CatalogBrand, type CatalogModel } from '@/lib/publish-wizard-catalog';
import { PanelCard, PanelButton } from '@simple/ui';

export type VehicleType = 'car' | 'motorcycle' | 'truck' | 'bus' | 'machinery' | 'nautical' | 'aerial';

interface VehicleFiltersProps {
    currentVehicleType?: VehicleType | '';
}

const VEHICLE_TYPE_OPTIONS = [
    { value: '', label: 'Todos los vehículos' },
    { value: 'car', label: 'Autos y SUV' },
    { value: 'motorcycle', label: 'Motos' },
    { value: 'truck', label: 'Camiones' },
    { value: 'bus', label: 'Buses' },
    { value: 'machinery', label: 'Maquinaria' },
    { value: 'nautical', label: 'Náutica' },
    { value: 'aerial', label: 'Aéreos' },
];

const FUEL_OPTIONS = [
    { value: '', label: 'Todos los combustibles' },
    { value: 'gasolina', label: 'Gasolina' },
    { value: 'diesel', label: 'Diésel' },
    { value: 'electrico', label: 'Eléctrico' },
    { value: 'hibrido', label: 'Híbrido' },
    { value: 'gnc', label: 'GNC' },
    { value: 'glp', label: 'GLP' },
];

// Filtros específicos por tipo de vehículo
const MOTORCYCLE_TYPES = [
    { value: '', label: 'Todos los tipos' },
    { value: 'scooter', label: 'Scooter' },
    { value: 'sport', label: 'Deportiva' },
    { value: 'trail', label: 'Trail' },
    { value: 'naked', label: 'Naked' },
    { value: 'cruiser', label: 'Cruiser' },
    { value: 'touring', label: 'Touring' },
    { value: 'offroad', label: 'Off-road' },
];

const TRUCK_TYPES = [
    { value: '', label: 'Todos los tipos' },
    { value: 'light', label: 'Liviano' },
    { value: 'medium', label: 'Mediano' },
    { value: 'heavy', label: 'Pesado' },
];

const TRUCK_BODY_TYPES = [
    { value: '', label: 'Todas las carrocerías' },
    { value: 'box', label: 'Caja' },
    { value: 'flatbed', label: 'Plataforma' },
    { value: 'tanker', label: 'Tanque' },
    { value: 'refrigerated', label: 'Refrigerado' },
];

const BUS_TYPES = [
    { value: '', label: 'Todos los tipos' },
    { value: 'urban', label: 'Urbano' },
    { value: 'interurban', label: 'Interurbano' },
    { value: 'school', label: 'Escolar' },
    { value: 'tourist', label: 'Turístico' },
];

const MACHINERY_TYPES = [
    { value: '', label: 'Todos los tipos' },
    { value: 'excavator', label: 'Excavadora' },
    { value: 'crane', label: 'Grúa' },
    { value: 'bulldozer', label: 'Bulldozer' },
    { value: 'loader', label: 'Cargador' },
    { value: 'backhoe', label: 'Retroexcavadora' },
    { value: 'roller', label: 'Rodillo' },
];

const NAUTICAL_TYPES = [
    { value: '', label: 'Todos los tipos' },
    { value: 'sailboat', label: 'Velero' },
    { value: 'motorboat', label: 'Lancha' },
    { value: 'yacht', label: 'Yate' },
    { value: 'kayak', label: 'Kayak' },
    { value: 'jetski', label: 'Jet Ski' },
];

const AERIAL_TYPES = [
    { value: '', label: 'Todos los tipos' },
    { value: 'helicopter', label: 'Helicóptero' },
    { value: 'airplane', label: 'Avión' },
    { value: 'ultralight', label: 'Ultraligero' },
];

export default function VehicleFilters({ currentVehicleType = '' }: VehicleFiltersProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const searchParamsRef = useRef(searchParams);
    const [catalog, setCatalog] = useState<{ brands: CatalogBrand[]; models: CatalogModel[] } | null>(null);
    
    // Filtros básicos
    const [query, setQuery] = useState('');
    const [region, setRegion] = useState('');
    const [commune, setCommune] = useState('');
    const [priceFrom, setPriceFrom] = useState('');
    const [priceTo, setPriceTo] = useState('');
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [yearFrom, setYearFrom] = useState('');
    const [yearTo, setYearTo] = useState('');
    const [fuel, setFuel] = useState('');
    
    // Filtros específicos por tipo
    const [vehicleType, setVehicleType] = useState<VehicleType | ''>(currentVehicleType);
    const [motorcycleType, setMotorcycleType] = useState('');
    const [truckType, setTruckType] = useState('');
    const [truckBodyType, setTruckBodyType] = useState('');
    const [busType, setBusType] = useState('');
    const [machineryType, setMachineryType] = useState('');
    const [nauticalType, setNauticalType] = useState('');
    const [aerialType, setAerialType] = useState('');

    useEffect(() => {
        loadPublishWizardCatalog().then(setCatalog);
    }, []);

    // Inicializar todos los filtros desde searchParams al montar (solo una vez)
    useEffect(() => {
        setQuery(searchParams.get('q') || '');
        setRegion(searchParams.get('region') || '');
        setCommune(searchParams.get('commune') || '');
        setPriceFrom(searchParams.get('price_from') || '');
        setPriceTo(searchParams.get('price_to') || '');
        setBrand(searchParams.get('brand') || '');
        setModel(searchParams.get('model') || '');
        setYearFrom(searchParams.get('year_from') || '');
        setYearTo(searchParams.get('year_to') || '');
        setFuel(searchParams.get('fuel') || '');
        setVehicleType((searchParams.get('vehicle_type') || '') as VehicleType | '');
        setMotorcycleType(searchParams.get('motorcycle_type') || '');
        setTruckType(searchParams.get('truck_type') || '');
        setTruckBodyType(searchParams.get('truck_body_type') || '');
        setBusType(searchParams.get('bus_type') || '');
        setMachineryType(searchParams.get('machinery_type') || '');
        setNauticalType(searchParams.get('nautical_type') || '');
        setAerialType(searchParams.get('aerial_type') || '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setVehicleType(currentVehicleType);
    }, [currentVehicleType]);

    // Actualizar ref cuando cambian los searchParams
    useEffect(() => {
        searchParamsRef.current = searchParams;
    }, [searchParams]);

    // Función de actualización de filtros memoizada
    const updateFilters = useCallback(() => {
        const params = new URLSearchParams(searchParamsRef.current.toString());
        
        // Filtros básicos
        if (query) params.set('q', query);
        else params.delete('q');
        
        if (region) params.set('region', region);
        else params.delete('region');
        
        if (commune) params.set('commune', commune);
        else params.delete('commune');
        
        if (priceFrom) params.set('price_from', priceFrom);
        else params.delete('price_from');
        
        if (priceTo) params.set('price_to', priceTo);
        else params.delete('price_to');
        
        if (brand) params.set('brand', brand);
        else params.delete('brand');
        
        if (model) params.set('model', model);
        else params.delete('model');
        
        if (yearFrom) params.set('year_from', yearFrom);
        else params.delete('year_from');
        
        if (yearTo) params.set('year_to', yearTo);
        else params.delete('year_to');
        
        if (fuel) params.set('fuel', fuel);
        else params.delete('fuel');
        
        // Tipo de vehículo
        if (vehicleType) {
            params.set('vehicle_type', vehicleType);
        } else {
            params.delete('vehicle_type');
        }

        // Filtros específicos por tipo
        if (vehicleType === 'motorcycle' && motorcycleType) {
            params.set('motorcycle_type', motorcycleType);
        } else {
            params.delete('motorcycle_type');
        }

        if (vehicleType === 'truck') {
            if (truckType) params.set('truck_type', truckType);
            else params.delete('truck_type');
            if (truckBodyType) params.set('truck_body_type', truckBodyType);
            else params.delete('truck_body_type');
        } else {
            params.delete('truck_type');
            params.delete('truck_body_type');
        }

        if (vehicleType === 'bus' && busType) {
            params.set('bus_type', busType);
        } else {
            params.delete('bus_type');
        }

        if (vehicleType === 'machinery' && machineryType) {
            params.set('machinery_type', machineryType);
        } else {
            params.delete('machinery_type');
        }

        if (vehicleType === 'nautical' && nauticalType) {
            params.set('nautical_type', nauticalType);
        } else {
            params.delete('nautical_type');
        }

        if (vehicleType === 'aerial' && aerialType) {
            params.set('aerial_type', aerialType);
        } else {
            params.delete('aerial_type');
        }

        router.push(`?${params.toString()}`);
    }, [query, region, commune, priceFrom, priceTo, brand, model, yearFrom, yearTo, fuel, vehicleType, motorcycleType, truckType, truckBodyType, busType, machineryType, nauticalType, aerialType, router]);

    // Debounce para actualización automática de filtros
    useEffect(() => {
        const timer = setTimeout(() => {
            updateFilters();
        }, 500); // 500ms de debounce

        return () => clearTimeout(timer);
    }, [updateFilters]);

    const clearFilters = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('q');
        params.delete('region');
        params.delete('commune');
        params.delete('price_from');
        params.delete('price_to');
        params.delete('brand');
        params.delete('model');
        params.delete('year_from');
        params.delete('year_to');
        params.delete('fuel');
        params.delete('vehicle_type');
        params.delete('motorcycle_type');
        params.delete('truck_type');
        params.delete('truck_body_type');
        params.delete('bus_type');
        params.delete('machinery_type');
        params.delete('nautical_type');
        params.delete('aerial_type');
        router.push(`?${params.toString()}`);
        setQuery('');
        setRegion('');
        setCommune('');
        setPriceFrom('');
        setPriceTo('');
        setBrand('');
        setModel('');
        setYearFrom('');
        setYearTo('');
        setFuel('');
        setVehicleType('');
        setMotorcycleType('');
        setTruckType('');
        setTruckBodyType('');
        setBusType('');
        setMachineryType('');
        setNauticalType('');
        setAerialType('');
    };

    const regionOptions = LOCATION_REGIONS.map(r => ({ value: r.id, label: r.name }));
    const communeOptions = getCommunesForRegion(region).map(c => ({ value: c.id, label: c.name }));
    const selectedVehicleTypeForCatalog = vehicleType || 'car';
    const brandOptions = catalog?.brands.filter(b => b.vehicleTypes.includes(selectedVehicleTypeForCatalog)).map(b => ({ value: b.id, label: b.name })) || [];
    const modelOptions = catalog?.models.filter(m => m.brandId === brand && m.vehicleTypes.includes(selectedVehicleTypeForCatalog)).map(m => ({ value: m.id, label: m.name })) || [];

    return (
        <PanelCard size="md">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>Filtros</h3>
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="text-xs underline"
                        style={{ color: 'var(--fg-muted)' }}
                    >
                        Limpiar filtros
                    </button>
                </div>

                {/* Búsqueda */}
                <div>
                    <label className="block text-xs mb-2" style={{ color: 'var(--fg-secondary)' }}>Buscar</label>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Marca, modelo o versión"
                        className="w-full h-9 px-3 rounded-lg border text-sm"
                        style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                    />
                </div>

                {/* Tipo de vehículo */}
                <div>
                    <label className="block text-xs mb-2" style={{ color: 'var(--fg-secondary)' }}>Tipo de vehículo</label>
                    <ModernSelect
                        value={vehicleType}
                        onChange={(value) => {
                            setVehicleType(value as VehicleType | '');
                            setBrand('');
                            setModel('');
                        }}
                        options={VEHICLE_TYPE_OPTIONS}
                        placeholder="Todos los vehículos"
                        ariaLabel="Tipo de vehículo"
                        triggerClassName="h-9"
                    />
                </div>

                {/* Marca */}
                <div>
                    <label className="block text-xs mb-2" style={{ color: 'var(--fg-secondary)' }}>Marca</label>
                    <ModernSelect
                        value={brand}
                        onChange={setBrand}
                        options={brandOptions}
                        placeholder="Todas las marcas"
                        ariaLabel="Marca"
                        triggerClassName="h-9"
                    />
                </div>

                {/* Modelo */}
                <div>
                    <label className="block text-xs mb-2" style={{ color: 'var(--fg-secondary)' }}>Modelo</label>
                    <ModernSelect
                        value={model}
                        onChange={setModel}
                        options={modelOptions}
                        placeholder="Todos los modelos"
                        ariaLabel="Modelo"
                        triggerClassName="h-9"
                        disabled={!brand}
                    />
                </div>

                {/* Región */}
                <div>
                    <label className="block text-xs mb-2" style={{ color: 'var(--fg-secondary)' }}>Región</label>
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

                {/* Comuna */}
                <div>
                    <label className="block text-xs mb-2" style={{ color: 'var(--fg-secondary)' }}>Comuna</label>
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

                {/* Precio */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs mb-2" style={{ color: 'var(--fg-secondary)' }}>Precio desde</label>
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
                    <div>
                        <label className="block text-xs mb-2" style={{ color: 'var(--fg-secondary)' }}>Precio hasta</label>
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

                {/* Año */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs mb-2" style={{ color: 'var(--fg-secondary)' }}>Año desde</label>
                        <input
                            type="number"
                            min="1900"
                            max="2100"
                            step="1"
                            value={yearFrom}
                            onChange={(e) => setYearFrom(e.target.value)}
                            placeholder="Ej: 2010"
                            className="w-full h-9 px-3 rounded-lg border text-sm"
                            style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                        />
                    </div>
                    <div>
                        <label className="block text-xs mb-2" style={{ color: 'var(--fg-secondary)' }}>Año hasta</label>
                        <input
                            type="number"
                            min="1900"
                            max="2100"
                            step="1"
                            value={yearTo}
                            onChange={(e) => setYearTo(e.target.value)}
                            placeholder="Ej: 2024"
                            className="w-full h-9 px-3 rounded-lg border text-sm"
                            style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                        />
                    </div>
                </div>

                {/* Combustible */}
                <div>
                    <label className="block text-xs mb-2" style={{ color: 'var(--fg-secondary)' }}>Combustible</label>
                    <ModernSelect
                        value={fuel}
                        onChange={setFuel}
                        options={FUEL_OPTIONS}
                        placeholder="Todos los combustibles"
                        ariaLabel="Combustible"
                        triggerClassName="h-9"
                    />
                </div>

                {/* Filtros específicos para motos */}
                {vehicleType === 'motorcycle' && (
                    <div>
                        <label className="block text-xs mb-2" style={{ color: 'var(--fg-secondary)' }}>Tipo de moto</label>
                        <ModernSelect
                            value={motorcycleType}
                            onChange={setMotorcycleType}
                            options={MOTORCYCLE_TYPES}
                            placeholder="Todos los tipos"
                            ariaLabel="Tipo de moto"
                            triggerClassName="h-9"
                        />
                    </div>
                )}

                {/* Filtros específicos para camiones */}
                {vehicleType === 'truck' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs mb-2" style={{ color: 'var(--fg-secondary)' }}>Tipo de camión</label>
                            <ModernSelect
                                value={truckType}
                                onChange={setTruckType}
                                options={TRUCK_TYPES}
                                placeholder="Todos los tipos"
                                ariaLabel="Tipo de camión"
                                triggerClassName="h-9"
                            />
                        </div>
                        <div>
                            <label className="block text-xs mb-2" style={{ color: 'var(--fg-secondary)' }}>Tipo de carrocería</label>
                            <ModernSelect
                                value={truckBodyType}
                                onChange={setTruckBodyType}
                                options={TRUCK_BODY_TYPES}
                                placeholder="Todas las carrocerías"
                                ariaLabel="Tipo de carrocería"
                                triggerClassName="h-9"
                            />
                        </div>
                    </div>
                )}

                {/* Filtros específicos para buses */}
                {vehicleType === 'bus' && (
                    <div>
                        <label className="block text-xs mb-2" style={{ color: 'var(--fg-secondary)' }}>Tipo de bus</label>
                        <ModernSelect
                            value={busType}
                            onChange={setBusType}
                            options={BUS_TYPES}
                            placeholder="Todos los tipos"
                            ariaLabel="Tipo de bus"
                            triggerClassName="h-9"
                        />
                    </div>
                )}

                {/* Filtros específicos para maquinaria */}
                {vehicleType === 'machinery' && (
                    <div>
                        <label className="block text-xs mb-2" style={{ color: 'var(--fg-secondary)' }}>Tipo de maquinaria</label>
                        <ModernSelect
                            value={machineryType}
                            onChange={setMachineryType}
                            options={MACHINERY_TYPES}
                            placeholder="Todos los tipos"
                            ariaLabel="Tipo de maquinaria"
                            triggerClassName="h-9"
                        />
                    </div>
                )}

                {/* Filtros específicos para náutica */}
                {vehicleType === 'nautical' && (
                    <div>
                        <label className="block text-xs mb-2" style={{ color: 'var(--fg-secondary)' }}>Tipo de embarcación</label>
                        <ModernSelect
                            value={nauticalType}
                            onChange={setNauticalType}
                            options={NAUTICAL_TYPES}
                            placeholder="Todos los tipos"
                            ariaLabel="Tipo de embarcación"
                            triggerClassName="h-9"
                        />
                    </div>
                )}

                {/* Filtros específicos para aéreos */}
                {vehicleType === 'aerial' && (
                    <div>
                        <label className="block text-xs mb-2" style={{ color: 'var(--fg-secondary)' }}>Tipo de aeronave</label>
                        <ModernSelect
                            value={aerialType}
                            onChange={setAerialType}
                            options={AERIAL_TYPES}
                            placeholder="Todos los tipos"
                            ariaLabel="Tipo de aeronave"
                            triggerClassName="h-9"
                        />
                    </div>
                )}
            </div>
        </PanelCard>
    );
}
