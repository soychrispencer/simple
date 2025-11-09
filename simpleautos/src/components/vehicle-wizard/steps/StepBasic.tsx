"use client";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useWizard } from '../context/WizardContext';
import { validateStepData } from '../schemas';
import Input from '@/components/ui/form/Input';
import Select from '@/components/ui/form/Select';
import { Button } from '@/components/ui/Button';
import { getColorOptions, VEHICLE_COLOR_HEX } from '@/lib/colors';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

interface FieldError { [k: string]: string | undefined }

// Eliminamos clases locales en favor de componentes UI

export const StepBasic: React.FC = () => {
  const { state, patch, setStep } = useWizard();
  const [errors, setErrors] = useState<FieldError>({});
  const basic = state.basic;
  // listingType ya no se usa localmente tras mover precio al paso Condiciones
  const typeKey = state.vehicle.type_key;
  const typeId = state.vehicle.type_id;
  const lastTypeRef = useRef<string | null | undefined>(typeKey);
  const [brandOptions, setBrandOptions] = useState<{ label: string; value: string }[]>([{ label: 'Marca', value: '' }]);
  const [modelOptions, setModelOptions] = useState<{ label: string; value: string }[]>([{ label: 'Modelo', value: '' }]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const supabase = createPagesBrowserClient();
  // Eliminamos edición manual de título: ahora es siempre canónico
  const canonicalRef = useRef<string>('');

  // Kilometraje siempre (podría ajustarse por tipo)
  const showMileage = true;

  // Validar en tiempo real cuando cambian valores básicos
  useEffect(() => {
    const result = validateStepData('basic', basic);
    if (!result.ok) {
      setErrors(result.errors || {});
      patch('validity', { basic: false });
    } else {
      setErrors({});
      patch('validity', { basic: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basic.title, basic.year, basic.mileage, basic.estado, basic.region, basic.commune]);

  // Regiones / Comunas
  const [regions, setRegions] = useState<{ id:number; name:string; slug:string|null }[]>([]);
  const [communes, setCommunes] = useState<{ id:number; region_id:number; name:string; slug:string|null }[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingCommunes, setLoadingCommunes] = useState(false);

  // Cache local en módulo (evita tocar globalThis y reduce dependencias en efectos)
  // Estas variables se mantienen entre montajes mientras el bundle viva.
  // No usarán invalidación reactiva; sólo se consultan para primer llenado.
  // (Si se requiere invalidación futura se puede migrar a un contexto ligero.)
  // @note: se definen fuera del componente en patch incremental (acá inline para simplicidad).
  // Implementamos contenedores estáticos vía refs internas en vez de globalThis.
  const regionsCacheRef = useRef<{ id:number; name:string; slug:string|null }[] | null>(null);
  const communesCacheRef = useRef<Record<number, { id:number; region_id:number; name:string; slug:string|null }[]> | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      if (regionsCacheRef.current && regionsCacheRef.current.length) {
        setRegions(regionsCacheRef.current);
        return;
      }
      setLoadingRegions(true);
      const { data, error } = await supabase.from('regions').select('id,name,slug').order('id');
      if (!active) return;
      if (!error) {
        setRegions(data || []);
        regionsCacheRef.current = data || [];
      } else {
        setRegions([]);
      }
      setLoadingRegions(false);
    })();
    return () => { active = false; };
  }, [supabase]);

  useEffect(() => {
    let active = true;
    if (!basic.region) { setCommunes([]); return; }
    (async () => {
      const regionId = basic.region;
      if (!regionId) { setCommunes([]); return; }
      const cache = communesCacheRef.current || {};
      if (cache[regionId]) { setCommunes(cache[regionId]); return; }
      setLoadingCommunes(true);
      const { data, error } = await supabase.from('communes').select('id,region_id,name,slug').eq('region_id', regionId).order('id');
      if (!active) return;
      if (!error) {
        setCommunes(data || []);
        communesCacheRef.current = { ...cache, [regionId]: data || [] };
      } else {
        setCommunes([]);
      }
      setLoadingCommunes(false);
    })();
    return () => { active = false; };
  }, [basic.region, supabase]);

  // Reset de marca/modelo cuando cambia el tipo (para UX consistente)
  useEffect(() => {
    if (lastTypeRef.current !== typeKey) {
      // Solo reset si había algo seleccionado
      if (basic.brand_id || basic.model_id) {
        patch('basic', { brand_id: null, model_id: null } as any);
      }
      lastTypeRef.current = typeKey;
    }
  }, [typeKey, basic.brand_id, basic.model_id, patch]);

  // Cargar marcas filtradas por type_id real (si existe) usando select reducido (id,name)
  useEffect(() => {
    let active = true;
    async function loadBrands() {
      if (!typeKey) { setBrandOptions([{ label: 'Marca', value: '' }]); return; }
      setLoadingBrands(true);
      let query = supabase.from('brands').select('id,name,type_id');
      if (typeId) query = query.eq('type_id', typeId);
      const { data, error } = await query.order('name');
      if (!active) return;
      if (error) {
        setBrandOptions([{ label: 'Marca', value: '' }]);
      } else {
        const opts = (data || []).map((b: any) => ({ label: b.name, value: b.id }));
        setBrandOptions([{ label: 'Marca', value: '' }, ...opts]);
        // Si había brand_id guardada de hidratación y ya no pertenece, resetear
        if (basic.brand_id && !opts.some(o => o.value === basic.brand_id)) {
          patch('basic', { brand_id: null, model_id: null } as any);
        }
      }
      setLoadingBrands(false);
    }
    loadBrands();
    return () => { active = false; };
  }, [typeKey, typeId, supabase, basic.brand_id, patch]);

  // Cargar modelos cuando cambia brand_id
  useEffect(() => {
    let active = true;
    async function loadModels() {
      if (!basic.brand_id) { setModelOptions([{ label: 'Modelo', value: '' }]); return; }
      setLoadingModels(true);
      const { data, error } = await supabase.from('models').select('id,name,brand_id').eq('brand_id', basic.brand_id).order('name');
      if (!active) return;
      if (error) { setModelOptions([{ label: 'Modelo', value: '' }]); }
      else {
        const opts = data.map((m: any) => ({ label: m.name, value: m.id }));
        setModelOptions([{ label: 'Modelo', value: '' }, ...opts]);
      }
      setLoadingModels(false);
    }
    loadModels();
    return () => { active = false; };
  }, [basic.brand_id, supabase]);

  const update = (field: string, value: any) => {
    patch('basic', { [field]: value } as any);
  };

  const COLORS = getColorOptions(true);

  const buildCanonicalTitle = useCallback(() => {
    // Necesitamos labels de marca y modelo
    const brandLabel = basic.brand_id ? brandOptions.find(o => o.value === basic.brand_id)?.label : undefined;
    if (!brandLabel) return '';
    const modelLabel = basic.model_id ? modelOptions.find(o => o.value === basic.model_id)?.label : undefined;
    const parts: string[] = [brandLabel];
    if (modelLabel) parts.push(modelLabel);
  if (basic.year) parts.push(String(basic.year));
  if (basic.color && basic.color !== 'generic') parts.push(basic.color);
    return parts.join(' ');
  }, [basic.brand_id, basic.model_id, basic.year, basic.color, brandOptions, modelOptions]);

  // Recalcular título canónico cada vez que cambia un componente relevante
  // Debounce del título canónico para reducir parches en escritura rápida
  useEffect(() => {
    const next = buildCanonicalTitle();
    canonicalRef.current = next;
    if (!next || next === basic.title) return;
    const id = setTimeout(() => {
      patch('basic', { title: next } as any);
    }, 140); // ventana corta, perceptualmente instantánea
    return () => clearTimeout(id);
  }, [buildCanonicalTitle, basic.title, patch]);

  // (Lógica de autosugerencia eliminada: ahora es forzada mediante buildCanonicalTitle)

  const scrollToFirstError = (errs: FieldError) => {
    // Región y comuna ahora van al final del formulario así que las priorizamos al final
  const order = ['brand_id','model_id','year','mileage','estado','color','title','region','commune'];
    for (const key of order) {
      if (errs[key]) {
        const el = document.querySelector(`[name="${key}"]`) as HTMLElement | null;
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if ('focus' in el) setTimeout(() => el.focus(), 300);
        }
        break;
      }
    }
  };

  const handleContinue = () => {
    const parsed = validateStepData('basic', state.basic);
    if (!parsed.ok) { const errs = parsed.errors || {}; setErrors(errs); scrollToFirstError(errs); return; }
    setStep('specs');
  };

  return (
    <div className="w-full mx-auto max-w-5xl py-8 px-4 md:px-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-black dark:text-white">Datos básicos</h1>
        <p className="mt-3 text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Completa la información principal del vehículo. Podrás añadir detalles específicos en el siguiente paso.
        </p>
      </div>
      {/* Región y Comuna se movieron al final del formulario (requerimiento) */}

  <div className="grid md:grid-cols-3 gap-6">
        {/* Título autogenerado ocupa 2/3 y precio (si aplica) 1/3 */}
        <div className="md:col-span-2 flex flex-col">
          <label className="block text-sm font-medium mb-1 text-black dark:text-white">Título autogenerado</label>
          <div className="h-11 flex items-center rounded-full bg-lightcard dark:bg-darkcard border border-lightborder/30 dark:border-darkborder/20 px-4 text-sm font-medium text-gray-800 dark:text-gray-100 select-none">
            {basic.title || '—'}
          </div>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Construido con Marca + Modelo + Año + Color. Actualiza esos campos para cambiar este título.</p>
        </div>
        {/* Precio movido al paso Condiciones */}
        <div className="md:col-span-3">
          <label className="block text-sm font-medium mb-1 text-black dark:text-white">Descripción</label>
          <div className="relative">
            <textarea
              className="w-full rounded-2xl bg-lightcard dark:bg-darkcard border border-lightborder/30 dark:border-darkborder/20 px-4 py-3 text-sm transition min-h-[180px] leading-relaxed text-gray-800 dark:text-gray-100 placeholder:text-[var(--field-placeholder)] focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-black dark:focus-visible:ring-white"
              placeholder="Describe el estado general, mantenimiento, características destacadas, historial, etc."
              maxLength={2000}
              value={basic.description || ''}
              onChange={e => update('description', e.target.value)}
            />
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Máx 2000 caracteres.</p>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">{(basic.description?.length||0)}/2000</span>
          </div>
        </div>
        {/* Orden requerido: Marca, Modelo, Año, Color, Condición */}
        <div>
          <Select
            label="Marca"
            value={basic.brand_id || ''}
            onChange={(val) => { update('brand_id', val || null); update('model_id', null); }}
            options={brandOptions}
            placeholder={loadingBrands ? 'Cargando...' : 'Marca'}
            shape="pill"
          />
        </div>
        <div>
          <Select
            label="Modelo"
            value={basic.model_id || ''}
            onChange={(val) => update('model_id', val || null)}
            options={modelOptions}
            disabled={!basic.brand_id || loadingModels}
            placeholder={basic.brand_id ? (loadingModels ? 'Cargando...' : 'Modelo') : 'Selecciona marca'}
            shape="pill"
            error={errors.model_id}
          />
        </div>
        <div>
          <Input
            label="Año"
            type="number"
            value={basic.year ?? ''}
            onChange={e => update('year', e.target.value === '' ? null : Number(e.target.value))}
            placeholder="2020"
            error={errors.year}
            shape="pill"
          />
        </div>
        <div>
          <Select
            label="Color"
            value={basic.color || ''}
            onChange={(val) => update('color', val || null)}
            options={COLORS}
            shape="pill"
            colorHexMap={VEHICLE_COLOR_HEX}
          />
        </div>
        <div>
          <Select
            label="Condición del vehículo"
            value={basic.estado || ''}
            onChange={(val) => update('estado', val || null)}
            shape="pill"
            options={[
              { label: 'Seleccionar', value: '' },
              { label: 'Nuevo', value: 'nuevo' },
              { label: 'Seminuevo', value: 'seminuevo' },
              { label: 'Usado', value: 'usado' },
              { label: 'Restaurado', value: 'restored' },
              { label: 'Colección', value: 'collection' },
              { label: 'Siniestrado', value: 'accident' },
              { label: 'Para reparar', value: 'to-repair' },
            ]}
          />
        </div>
        {showMileage && (
          <div>
            <Input
              label="Kilometraje (km)"
              type="number"
              value={basic.mileage ?? ''}
              onChange={e => update('mileage', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="75000"
              error={errors.mileage}
              shape="pill"
            />
          </div>
        )}

        {/* Región / Comuna al final */}
        <div>
          <div className="relative">
            {loadingRegions && (
              <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-lightcard/60 via-lightcard/30 to-lightcard/60 dark:from-darkcard/60 dark:via-darkcard/30 dark:to-darkcard/60" />
            )}
            <Select
              label="Región *"
              value={basic.region ? String(basic.region) : ''}
              onChange={(val) => {
                const regionId = val ? Number(val) : null;
                const regionObj = regions.find(r => String(r.id) === String(val));
                patch('basic', { region: regionId, region_name: regionObj?.name || null, commune: null, commune_name: null } as any);
              }}
              options={[{ label: loadingRegions ? 'Cargando regiones...' : 'Seleccionar', value: '' }, ...regions.map(r => ({ label: r.name, value: String(r.id) }))] as any}
              shape="pill"
              disabled={loadingRegions}
              error={errors.region}
            />
          </div>
        </div>
        <div>
          <div className="relative">
            {loadingCommunes && basic.region && (
              <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-lightcard/60 via-lightcard/30 to-lightcard/60 dark:from-darkcard/60 dark:via-darkcard/30 dark:to-darkcard/60" />
            )}
            <Select
              label="Comuna *"
              value={basic.commune ? String(basic.commune) : ''}
              onChange={(val) => {
                const communeId = val ? Number(val) : null;
                const communeObj = communes.find(c => String(c.id) === String(val));
                patch('basic', { commune: communeId, commune_name: communeObj?.name || null } as any);
              }}
              options={[{ label: basic.region ? (loadingCommunes ? 'Cargando comunas...' : 'Seleccionar') : 'Primero región', value: '' }, ...communes.map(c => ({ label: c.name, value: String(c.id) }))] as any}
              disabled={!basic.region || loadingCommunes || communes.length === 0}
              shape="pill"
              error={errors.commune}
            />
          </div>
          {basic.region && !loadingCommunes && communes.length === 0 && (
            <span className="block mt-1 text-[11px] text-gray-500">Sin comunas para la región seleccionada.</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 mt-8 border-t border-lightborder/10 dark:border-darkborder/10">
        <Button variant="ghost" size="sm" onClick={() => setStep('type')}>Volver</Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleContinue}
          disabled={Object.keys(errors).length > 0 || !basic.title}
        >Continuar</Button>
      </div>
    </div>
  );
};

export default StepBasic;
