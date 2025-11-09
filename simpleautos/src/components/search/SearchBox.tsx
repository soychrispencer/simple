"use client";
import React, { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/form/Select";
// Input de precios reemplazado por componente especializado
import { useSupabase } from "@/lib/supabase/useSupabase";
// Mapeos listingKindMap, vehicleTypeKeyMap, toEnglish eliminados (no usados en UI básica)
import { buildSearchUrl } from "@/lib/builders/buildSearchUrl";

// Vehicle types ahora dinámicos desde la tabla vehicle_types



// Las opciones de marcas y modelos se cargarán dinámicamente desde Supabase

const listTypes = [
  { value: "venta", label: "Venta" },
  { value: "arriendo", label: "Arriendo" },
  { value: "subasta", label: "Subasta" },
];


// The listTypes declaration has been moved to its original position.

export interface SearchBoxProps {
  showListType?: boolean;
  onSearch?: (filters: any) => void;
}

export const SearchBox: React.FC<SearchBoxProps> = ({ showListType = true, onSearch }) => {
  // Estado minimal: sin panel avanzado aquí (filtros avanzados en páginas de listados)
  const supabase = useSupabase();
  const [vehicleTypes, setVehicleTypes] = useState<{ value: string; label: string }[]>([{ value: '', label: 'Tipo' }]);
  const [typeIdMap, setTypeIdMap] = useState<Record<string,string>>({}); // slug -> id
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
    listing_kind: "venta",
    type_key: "auto",
    type_id: "",
    brand_id: "",
    model_id: "",
    region_id: "",
    commune_id: "",
    page: 1,
  });

  // Hidratación desde query params al montar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters(f => ({
      ...f,
      listing_kind: params.get('listing_kind') || f.listing_kind,
      type_key: params.get('type_key') || f.type_key,
      brand_id: params.get('brand_id') || '',
      model_id: params.get('model_id') || '',
      region_id: params.get('region_id') || '',
      commune_id: params.get('commune_id') || '',
      page: params.get('page') ? Number(params.get('page')) : 1,
    }));
  }, []);

  // Cargar vehicle_types dinámicamente
  useEffect(() => {
    let active = true;
    async function fetchTypes() {
  setLoadingTypes(true);
  const { data, error } = await supabase.from('vehicle_types').select('id,slug,label,active').eq('active', true).order('sort_order');
      if (!active) return;
  if (error) {/* fallo silencioso sin UI */}
      else if (data) {
        setVehicleTypes([{ value: '', label: 'Tipo' }, ...data.map((t:any)=>({ value: t.slug, label: t.label }))]);
        const map: Record<string,string> = {};
        data.forEach((t:any)=>{ map[t.slug] = t.id; });
        setTypeIdMap(map);
        setFilters(f => {
          const valid = data.some((t:any)=>t.slug===f.type_key);
            return { ...f, type_key: valid ? f.type_key : '', type_id: valid ? map[f.type_key] : '' };
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
      let query = supabase.from('brands').select('id,name,type_id');
      if (filters.type_id) query = query.eq('type_id', filters.type_id);
      const { data, error } = await query.order('name');
      if (!active) return;
  if (error) { /* silencioso */ }
      else if (data) {
        setMarcas([{ value: '', label: 'Marca' }, ...data.map((m: any) => ({ value: m.id, label: m.name }))]);
      }
      setLoadingMarcas(false);
    }
    fetchMarcas();
    return () => { active = false; };
  }, [supabase, filters.type_id]);

  // Cargar modelos cuando cambia la marca
  useEffect(() => {
    let active = true;
    async function fetchModelos() {
  if (!filters.brand_id) { setModelos([{ value: '', label: 'Modelo' }]); return; }
  setLoadingModelos(true);
  const { data, error } = await supabase.from('models').select('id, name').eq('brand_id', filters.brand_id).order('name');
      if (!active) return;
  if (error) { /* silencioso */ }
      else if (data) {
  setModelos([{ value: '', label: 'Modelo' }, ...data.map((m: any) => ({ value: m.id, label: m.name }))]);
      }
      setLoadingModelos(false);
    }
    fetchModelos();
    return () => { active = false; };
  }, [filters.brand_id, supabase]);

  // Fetch dinámico de regiones (IDs)
  useEffect(() => {
    let active = true;
    async function fetchRegiones() {
  setLoadingRegiones(true);
      const { data, error } = await supabase.from('regions').select('id, name').order('name');
      if (!active) return;
  if (error) { /* silencioso */ }
      else if (data) {
        setRegiones([{ value: '', label: 'Región' }, ...data.map((r:any)=>({ value: r.id, label: r.name }))]);
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

  // Ajustar type_id cuando types cargan o type_key cambia (tras hidratación)
  useEffect(() => {
    setFilters(f => ({ ...f, type_id: f.type_key ? (typeIdMap[f.type_key] || '' ) : '', brand_id: '', model_id: '' }));
  }, [typeIdMap, filters.type_key]);

  // handleChange eliminado (no se utiliza; Selects manejan sus propios onChange)

  // Adaptar envío: mapear valores UI español a inglés para backend
  const handleSubmit = () => {
    const url = buildSearchUrl({
      listing_kind: filters.listing_kind,
      type_key: filters.type_key,
      brand_id: filters.brand_id,
      model_id: filters.model_id,
      region_id: filters.region_id,
      commune_id: filters.commune_id,
      page: 1,
    });
    window.location.href = url;
  };

  return (
  <div className="relative w-full max-w-6xl mx-auto z-20">
      {showListType && (
        <div className="flex gap-2 mb-4 justify-center">
          {listTypes.map((type) => {
            const active = filters.listing_kind === type.value;
              return (
                  <Button
                    key={type.value}
                    size="sm"
                    shape="rounded"
                    variant={active ? 'primary' : 'neutral'}
                    className="min-w-[92px]"
                    type="button"
                    onClick={() => setFilters(f => ({ 
                      ...f, 
                      listing_kind: type.value,
                      // Limpiar filtros que podrían no ser relevantes para el nuevo tipo de listado
                      brand_id: '',
                      model_id: '',
                      region_id: '',
                      commune_id: ''
                    }))}
                  >
                    {type.label}
                  </Button>
            );
          })}
        </div>
      )}
  <form className="bg-white dark:bg-darkcard rounded-3xl shadow-xl px-2 py-2 md:py-4 w-full" onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
  <div className="grid grid-cols-1 md:grid-cols-6 gap-1 md:gap-2 w-full items-center grid-equal-cols">
          <Select
            value={filters.type_key}
            onChange={val => setFilters(f => ({ ...f, type_key: String(val), type_id: typeIdMap[String(val)] || '', brand_id: '', model_id: '' }))}
            options={vehicleTypes}
            placeholder={loadingTypes ? 'Cargando...' : 'Tipo'}
            shape="pill"
          />
          <Select
            value={filters.brand_id}
            onChange={val => setFilters(f => ({ ...f, brand_id: String(val), model_id: '' }))}
            options={marcas}
            placeholder={loadingMarcas ? 'Cargando...' : 'Marca'}
            shape="pill"
          />
          <Select
            value={filters.model_id}
            onChange={val => setFilters(f => ({ ...f, model_id: String(val) }))}
            options={modelos}
            placeholder={loadingModelos ? 'Cargando...' : (filters.brand_id ? 'Modelo' : 'Selecciona marca')}
            disabled={!filters.brand_id || loadingModelos}
            shape="pill"
          />
          <Select
            value={filters.region_id}
            onChange={val => setFilters(f => ({ ...f, region_id: String(val), commune_id: '' }))}
            options={regiones}
            placeholder={loadingRegiones ? 'Cargando...' : 'Región'}
            shape="pill"
          />
          <Select
            value={filters.commune_id}
            onChange={val => setFilters(f => ({ ...f, commune_id: String(val) }))}
            options={comunas}
            placeholder={loadingComunas ? 'Cargando...' : (filters.region_id ? 'Comuna' : 'Selecciona región')}
            disabled={!filters.region_id || loadingComunas}
            shape="pill"
          />
          {/* Espacio que antes ocupaba el rango de precio; se mantiene grid limpio */}
          <div className="flex gap-2 items-center justify-center">
            <Button className="w-full" shape="pill" type="submit">Buscar</Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SearchBox;
