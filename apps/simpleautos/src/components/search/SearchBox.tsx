"use client";
import React, { useState, useEffect } from "react";
import { Button, FormSelect as Select, FormInput as Input, SearchBoxLayout } from "@simple/ui";
// Input de precios reemplazado por componente especializado
import { useSupabase } from "@/lib/supabase/useSupabase";
// Mapeos listingKindMap, vehicleTypeKeyMap, toEnglish eliminados (no usados en UI básica)
import { buildSearchUrl } from "@/lib/builders/buildSearchUrl";
import { logError } from "@/lib/logger";
import { sortRegionsNorthToSouth } from "@/lib/geo/sortRegionsNorthToSouth";
import {
  buildVehicleCategoryOptions,
} from '@/lib/vehicleCategoryOptions';
import { normalizeVehicleTypeSlug } from '@/lib/vehicleTypeLegacyMap';

// Vehicle types ahora dinámicos desde la tabla vehicle_types



// Las opciones de marcas y modelos se cargarán dinámicamente desde Supabase

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

type VehicleTypeOption = {
  value: string;
  label: string;
  id: string;
  category?: string | null;
};


// The listTypes declaration has been moved to its original position.

export interface SearchBoxProps {
  showListType?: boolean;
  onSearch?: (filters: any) => void;
}

