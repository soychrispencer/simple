"use client";
import React, { useEffect, useState, useMemo } from "react";
import { Button, FormSelect as Select, FormInput as Input } from "@simple/ui";
import { filterSectionLabelClass } from "@simple/ui";
import { getColorOptions, VEHICLE_COLOR_HEX } from '@/lib/colors';
import { normalizeVehicleTypeSlug } from '@/lib/vehicleTypeLegacyMap';
import { sortRegionsNorthToSouth } from '@/lib/geo/sortRegionsNorthToSouth';
import {
  buildVehicleCategoryOptions,
} from '@/lib/vehicleCategoryOptions';

interface AdvancedFiltersProps {
  filters: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onColorChange?: (color: string) => void;
  onMultiChange?: (changes: Record<string, any>) => void; // Para cambios múltiples agrupados
  onSyncChange?: (changes: Record<string, any>) => void; // Para sincronización sin actualizar URL
  onClearFilters?: () => void; // Para limpiar todos los filtros
  onApplyFilters?: () => void; // Para aplicar cambios de forma explícita
  applyDisabled?: boolean;
}

const listingTypeButtons = [
  { value: 'todos', label: 'Todos' },
  { value: 'venta', label: 'Venta' },
  { value: 'arriendo', label: 'Arriendo' },
  { value: 'subasta', label: 'Subasta' },
];

// Carrocería vive en listings_vehicles.body_type (enum vehicle_body_type)
// Con la nueva taxonomía, estos tipos cuelgan de category='car' (Auto/SUV/Pickup/Van)
const BODY_TYPE_ENABLED_CATEGORIES = new Set<string>(['car']);
const BODY_TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'sedan', label: 'Sedán' },
  { value: 'hatchback', label: 'Hatchback' },
  { value: 'coupe', label: 'Coupé' },
  { value: 'suv', label: 'SUV' },
  { value: 'pickup', label: 'Pick-up' },
  { value: 'convertible', label: 'Convertible' },
  { value: 'wagon', label: 'Wagon' },
  { value: 'van', label: 'Van' },
  { value: 'crossover', label: 'Crossover' },
];

