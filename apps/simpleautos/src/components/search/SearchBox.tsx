"use client";
import React, { useState, useEffect } from "react";
import { Button, FormSelect as Select, FormInput as Input, SearchBoxLayout } from "@simple/ui";
// Input de precios reemplazado por componente especializado
// Mapeos listingKindMap, vehicleTypeKeyMap, toEnglish eliminados (no usados en UI básica)
import { buildSearchUrl } from "@/lib/builders/buildSearchUrl";
import { logError } from "@/lib/logger";
import { sortRegionsNorthToSouth } from "@/lib/geo/sortRegionsNorthToSouth";
import {
  buildVehicleCategoryOptions,
} from '@/lib/vehicleCategoryOptions';
import { normalizeVehicleTypeSlug } from '@/lib/vehicleTypeLegacyMap';
import { searchVehicles } from '@/lib/searchVehicles';

// Vehicle types ahora dinámicos desde la tabla vehicle_types



// Las opciones de marcas y modelos se cargan dinámicamente desde API interna

const listTypes = [
  { value: "todos", label: "Todos" },
  { value: "venta", label: "Venta" },
  { value: "arriendo", label: "Arriendo" },
  { value: "subasta", label: "Subasta" },
];

type VehicleTypeRow = {
  id: string;
  name: string;
  slug?: string | null;
  category?: string | null;
};

// The listTypes declaration has been moved to its original position.

export interface SearchBoxProps {
  showListType?: boolean;
  onSearch?: (filters: any) => void;
}