export const SearchBox: React.FC<SearchBoxProps> = ({ showListType = true, onSearch }) => {
  // Estado minimal: sin panel avanzado aquí (filtros avanzados en páginas de listados)
  const supabase = useSupabase();
  const [vehicleTypes, setVehicleTypes] = useState<{ value: string; label: string }[]>([{ value: '', label: 'Tipo' }]);
  const [typeIdsByCategory, setTypeIdsByCategory] = useState<Record<string, string[]>>({});
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
      const { data, error } = await supabase
        .from('vehicle_types')
        .select('id,name,slug,category,sort_order,created_at')
        .order('sort_order', { ascending: true })
        .order('name');
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

        const idsMap: Record<string, string[]> = {};
        for (const o of categoryOptions) idsMap[o.key] = o.ids;

        setVehicleTypes(typeOptions);
        setTypeIdsByCategory(idsMap);

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
  }, [supabase]);

  // Cargar marcas filtradas por type_id real
  useEffect(() => {
    let active = true;
    async function fetchMarcas() {
      setLoadingMarcas(true);
      let options: { value: string; label: string }[] = [];
      const allowedTypeIds = filters.type_key ? (typeIdsByCategory[filters.type_key] || []) : [];
      if (allowedTypeIds.length > 0) {
        const { data, error } = await supabase
          .from('models')
          .select('brand_id, brands!inner(id,name)')
          .in('vehicle_type_id', allowedTypeIds);
        if (!active) return;
        if (!error && data) {
          const brandMap = new Map<string, string>();
          data.forEach((row: any) => {
            const brand = row.brands;
            if (brand?.id && brand?.name) {
              brandMap.set(brand.id, brand.name);
            }
          });
          options = Array.from(brandMap.entries())
            .sort((a, b) => a[1].localeCompare(b[1], 'es'))
            .map(([id, name]) => ({ value: id, label: name }));
        }
      } else {
        const { data, error } = await supabase.from('brands').select('id,name').order('name');
        if (!active) return;
        if (!error && data) {
          options = data.map((b: any) => ({ value: b.id, label: b.name }));
        }
      }
      if (!active) return;
      setMarcas([{ value: '', label: 'Marca' }, ...options]);
      setLoadingMarcas(false);
    }
    fetchMarcas();
    return () => { active = false; };
  }, [supabase, filters.type_key, typeIdsByCategory]);

  // Cargar modelos cuando cambia la marca
  useEffect(() => {
    let active = true;
    async function fetchModelos() {
  if (!filters.brand_id) { setModelos([{ value: '', label: 'Modelo' }]); return; }
  setLoadingModelos(true);
      let query = supabase.from('models').select('id, name').eq('brand_id', filters.brand_id).order('name');
      const allowedTypeIds = filters.type_key ? (typeIdsByCategory[filters.type_key] || []) : [];
      if (allowedTypeIds.length > 0) query = query.in('vehicle_type_id', allowedTypeIds);
      const { data, error } = await query;
      if (!active) return;
  if (error) { /* silencioso */ }
      else if (data) {
  setModelos([{ value: '', label: 'Modelo' }, ...data.map((m: any) => ({ value: m.id, label: m.name }))]);
      }
      setLoadingModelos(false);
    }
    fetchModelos();
    return () => { active = false; };
  }, [filters.brand_id, filters.type_key, typeIdsByCategory, supabase]);

  // Fetch dinámico de regiones (IDs)
  useEffect(() => {
    let active = true;
    async function fetchRegiones() {
  setLoadingRegiones(true);
      const { data, error } = await supabase.from('regions').select('id, name, code').order('name');
      if (!active) return;
  if (error) { /* silencioso */ }
      else if (data) {
        const sorted = sortRegionsNorthToSouth(data as any);
        setRegiones([{ value: '', label: 'Región' }, ...sorted.map((r:any)=>({ value: r.id, label: r.name }))]);
      }
      setLoadingRegiones(false);
    }
    fetchRegiones();
    return () => { active = false; };
  }, [supabase]);

  // Fetch dinámico de comunas por region_id
  useEffect(() => {
    let active = true;
    async function fetchComunas() {
  setLoadingComunas(true);
      if (!filters.region_id) { setComunas([{ value: '', label: 'Comuna' }]); setLoadingComunas(false); return; }
      const { data, error } = await supabase.from('communes').select('id, name').eq('region_id', filters.region_id).order('name');
      if (!active) return;
  if (error) { /* silencioso */ }
      else if (data) {
        setComunas([{ value: '', label: 'Comuna' }, ...data.map((c:any)=>({ value: c.id, label: c.name }))]);
      }
      setLoadingComunas(false);
    }
    fetchComunas();
    return () => { active = false; };
  }, [supabase, filters.region_id]);

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

        // Obtener vertical id para vehicles
        const { data: verticalData } = await supabase.from('verticals').select('id').eq('key', 'vehicles').single();
        const verticalId = verticalData?.id;

        const baseSelect = 'id,title,listing_type,price,created_at,rent_daily_price,rent_weekly_price,rent_monthly_price,rent_security_deposit,auction_start_price,auction_start_at,auction_end_at,region_id,commune_id,user_id,communes(name),regions(name),listings_vehicles!inner(year,mileage,brand_id,model_id,transmission,fuel_type,color,condition,brands!inner(name),models!inner(name))';

        let query = supabase.from('listings').select(baseSelect, { count: 'exact' });
        if (verticalId) query = query.eq('vertical_id', verticalId);
        // El enum listing_status en la DB usa 'published' en vez de 'active'
        query = query.eq('status', 'published');

        const listingType = mapListingKind(filters.listing_kind);
        if (listingType) query = query.eq('listing_type', listingType);
        const allowedTypeIds = filters.type_key ? (typeIdsByCategory[filters.type_key] || []) : [];
        if (allowedTypeIds.length > 0) query = query.in('listings_vehicles.vehicle_type_id', allowedTypeIds);
        if (filters.brand_id) query = query.eq('listings_vehicles.brand_id', filters.brand_id);
        if (filters.model_id) query = query.eq('listings_vehicles.model_id', filters.model_id);
        if (filters.region_id) query = query.eq('region_id', filters.region_id);
        if (filters.commune_id) query = query.eq('commune_id', filters.commune_id);
        if (filters.price_max) query = query.lte('price', Number(filters.price_max));

        query = query.order('created_at', { ascending: false }).limit(page_size).range(0, page_size - 1);

        const { data, error, count } = await query;
        if (error) {
          logError('SearchBox: error performing search', error);
          onSearch({ data: [], count: 0, page, page_size, listing_kind: filters.listing_kind });
        } else {
          onSearch({ data: data || [], count: count || 0, page, page_size, listing_kind: filters.listing_kind });
        }
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