const AdvancedFiltersSidebar: React.FC<AdvancedFiltersProps> = ({ filters, onChange, onColorChange, onMultiChange, onSyncChange, onClearFilters, onApplyFilters, applyDisabled }) => {
  const [regions, setRegions] = useState<Array<{ id: string; name: string; code?: string | null }>>([]);
  const [communes, setCommunes] = useState<Array<{ id: string; name: string; region_id: string }>>([]);
  const [vehicleTypes, setVehicleTypes] = useState<Array<{ id: string; slug: string; name: string; category: string | null }>>([]);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [models, setModels] = useState<Array<{ id: string; name: string; brand_id: string }>>([]);
  const [loading, setLoading] = useState(true);

  const categoryOptions = useMemo(() => {
    return buildVehicleCategoryOptions(
      vehicleTypes
        .filter((t) => !!t?.id && !!t?.slug)
        .map((t: any) => ({ id: t.id, slug: t.slug, name: t.name, category: t.category, sort_order: (t as any).sort_order }))
    );
  }, [vehicleTypes]);

  const selectedBaseKey = useMemo(() => {
    const raw = typeof filters.type_key === 'string' ? filters.type_key : '';
    if (!raw) return null;
    const known = new Set(categoryOptions.map((o) => o.key));
    return known.has(raw) ? raw : null;
  }, [filters.type_key, categoryOptions]);

  const vehicleTypeOptions = useMemo(() => [
    { value: '', label: 'Todos' },
    ...categoryOptions.map((o) => ({ value: o.key, label: o.label }))
  ], [categoryOptions]);

  const brandOptions = useMemo(() => [
    { value: '', label: 'Todas' },
    ...brands.map(b => ({ value: String(b.id), label: b.name }))
  ], [brands]);

  // Cargar datos desde backend legado
  useEffect(() => {
    let active = true;
    async function loadData() {
      const [regionsResponse, communesResponse, typesResponse] = await Promise.all([
        fetch('/api/geo?mode=regions', { cache: 'no-store' }),
        fetch('/api/geo?mode=communes', { cache: 'no-store' }),
        fetch('/api/vehicle-catalog?mode=types', { cache: 'no-store' }),
      ]);

      const regionsPayload = await regionsResponse.json().catch(() => ({} as Record<string, unknown>));
      const communesPayload = await communesResponse.json().catch(() => ({} as Record<string, unknown>));
      const regionsData = Array.isArray((regionsPayload as { regions?: unknown[] }).regions)
        ? ((regionsPayload as { regions: Array<{ id: string | number; name: string; code?: string | null }> }).regions ?? [])
        : [];
      const communesData = Array.isArray((communesPayload as { communes?: unknown[] }).communes)
        ? ((communesPayload as { communes: Array<{ id: string | number; name: string; region_id: string | number }> }).communes ?? [])
        : [];

      if (active && regionsData.length > 0) setRegions(sortRegionsNorthToSouth(regionsData as any));
      if (active && communesData.length > 0) {
        setCommunes(
          communesData.map((c) => ({ id: String(c.id), name: c.name, region_id: String(c.region_id) }))
        );
      }

      const typesPayload = await typesResponse.json().catch(() => ({} as Record<string, unknown>));
      const typesData = Array.isArray((typesPayload as { types?: unknown[] }).types)
        ? ((typesPayload as { types: Array<{ id: string; slug: string; name: string; category?: string | null }> }).types ?? [])
        : [];
      if (active && typesResponse.ok && typesData) setVehicleTypes(typesData as any);
    }
    loadData().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  // Marcas: si hay categoría seleccionada, cargar sólo marcas con modelos en esa categoría.
  useEffect(() => {
    let active = true;
    async function loadBrands() {
      const params = new URLSearchParams({ mode: 'brands' });
      if (selectedBaseKey) params.set('type_key', selectedBaseKey);
      const response = await fetch(`/api/vehicle-catalog?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({} as Record<string, unknown>));
      const brandsData = Array.isArray((payload as { brands?: unknown[] }).brands)
        ? ((payload as { brands: Array<{ id: string | number; name: string }> }).brands ?? [])
        : [];
      if (!active) return;
      setBrands(brandsData.map((b) => ({ id: String(b.id), name: b.name })));
    }

    loadBrands();
    return () => {
      active = false;
    };
  }, [selectedBaseKey]);

  // Modelos: dependen de marca + (opcional) categoría
  useEffect(() => {
    let active = true;
    async function loadModels() {
      if (!filters.brand_id) {
        setModels([]);
        return;
      }

      const params = new URLSearchParams({
        mode: 'models',
        brand_id: String(filters.brand_id),
      });
      if (selectedBaseKey) params.set('type_key', selectedBaseKey);

      const response = await fetch(`/api/vehicle-catalog?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({} as Record<string, unknown>));
      const data = Array.isArray((payload as { models?: unknown[] }).models)
        ? ((payload as { models: Array<{ id: string | number; name: string; brand_id: string | number }> }).models ?? [])
        : [];
      const error = !response.ok ? new Error('models_fetch_failed') : null;
      if (!active) return;
      if (error || !data) {
        setModels([]);
        return;
      }
      setModels(data.map((m) => ({ id: String(m.id), name: m.name, brand_id: String(m.brand_id) })) as any);
    }

    loadModels();
    return () => {
      active = false;
    };
  }, [filters.brand_id, selectedBaseKey]);

  // Compat: si llegan URLs legacy con type_id (uuid) o type_key (auto/suv/...) los normalizamos a categoría base.
  useEffect(() => {
    if (!onSyncChange) return;
    if (loading || vehicleTypes.length === 0) return;

    const rawTypeKey = typeof filters.type_key === 'string' ? filters.type_key : '';
    const rawTypeId = typeof filters.type_id === 'string' ? filters.type_id : '';

    const knownKeys = new Set(categoryOptions.map((o) => o.key));

    const slugToCategory = (slugRaw: string): string | null => {
      const slug = normalizeVehicleTypeSlug(slugRaw) || slugRaw;
      if (['auto', 'suv', 'pickup', 'van'].includes(slug)) return 'car';
      if (slug === 'bus') return 'bus';
      if (slug === 'moto') return 'motorcycle';
      if (slug === 'camion') return 'truck';
      if (slug === 'maquinaria') return 'machinery';
      if (slug === 'aereo') return 'aerial';
      if (slug === 'nautico') return 'nautical';
      return null;
    };

    if (rawTypeKey && knownKeys.has(rawTypeKey)) {
      if (rawTypeId) onSyncChange({ type_id: '' });
      return;
    }

    if (rawTypeId) {
      const match = vehicleTypes.find((t) => t.id === rawTypeId);
      if (match) {
        const fromCategory = match.category ? String(match.category) : '';
        const normalizedCategory = fromCategory.trim().toLowerCase();
        const categoryKey = (knownKeys.has(normalizedCategory) ? normalizedCategory : slugToCategory(match.slug)) || null;
        if (categoryKey) {
          onSyncChange({ type_key: categoryKey, type_id: '' });
          return;
        }
      }
    }

    if (rawTypeKey && !knownKeys.has(rawTypeKey)) {
      const categoryKey = slugToCategory(rawTypeKey);
      if (categoryKey && knownKeys.has(categoryKey)) {
        onSyncChange({ type_key: categoryKey, type_id: '' });
      }
    }
  }, [loading, vehicleTypes, filters.type_key, filters.type_id, onSyncChange, categoryOptions]);

  // Filtrar comunas según la región seleccionada
  const filteredCommunes = filters.region_id
    ? communes.filter(c => c.region_id === filters.region_id)
    : communes;

  const shouldShowBodyTypeFilter = Boolean(selectedBaseKey && BODY_TYPE_ENABLED_CATEGORIES.has(selectedBaseKey));

  useEffect(() => {
    if (!shouldShowBodyTypeFilter && filters.body_type) {
      if (onSyncChange) {
        onSyncChange({ body_type: '' });
      } else {
        onChange({ target: { name: 'body_type', value: '' } } as any);
      }
    }
  }, [shouldShowBodyTypeFilter, filters.body_type, onSyncChange, onChange]);

  const modelOptions = useMemo(() => [
    { value: '', label: 'Todos' },
    ...models.map(m => ({ value: String(m.id), label: m.name }))
  ], [models]);

  const regionOptions = useMemo(() => [
    { value: '', label: 'Todas' },
    ...regions.map(r => ({ value: String(r.id), label: r.name }))
  ], [regions]);

  const communeOptions = useMemo(() => [
    { value: '', label: 'Todas' },
    ...filteredCommunes.map(c => ({ value: String(c.id), label: c.name }))
  ], [filteredCommunes]);

  const colorValue: string = typeof filters.color === 'string' ? filters.color : '';
  const activeListingKind = typeof filters.listing_kind === 'string' && filters.listing_kind.length > 0
    ? filters.listing_kind
    : 'todos';

  const handleListingKindChange = (value: string) => {
    if (onMultiChange) {
      onMultiChange({ listing_kind: value, page: 1 });
    } else {
      onChange({ target: { name: 'listing_kind', value } } as any);
    }
  };

  const handleTypeChange = (value: string | number) => {
    const normalized = String(value);
    const payload: Record<string, any> = {
      type_id: '',
      type_key: normalized,
      brand_id: '',
      model_id: '',
      body_type: '',
    };

    if (onMultiChange) {
      onMultiChange(payload);
    } else {
      Object.entries(payload).forEach(([name, val]) => {
        onChange({ target: { name, value: val } } as any);
      });
    }
  };

  const handleApplyClick = () => {
    if (onApplyFilters) {
      onApplyFilters();
    }
  };

  if (loading) {
    return (
      <aside className="w-full md:w-64 card-surface shadow-card p-6 flex flex-col gap-5 sticky top-8 h-fit">
        <h2 className="text-lg font-bold">Filtros avanzados</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </aside>
    );
  }

  return (
      <aside className="w-full md:w-64 card-surface shadow-card p-6 flex flex-col gap-5 sticky top-8 h-fit">
      <h2 className="text-lg font-bold">Filtros avanzados</h2>
      <div>
        <p className={`${filterSectionLabelClass} mb-2`}>Tipo de publicación</p>
        <div className="grid grid-cols-2 gap-2">
          {listingTypeButtons.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={activeListingKind === option.value ? "primary" : "outline"}
              onClick={() => handleListingKindChange(option.value)}
              className="w-full"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="flex flex-col gap-4">
        {/* Tipo de Vehículo */}
        <div className="flex flex-col gap-2">
          <p className={filterSectionLabelClass}>Tipo de vehículo</p>
          <Select
            value={filters.type_key || ''}
            onChange={handleTypeChange}
            options={vehicleTypeOptions}
            size="sm"
          />
        </div>

        {/* Tipo de Carrocería */}
        {shouldShowBodyTypeFilter && (
          <div className="flex flex-col gap-2">
            <p className={filterSectionLabelClass}>Tipo de carrocería</p>
            <Select
              value={filters.body_type || ''}
              onChange={(val) => onChange({ target: { name: 'body_type', value: val } } as any)}
              options={BODY_TYPE_OPTIONS}
              size="sm"
            />
          </div>
        )}

        {/* Marca */}
        <div className="flex flex-col gap-2">
          <p className={filterSectionLabelClass}>Marca</p>
          <Select
            value={filters.brand_id || ''}
            onChange={(val) => {
              if (onMultiChange && val !== filters.brand_id) {
                onMultiChange({ brand_id: val, model_id: '' });
              } else {
                onChange({ target: { name: 'brand_id', value: val } } as any);
                if (val !== filters.brand_id) {
                  onChange({ target: { name: 'model_id', value: '' } } as any);
                }
              }
            }}
            options={brandOptions}
            size="sm"
          />
        </div>

        {/* Modelo */}
        {filters.brand_id && (
          <div className="flex flex-col gap-2">
            <p className={filterSectionLabelClass}>Modelo</p>
            <Select
              value={filters.model_id || ''}
              onChange={(val) => onChange({ target: { name: 'model_id', value: val } } as any)}
              options={modelOptions}
              size="sm"
            />
          </div>
        )}

        {/* Precio */}
        <div className="flex flex-col gap-2">
          <p className={filterSectionLabelClass}>Precio (CLP)</p>
          <div className="flex gap-2">
            <Input
              name="price_min"
              type="number"
              placeholder="Mín"
              value={filters.price_min || ''}
              onChange={onChange}
              fieldSize="sm"
            />
            <Input
              name="price_max"
              type="number"
              placeholder="Máx"
              value={filters.price_max || ''}
              onChange={onChange}
              fieldSize="sm"
            />
          </div>
        </div>

        {/* Año */}
        <div className="flex flex-col gap-2">
          <p className={filterSectionLabelClass}>Año</p>
          <div className="flex gap-2">
            <Input
              name="year_min"
              type="number"
              placeholder="Desde"
              value={filters.year_min || ''}
              onChange={onChange}
              fieldSize="sm"
            />
            <Input
              name="year_max"
              type="number"
              placeholder="Hasta"
              value={filters.year_max || ''}
              onChange={onChange}
              fieldSize="sm"
            />
          </div>
        </div>
        {/* Región */}
        <div className="flex flex-col gap-2">
          <p className={filterSectionLabelClass}>Región</p>
          <Select
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
            size="sm"
          />
        </div>

        {/* Comuna */}
        {filters.region_id && (
          <div className="flex flex-col gap-2">
            <p className={filterSectionLabelClass}>Comuna</p>
            <Select
              value={filters.commune_id || ''}
              onChange={(val) => onChange({ target: { name: 'commune_id', value: val } } as any)}
              options={communeOptions}
              size="sm"
            />
          </div>
        )}

        {/* Transmisión */}
        <div className="flex flex-col gap-2">
          <p className={filterSectionLabelClass}>Transmisión</p>
          <Select
            value={filters.transmission || ''}
            onChange={(val) => onChange({ target: { name: 'transmission', value: val } } as any)}
            options={[
              { value: '', label: 'Todas' },
              { value: 'manual', label: 'Manual' },
              { value: 'automatica', label: 'Automática' },
            ]}
            size="sm"
          />
        </div>

        {/* Combustible */}
        <div className="flex flex-col gap-2">
          <p className={filterSectionLabelClass}>Combustible</p>
          <Select
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
            size="sm"
          />
        </div>

        {/* Estado */}
        <div className="flex flex-col gap-2">
          <p className={filterSectionLabelClass}>Estado</p>
          <Select
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
            size="sm"
          />
        </div>

        {/* Color */}
        <div className="flex flex-col gap-2">
          <p className={filterSectionLabelClass}>Color</p>
          <Select
            value={colorValue}
            onChange={(val) => onColorChange && onColorChange(String(val))}
            options={getColorOptions(true)}
            size="sm"
            colorHexMap={VEHICLE_COLOR_HEX}
          />
        </div>

        {/* Condiciones Comerciales */}
        <div className="flex flex-col gap-3 pt-2 border-t border-border/60">
          <p className={`${filterSectionLabelClass} text-xs text-lighttext/70 dark:text-darktext/70`}>Condiciones comerciales</p>
          
          {/* Financiamiento */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="financing_available"
              checked={filters.financing_available === 'true' || filters.financing_available === true}
              onChange={(e) => onChange({ target: { name: 'financing_available', value: e.target.checked ? 'true' : '' } } as any)}
              className="w-4 h-4 accent-primary text-primary bg-lightbg dark:bg-darkbg border border-border/60 rounded focus:ring-2 focus:ring-[color:var(--color-primary-a40)]"
            />
            <label htmlFor="financing_available" className="text-sm text-lighttext dark:text-darktext cursor-pointer">
              Acepta financiamiento
            </label>
          </div>
        </div>
      </div>

      {(onApplyFilters || onClearFilters) && (
        <div className="pt-2 border-t border-lightborder/60 dark:border-darkborder/60 flex flex-col gap-3">
          {onApplyFilters && (
            <Button type="button" onClick={handleApplyClick} className="w-full" disabled={Boolean(applyDisabled)}>
              Aplicar filtros
            </Button>
          )}
          {onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs font-semibold text-primary hover:text-[var(--color-primary-a80)]"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </aside>
  );
};

export default AdvancedFiltersSidebar;