export const SearchBox: React.FC<SearchBoxProps> = ({ showListType = true, onSearch }) => {
  // Estado minimal: sin panel avanzado aquí (filtros avanzados en páginas de listados)
  const [vehicleTypes, setVehicleTypes] = useState<{ value: string; label: string }[]>([{ value: '', label: 'Tipo' }]);
  const [marcas, setMarcas] = useState<{ value: string; label: string }[]>([{ value: "", label: "Marca" }]);
  const [modelos, setModelos] = useState<{ value: string; label: string }[]>([{ value: "", label: "Modelo" }]);
  const [regiones, setRegiones] = useState<{ value: string; label: string }[]>([{ value: '', label: 'Región' }]);
  const [comunas, setComunas] = useState<{ value: string; label: string }[]>([{ value: '', label: 'Comuna' }]);
  const [loadingMarcas, setLoadingMarcas] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingRegiones, setLoadingRegiones] = useState(false);
  const [loadingComunas, setLoadingComunas] = useState(false);
  // Estados de error eliminados (no se mostraban en UI); pueden reintroducirse si se añade feedback visual
  // Eliminados estados error* no usados (se puede reintroducir si se añade UI de feedback)
  const [filters, setFilters] = useState({
    listing_kind: "todos",
    type_key: "",
    type_id: "",
    brand_id: "",
    model_id: "",
    region_id: "",
    commune_id: "",
    price_max: "",
    page: 1,
  });

  // Hidratación desde query params al montar
  useEffect(() => {
    let active = true;
    async function syncFromQueryString() {
      if (typeof window === 'undefined') return;
      // Esperar al siguiente microtask para evitar setState sincrónico
      await Promise.resolve();
      if (!active) return;
      const params = new URLSearchParams(window.location.search);
      setFilters(f => {
        const next = {
          ...f,
          listing_kind: params.get('listing_kind') || f.listing_kind,
          type_key: params.get('type_key') || f.type_key,
          type_id: params.get('type_id') || f.type_id,
          brand_id: params.get('brand_id') || '',
          model_id: params.get('model_id') || '',
          region_id: params.get('region_id') || '',
          commune_id: params.get('commune_id') || '',
          price_max: params.get('price_max') || '',
          page: params.get('page') ? Number(params.get('page')) : 1,
        };
        const unchanged = Object.keys(next).every(key => (next as any)[key] === (f as any)[key]);
        return unchanged ? f : next;
      });
    }
    syncFromQueryString();
    return () => {
      active = false;
    };
  }, []);

  // Cargar vehicle_types dinámicamente
  useEffect(() => {
    let active = true;

    const normalizeKey = (v: string) =>
      v.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const coerceCategoryKeyFromParam = (
      raw: string | null | undefined,
      knownKeys: Set<string>
    ): string => {
      const v = normalizeKey(String(raw || ''));
      if (!v) return '';
      if (knownKeys.has(v)) return v;

      // Compat: slugs legacy en URL
      const slug = normalizeVehicleTypeSlug(v) || v;
      const mapped =
        ['auto', 'suv', 'pickup', 'van'].includes(slug)
          ? 'car'
          : slug === 'bus'
            ? 'bus'
            : slug === 'moto'
              ? 'motorcycle'
              : slug === 'camion'
                ? 'truck'
                : slug === 'maquinaria'
                  ? 'machinery'
                  : slug === 'aereo'
                    ? 'aerial'
                    : slug === 'nautico'
                      ? 'nautical'
                      : '';

      if (mapped && knownKeys.has(mapped)) return mapped;
      return '';
    };

    async function fetchTypes() {
      setLoadingTypes(true);
      const response = await fetch('/api/vehicle-catalog?mode=types', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({} as Record<string, unknown>));
      const data = Array.isArray((payload as { types?: unknown[] }).types)
        ? ((payload as { types: VehicleTypeRow[] }).types ?? [])
        : [];
      const error = !response.ok ? new Error('types_fetch_failed') : null;
      if (!active) return;
      if (!error && data) {
        const typedRows: VehicleTypeRow[] = (data ?? []) as VehicleTypeRow[];

        const categoryOptions = buildVehicleCategoryOptions(
          typedRows
            .filter((r) => !!r?.id)
            .map((r: any) => ({
              id: r.id,
              slug: String(r.slug || ''),
              name: r.name,
              category: r.category,
              sort_order: (r as any).sort_order,
            }))
        );

        const typeOptions = [{ value: '', label: 'Tipo' }, ...categoryOptions.map((o) => ({ value: o.key, label: o.label }))];

        setVehicleTypes(typeOptions);

        // Canonicalizar filtros type_key provenientes de URL legacy
        setFilters((f) => {
          const knownKeys = new Set(categoryOptions.map((o) => o.key));
          const coerced = coerceCategoryKeyFromParam(f.type_key, knownKeys);
          if (!coerced) {
            return { ...f, type_key: '', type_id: '' };
          }
          return { ...f, type_key: coerced, type_id: '' };
        });
      }
      setLoadingTypes(false);
    }
    fetchTypes();
    return () => { active = false; };
  }, []);

  // Cargar marcas filtradas por type_id real
  useEffect(() => {
    let active = true;
    async function fetchMarcas() {
      setLoadingMarcas(true);
      let options: { value: string; label: string }[] = [];
      const params = new URLSearchParams({ mode: 'brands' });
      if (filters.type_key) params.set('type_key', filters.type_key);
      const response = await fetch(`/api/vehicle-catalog?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({} as Record<string, unknown>));
      const data = Array.isArray((payload as { brands?: unknown[] }).brands)
        ? ((payload as { brands: Array<{ id: string | number; name: string }> }).brands ?? [])
        : [];
      if (!active) return;
      if (response.ok && data.length > 0) {
        options = data.map((b) => ({ value: String(b.id), label: b.name }));
      }
      if (!active) return;
      setMarcas([{ value: '', label: 'Marca' }, ...options]);
      setLoadingMarcas(false);
    }
    fetchMarcas();
    return () => { active = false; };
  }, [filters.type_key]);

  // Cargar modelos cuando cambia la marca
  useEffect(() => {
    let active = true;
    async function fetchModelos() {
  if (!filters.brand_id) { setModelos([{ value: '', label: 'Modelo' }]); return; }
  setLoadingModelos(true);
      const params = new URLSearchParams({
        mode: 'models',
        brand_id: filters.brand_id,
      });
      if (filters.type_key) params.set('type_key', filters.type_key);
      const response = await fetch(`/api/vehicle-catalog?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({} as Record<string, unknown>));
      const data = Array.isArray((payload as { models?: unknown[] }).models)
        ? ((payload as { models: Array<{ id: string | number; name: string }> }).models ?? [])
        : [];
      const error = !response.ok ? new Error('models_fetch_failed') : null;
      if (!active) return;
  if (error) { /* silencioso */ }
      else if (data) {
  setModelos([{ value: '', label: 'Modelo' }, ...data.map((m) => ({ value: String(m.id), label: m.name }))]);
      }
      setLoadingModelos(false);
    }
    fetchModelos();
    return () => { active = false; };
  }, [filters.brand_id, filters.type_key]);

  // Fetch dinámico de regiones (IDs)
  useEffect(() => {
    let active = true;
    async function fetchRegiones() {
      try {
        setLoadingRegiones(true);
        const response = await fetch('/api/geo?mode=regions', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({} as Record<string, unknown>));
        if (!active) return;
        const rows = Array.isArray((payload as { regions?: unknown[] }).regions)
          ? ((payload as { regions: Array<{ id: string | number; name: string; code?: string | null }> }).regions ?? [])
          : [];
        const sorted = sortRegionsNorthToSouth(rows as any);
        setRegiones([{ value: '', label: 'Región' }, ...sorted.map((r: any) => ({ value: String(r.id), label: r.name }))]);
      } finally {
        if (active) setLoadingRegiones(false);
      }
    }
    fetchRegiones();
    return () => { active = false; };
  }, []);

  // Fetch dinámico de comunas por region_id
  useEffect(() => {
    let active = true;
    async function fetchComunas() {
      try {
        setLoadingComunas(true);
        if (!filters.region_id) {
          setComunas([{ value: '', label: 'Comuna' }]);
          return;
        }
        const params = new URLSearchParams({
          mode: 'communes',
          region_id: filters.region_id,
        });
        const response = await fetch(`/api/geo?${params.toString()}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => ({} as Record<string, unknown>));
        if (!active) return;
        const rows = Array.isArray((payload as { communes?: unknown[] }).communes)
          ? ((payload as { communes: Array<{ id: string | number; name: string }> }).communes ?? [])
          : [];
        setComunas([{ value: '', label: 'Comuna' }, ...rows.map((c) => ({ value: String(c.id), label: c.name }))]);
      } finally {
        if (active) setLoadingComunas(false);
      }
    }
    fetchComunas();
    return () => { active = false; };
  }, [filters.region_id]);

  // Nota: el SearchBox filtra por categoría base (type_key) y resuelve ids internamente.

  // handleChange eliminado (no se utiliza; Selects manejan sus propios onChange)

  // Adaptar envío: mapear valores UI español a inglés para backend
  const mapListingKind = (k: string) => {
    if (k === 'todos' || !k) return undefined;
    if (k === 'venta') return 'sale';
    if (k === 'arriendo') return 'rent';
    if (k === 'subasta') return 'auction';
    return k;
  };

  const handleSubmit = async () => {
    // Si nos pasan un callback `onSearch`, ejecutar búsqueda cliente-side y devolver resultados
    if (typeof onSearch === 'function') {
      try {
        const page_size = 24;
        const page = 1;
        const res = await searchVehicles({
          listing_kind: filters.listing_kind,
          type_key: filters.type_key,
          brand_id: filters.brand_id || undefined,
          model_id: filters.model_id || undefined,
          region_id: filters.region_id || undefined,
          commune_id: filters.commune_id || undefined,
          price_max: filters.price_max || undefined,
          visibility: 'publica',
          page,
          page_size,
        });
        onSearch({ ...res, listing_kind: filters.listing_kind });
      } catch (err) {
        logError('SearchBox search error', err);
        onSearch({ data: [], count: 0, page: 1, page_size: 24 });
      }
      return;
    }

    // Si no hay callback, navegar a la página de resultados usando el URL builder
    const url = buildSearchUrl({
      listing_kind: filters.listing_kind,
      type_key: filters.type_key,
      type_id: '',
      brand_id: filters.brand_id,
      model_id: filters.model_id,
      region_id: filters.region_id,
      commune_id: filters.commune_id,
      price_max: filters.price_max,
      page: 1,
    });
    window.location.href = url;
  };

  return (
    <SearchBoxLayout
      tabs={showListType ? listTypes : undefined}
      activeTab={filters.listing_kind}
      onTabChange={(value) => setFilters(f => ({
        ...f,
        listing_kind: value,
        brand_id: '',
        model_id: '',
        region_id: '',
        commune_id: '',
      }))}
      tabsClassName={showListType ? "hidden sm:flex" : undefined}
      panelProps={{
        as: 'form',
        onSubmit: (event) => {
          event.preventDefault();
          handleSubmit();
        },
        className: 'card-surface p-4 sm:p-5 shadow-card'
      }}
    >
    <div className="grid w-full gap-2 grid-cols-1 sm:grid-cols-2 xl:[grid-template-columns:repeat(7,minmax(0,1fr))_auto]">
      {showListType ? (
        <div className="col-span-1 sm:hidden">
          <Select
            value={filters.listing_kind}
            onChange={(val) =>
              setFilters((f) => ({
                ...f,
                listing_kind: String(val),
                brand_id: "",
                model_id: "",
                region_id: "",
                commune_id: "",
              }))
            }
            options={listTypes}
            placeholder="Tipo de publicación"
          />
        </div>
      ) : null}
      <div className="col-span-1">
            <Select
              value={filters.type_key}
              onChange={val => setFilters(f => ({ ...f, type_key: String(val), type_id: '', brand_id: '', model_id: '' }))}
              options={vehicleTypes}
              placeholder={loadingTypes ? 'Cargando...' : 'Tipo'}
            />
          </div>
          <div className="col-span-1">
            <Select
              value={filters.brand_id}
              onChange={val => setFilters(f => ({ ...f, brand_id: String(val), model_id: '' }))}
              options={marcas}
              placeholder={loadingMarcas ? 'Cargando...' : 'Marca'}
            />
          </div>
          <div className="col-span-1">
            <Select
              value={filters.model_id}
              onChange={val => setFilters(f => ({ ...f, model_id: String(val) }))}
              options={modelos}
              placeholder={loadingModelos ? 'Cargando...' : (filters.brand_id ? 'Modelo' : 'Selecciona marca')}
              disabled={!filters.brand_id || loadingModelos}
            />
          </div>
          <div className="col-span-1">
            <Select
              value={filters.region_id}
              onChange={val => setFilters(f => ({ ...f, region_id: String(val), commune_id: '' }))}
              options={regiones}
              placeholder={loadingRegiones ? 'Cargando...' : 'Región'}
            />
          </div>
          <div className="col-span-1">
            <Select
              value={filters.commune_id}
              onChange={val => setFilters(f => ({ ...f, commune_id: String(val) }))}
              options={comunas}
              placeholder={loadingComunas ? 'Cargando...' : (filters.region_id ? 'Comuna' : 'Selecciona región')}
              disabled={!filters.region_id || loadingComunas}
            />
          </div>
          <div className="col-span-1 xl:col-span-2">
            <label className="sr-only" htmlFor="vehicle-price-max">Precio máximo</label>
            <div className="relative">
              <Input
                id="vehicle-price-max"
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="Precio (CLP)"
                value={filters.price_max}
                onChange={e => setFilters(f => ({ ...f, price_max: e.target.value }))}
                className="pr-4"
              />
            </div>
          </div>
          <div className="col-span-1 flex w-full justify-start sm:justify-end">
            <Button className="w-full sm:w-auto min-w-[130px]" type="submit">Buscar</Button>
          </div>
        </div>
    </SearchBoxLayout>
  );
};

export default SearchBox;







