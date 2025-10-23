"use client";
import React, { useEffect, useState, useMemo } from "react";
import Select from '@/components/ui/form/Select';
import Input from '@/components/ui/form/Input';
import { getColorOptions, VEHICLE_COLOR_HEX } from '@/lib/colors';
import { getSupabaseClient } from '@/lib/supabase/supabase';

interface AdvancedFiltersProps {
  filters: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onColorChange?: (color: string) => void;
  onMultiChange?: (changes: Record<string, any>) => void; // Para cambios múltiples agrupados
  onSyncChange?: (changes: Record<string, any>) => void; // Para sincronización sin actualizar URL
  onClearFilters?: () => void; // Para limpiar todos los filtros
}

const AdvancedFiltersSidebar: React.FC<AdvancedFiltersProps> = ({ filters, onChange, onColorChange, onMultiChange, onSyncChange, onClearFilters }) => {
  const supabase = getSupabaseClient();
  const [regions, setRegions] = useState<Array<{ id: number; name: string }>>([]);
  const [communes, setCommunes] = useState<Array<{ id: number; name: string; region_id: number }>>([]);
  const [vehicleTypes, setVehicleTypes] = useState<Array<{ id: number; slug: string; label: string }>>([]);
  const [brands, setBrands] = useState<Array<{ id: number; name: string }>>([]);
  const [models, setModels] = useState<Array<{ id: number; name: string; brand_id: number }>>([]);
  const [loading, setLoading] = useState(true);

  const vehicleTypeOptions = useMemo(() => [
    { value: '', label: 'Todos' },
    ...vehicleTypes.map(t => ({ value: String(t.id), label: t.label }))
  ], [vehicleTypes]);

  const brandOptions = useMemo(() => [
    { value: '', label: 'Todas' },
    ...brands.map(b => ({ value: String(b.id), label: b.name }))
  ], [brands]);

  // Cargar datos desde Supabase
  useEffect(() => {
    async function loadData() {
      // Regiones
      const { data: regionsData } = await supabase
        .from('regions')
        .select('id, name')
        .order('name');
      if (regionsData) setRegions(regionsData);

      // Comunas
      const { data: communesData } = await supabase
        .from('communes')
        .select('id, name, region_id')
        .order('name');
      if (communesData) setCommunes(communesData);

      // Tipos de vehículos
      const { data: typesData } = await supabase
        .from('vehicle_types')
        .select('id, slug, label')
        .order('label');
      if (typesData) setVehicleTypes(typesData);

      // Marcas
      const { data: brandsData } = await supabase
        .from('brands')
        .select('id, name')
        .order('name');
      if (brandsData) setBrands(brandsData);

      // Modelos
      const { data: modelsData } = await supabase
        .from('models')
        .select('id, name, brand_id')
        .order('name');
      if (modelsData) setModels(modelsData);
    }
    loadData();
    setLoading(false);
  }, [supabase]);

  // Sincronizar type_id con type_key cuando se cargan los tipos
  useEffect(() => {
    if (!loading && filters.type_key && !filters.type_id && vehicleTypes.length > 0) {
      const type = vehicleTypes.find(t => t.slug === filters.type_key);
      if (type && onSyncChange) {
        onSyncChange({ type_id: String(type.id) });
      }
    }
  }, [loading, filters.type_key, filters.type_id, vehicleTypes, onSyncChange]);

  // Filtrar comunas según la región seleccionada
  const filteredCommunes = filters.region_id
    ? communes.filter(c => c.region_id === parseInt(filters.region_id))
    : communes;

  // Filtrar modelos según la marca seleccionada
  const filteredModels = filters.brand_id
    ? models.filter(m => m.brand_id === parseInt(filters.brand_id))
    : models;

  const modelOptions = useMemo(() => [
    { value: '', label: 'Todos' },
    ...filteredModels.map(m => ({ value: String(m.id), label: m.name }))
  ], [filteredModels]);

  const regionOptions = useMemo(() => [
    { value: '', label: 'Todas' },
    ...regions.map(r => ({ value: String(r.id), label: r.name }))
  ], [regions]);

  const communeOptions = useMemo(() => [
    { value: '', label: 'Todas' },
    ...filteredCommunes.map(c => ({ value: String(c.id), label: c.name }))
  ], [filteredCommunes]);

  const colorValue: string = typeof filters.color === 'string' ? filters.color : '';

  if (loading) {
    return (
      <aside className="w-full md:w-64 bg-white dark:bg-darkcard rounded-2xl shadow-lg p-6 flex flex-col gap-5 sticky top-8 h-fit">
        <h2 className="text-lg font-bold">Filtros avanzados</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-full md:w-64 bg-white dark:bg-darkcard rounded-2xl shadow-lg p-6 flex flex-col gap-5 sticky top-8 h-fit">
      <h2 className="text-lg font-bold">Filtros avanzados</h2>
      
      <div className="flex flex-col gap-4">
        {/* Tipo de Vehículo */}
        <div className="flex flex-col gap-2">
          <Select
            label="Tipo de Vehículo"
            value={filters.type_id || ''}
            onChange={(val) => onChange({ target: { name: 'type_id', value: val } } as any)}
            options={vehicleTypeOptions}
            shape="pill"
            size="sm"
          />
        </div>

        {/* Marca */}
        <div className="flex flex-col gap-2">
          <Select
            label="Marca"
            value={filters.brand_id || ''}
            onChange={(val) => {
              // Usar onMultiChange si está disponible para agrupar actualizaciones
              if (onMultiChange && val !== filters.brand_id) {
                // Limpiar modelo al cambiar marca
                onMultiChange({ brand_id: val, model_id: '' });
              } else {
                onChange({ target: { name: 'brand_id', value: val } } as any);
                // Limpiar modelo al cambiar marca
                if (val !== filters.brand_id) {
                  onChange({ target: { name: 'model_id', value: '' } } as any);
                }
              }
            }}
            options={brandOptions}
            shape="pill"
            size="sm"
          />
        </div>

        {/* Modelo */}
        {filters.brand_id && (
          <div className="flex flex-col gap-2">
            <Select
              label="Modelo"
              value={filters.model_id || ''}
              onChange={(val) => onChange({ target: { name: 'model_id', value: val } } as any)}
              options={modelOptions}
              shape="pill"
              size="sm"
            />
          </div>
        )}

        {/* Tipo de Carrocería (solo para autos) */}
        {filters.type_id === '1' && ( // Asumiendo que 1 es el ID de "autos"
          <div className="flex flex-col gap-2">
            <Select
              label="Tipo de Carrocería"
              value={filters.body_type || ''}
              onChange={(val) => onChange({ target: { name: 'body_type', value: val } } as any)}
              options={[
                { value: '', label: 'Todos' },
                { value: 'sedan', label: 'Sedán' },
                { value: 'hatchback', label: 'Hatchback' },
                { value: 'suv', label: 'SUV' },
                { value: 'pickup', label: 'Pick-up' },
                { value: 'coupe', label: 'Coupé' },
                { value: 'convertible', label: 'Convertible' },
                { value: 'van', label: 'Van' },
                { value: 'station_wagon', label: 'Station Wagon' },
                { value: 'crossover', label: 'Crossover' },
                { value: 'deportivo', label: 'Deportivo' },
              ]}
              shape="pill"
              size="sm"
            />
          </div>
        )}

        {/* Precio */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Precio (CLP)</label>
          <div className="flex gap-2">
            <Input 
              name="price_min" 
              type="number" 
              placeholder="Mín" 
              value={filters.price_min || ''} 
              onChange={onChange}
              shape="pill"
              fieldSize="sm"
            />
            <Input 
              name="price_max" 
              type="number" 
              placeholder="Máx" 
              value={filters.price_max || ''} 
              onChange={onChange}
              shape="pill"
              fieldSize="sm"
            />
          </div>
        </div>

        {/* Año */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Año</label>
          <div className="flex gap-2">
            <Input 
              name="year_min" 
              type="number" 
              placeholder="Desde" 
              value={filters.year_min || ''} 
              onChange={onChange}
              shape="pill"
              fieldSize="sm"
            />
            <Input 
              name="year_max" 
              type="number" 
              placeholder="Hasta" 
              value={filters.year_max || ''} 
              onChange={onChange}
              shape="pill"
              fieldSize="sm"
            />
          </div>
        </div>

        {/* Región */}
        <div className="flex flex-col gap-2">
          <Select
            label="Región"
            value={filters.region_id || ''}
            onChange={(val) => {
              // Usar onMultiChange si está disponible para agrupar actualizaciones
              if (onMultiChange && val !== filters.region_id) {
                // Limpiar comuna al cambiar región
                onMultiChange({ region_id: val, commune_id: '' });
              } else {
                onChange({ target: { name: 'region_id', value: val } } as any);
                // Limpiar comuna al cambiar región
                if (val !== filters.region_id) {
                  onChange({ target: { name: 'commune_id', value: '' } } as any);
                }
              }
            }}
            options={regionOptions}
            shape="pill"
            size="sm"
          />
        </div>

        {/* Comuna */}
        {filters.region_id && (
          <div className="flex flex-col gap-2">
            <Select
              label="Comuna"
              value={filters.commune_id || ''}
              onChange={(val) => onChange({ target: { name: 'commune_id', value: val } } as any)}
              options={communeOptions}
              shape="pill"
              size="sm"
            />
          </div>
        )}

        {/* Transmisión */}
        <div className="flex flex-col gap-2">
          <Select
            label="Transmisión"
            value={filters.transmission || ''}
            onChange={(val) => onChange({ target: { name: 'transmission', value: val } } as any)}
            options={[
              { value: '', label: 'Todas' },
              { value: 'manual', label: 'Manual' },
              { value: 'automatica', label: 'Automática' },
            ]}
            shape="pill"
            size="sm"
          />
        </div>

        {/* Combustible */}
        <div className="flex flex-col gap-2">
          <Select
            label="Combustible"
            value={filters.fuel_type || ''}
            onChange={(val) => onChange({ target: { name: 'fuel_type', value: val } } as any)}
            options={[
              { value: '', label: 'Todos' },
              { value: 'gasolina', label: 'Gasolina' },
              { value: 'diesel', label: 'Diésel' },
              { value: 'electrico', label: 'Eléctrico' },
              { value: 'hibrido', label: 'Híbrido' },
              { value: 'gas_lp', label: 'Gas LP' },
              { value: 'gas_natural', label: 'Gas Natural' },
            ]}
            shape="pill"
            size="sm"
          />
        </div>

        {/* Estado */}
        <div className="flex flex-col gap-2">
          <Select
            label="Estado"
            value={filters.estado || ''}
            onChange={(val) => onChange({ target: { name: 'estado', value: val } } as any)}
            options={[
              { value: '', label: 'Todos' },
              { value: 'nuevo', label: 'Nuevo' },
              { value: 'demo', label: 'Demo' },
              { value: 'semi-nuevo', label: 'Semi-nuevo' },
              { value: 'usado', label: 'Usado' },
              { value: 'certificado', label: 'Certificado' },
              { value: 'restaurado', label: 'Restaurado' },
              { value: 'siniestrado', label: 'Siniestrado' },
              { value: 'para-reparar', label: 'Para reparar' },
              { value: 'para-repuestos', label: 'Para repuestos' },
            ]}
            shape="pill"
            size="sm"
          />
        </div>

        {/* Condiciones Comerciales */}
        <div className="flex flex-col gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Condiciones comerciales</h3>
          
          {/* Financiamiento */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="financing_available"
              checked={filters.financing_available === 'true' || filters.financing_available === true}
              onChange={(e) => onChange({ target: { name: 'financing_available', value: e.target.checked ? 'true' : '' } } as any)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="financing_available" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              Acepta financiamiento
            </label>
          </div>

          {/* Bonos */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="has_bonuses"
              checked={filters.has_bonuses === 'true' || filters.has_bonuses === true}
              onChange={(e) => onChange({ target: { name: 'has_bonuses', value: e.target.checked ? 'true' : '' } } as any)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="has_bonuses" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              Tiene bonos
            </label>
          </div>

          {/* Descuentos */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="has_discounts"
              checked={filters.has_discounts === 'true' || filters.has_discounts === true}
              onChange={(e) => onChange({ target: { name: 'has_discounts', value: e.target.checked ? 'true' : '' } } as any)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="has_discounts" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              Tiene descuentos
            </label>
          </div>
        </div>

        {/* Color */}
        <div className="flex flex-col gap-2">
          <Select
            label="Color"
            value={colorValue}
            onChange={(val) => onColorChange && onColorChange(String(val))}
            options={getColorOptions(true)}
            shape="pill"
            size="sm"
            colorHexMap={VEHICLE_COLOR_HEX}
          />
        </div>

        {/* Botón Limpiar Filtros */}
        {onClearFilters && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClearFilters}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar filtros
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AdvancedFiltersSidebar;
