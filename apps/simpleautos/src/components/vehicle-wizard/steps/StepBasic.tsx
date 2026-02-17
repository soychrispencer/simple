"use client";
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useWizard } from '../context/WizardContext';
import { validateStepData } from '../schemas';
import { Input, Select, Button } from '@simple/ui';
import { WizardStepLayout } from '../layout/WizardStepLayout';
import { ConfirmCancelModal } from '../components/ConfirmCancelModal';
import { getColorOptions, VEHICLE_COLOR_HEX } from '@/lib/colors';
import { useSupabase } from '@/lib/supabase/useSupabase';
import { upsertBrand, upsertModel } from '@/app/actions/catalog';
import { getSpecCategory } from '../specDescriptors';

type RegionRow = { id: string; name: string; code: string };
type CommuneRow = { id: string; region_id: string; name: string };

interface FieldError { [k: string]: string | undefined }

// Eliminamos clases locales en favor de componentes UI

export const StepBasic: React.FC = () => {
  const { state, patch, setStep } = useWizard();
  const router = useRouter();
  const [errors, setErrors] = useState<FieldError>({});
  const [cancelOpen, setCancelOpen] = useState(false);
  const basic = state.basic;
  // listingType ya no se usa localmente tras mover precio al paso Condiciones
  const typeKey = state.vehicle.type_key;
  const typeId = state.vehicle.type_id;
  const typeIds = state.vehicle.type_ids;
  const typeSignature = `${typeKey ?? ''}|${(typeIds || []).join(',')}`;
  const lastTypeRef = useRef<string>(typeSignature);
  const [brandOptions, setBrandOptions] = useState<{ label: string; value: string }[]>([{ label: 'Marca', value: '' }]);
  const [modelOptions, setModelOptions] = useState<{ label: string; value: string }[]>([{ label: 'Modelo', value: '' }]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  const [brandPending, setBrandPending] = useState(false);
  const [modelPending, setModelPending] = useState(false);
  const supabase = useSupabase();
  // Eliminamos edición manual de título: ahora es siempre canónico
  const canonicalRef = useRef<string>('');

  const [brandCreateOpen, setBrandCreateOpen] = useState(false);
  const [brandDraft, setBrandDraft] = useState('');
  const [brandCreateLoading, setBrandCreateLoading] = useState(false);
  const [brandCreateError, setBrandCreateError] = useState<string | null>(null);

  const [modelCreateOpen, setModelCreateOpen] = useState(false);
  const [modelDraft, setModelDraft] = useState('');
  const [modelCreateLoading, setModelCreateLoading] = useState(false);
  const [modelCreateError, setModelCreateError] = useState<string | null>(null);

  const normalizeForMatch = useCallback((raw: string) => {
    const cleaned = (raw || '').trim().replace(/\s+/g, ' ');
    return cleaned
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }, []);

  const getSuggestions = useCallback((query: string, options: { label: string; value: string }[]) => {
    const q = normalizeForMatch(query);
    if (!q || q.length < 2) return [] as { label: string; value: string }[];
    const ranked = options
      .filter(o => {
        const n = normalizeForMatch(o.label);
        return n.includes(q) || q.includes(n);
      })
      .map(o => {
        const n = normalizeForMatch(o.label);
        const score = Math.abs(n.length - q.length);
        return { o, score };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, 6)
      .map(x => x.o);
    return ranked;
  }, [normalizeForMatch]);

  // Kilometraje siempre (podría ajustarse por tipo)
  const showMileage = true;

  // Validar en tiempo real cuando cambian valores básicos
  useEffect(() => {
    const result = validateStepData('basic', basic);
    const extra: FieldError = {};
    const needsBodyType = getSpecCategory(typeKey || null)?.type_key === 'car';
    if (needsBodyType) {
      const bt = (state.vehicle.specs as any)?.body_type;
      if (!bt) extra.body_type = 'Carrocería requerida';
    }
    const merged = { ...(result.errors || {}), ...extra };
    const ok = result.ok && Object.keys(extra).length === 0;
    if (!ok) {
      setErrors(merged);
      patch('validity', { basic: false });
    } else {
      setErrors({});
      patch('validity', { basic: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basic.brand_id, basic.model_id, basic.year, basic.color, basic.mileage, basic.estado, basic.region, basic.commune, typeKey, (state.vehicle.specs as any)?.body_type]);

  // Regiones / Comunas
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [communes, setCommunes] = useState<CommuneRow[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingCommunes, setLoadingCommunes] = useState(false);

  const normalizeRegionKey = useCallback((raw: string) => {
    return (raw || '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }, []);

  const regionNorthToSouthOrder = useCallback((region: RegionRow) => {
    const rawCode = (region.code || '').trim().toUpperCase();
    const cleanedCode = rawCode
      .replace(/^CL[-_]?/i, '')
      .replace(/^REG(?:ION)?\s*/i, '')
      .replace(/^R/i, '')
      .replace(/[^0-9A-Z]/g, '');
    // Orden Chile (norte -> sur). Soporta códigos romanos y numéricos; RM/13 para Metropolitana.
    const orderMap: Record<string, number> = {
      'XV': 1,
      '15': 1,
      'I': 2,
      '1': 2,
      'II': 3,
      '2': 3,
      'III': 4,
      '3': 4,
      'IV': 5,
      '4': 5,
      'V': 6,
      '5': 6,
      'RM': 7,
      'METROPOLITANA': 7,
      '13': 7,
      'VI': 8,
      '6': 8,
      'VII': 9,
      '7': 9,
      'XVI': 10,
      '16': 10,
      'VIII': 11,
      '8': 11,
      'IX': 12,
      '9': 12,
      'XIV': 13,
      '14': 13,
      'X': 14,
      '10': 14,
      'XI': 15,
      '11': 15,
      'XII': 16,
      '12': 16,
    };
    const mapped = orderMap[cleanedCode] ?? orderMap[rawCode];
    if (mapped != null) return mapped;

    const numeric = Number.parseInt(cleanedCode, 10);
    if (Number.isFinite(numeric)) return numeric;

    // Fallback por nombre (cuando code no sirve)
    const name = normalizeRegionKey(region.name || '');
    const nameOrder: Array<[string, number]> = [
      ['arica', 1],
      ['parinacota', 1],
      ['tarapaca', 2],
      ['antofagasta', 3],
      ['atacama', 4],
      ['coquimbo', 5],
      ['valparaiso', 6],
      ['metropolitana', 7],
      ['santiago', 7],
      ['o\'higgins', 8],
      ['ohiggins', 8],
      ['libertador', 8],
      ['maule', 9],
      ['nuble', 10],
      ['biobio', 11],
      ['araucania', 12],
      ['los rios', 13],
      ['los lagos', 14],
      ['aysen', 15],
      ['magallanes', 16],
      ['antartica', 16],
    ];
    for (const [token, order] of nameOrder) {
      if (name.includes(token)) return order;
    }
    return 999;
  }, [normalizeRegionKey]);

  const sortRegionsNorthToSouth = useCallback((rows: RegionRow[]) => {
    return (rows || []).slice().sort((a, b) => {
      const ao = regionNorthToSouthOrder(a);
      const bo = regionNorthToSouthOrder(b);
      if (ao !== bo) return ao - bo;
      return String(a.name || '').localeCompare(String(b.name || ''), 'es');
    });
  }, [regionNorthToSouthOrder]);

  // Cache local en módulo (evita tocar globalThis y reduce dependencias en efectos)
  // Estas variables se mantienen entre montajes mientras el bundle viva.
  // No usarán invalidación reactiva; sólo se consultan para primer llenado.
  // (Si se requiere invalidación futura se puede migrar a un contexto ligero.)
  // @note: se definen fuera del componente en patch incremental (acá inline para simplicidad).
  // Implementamos contenedores estáticos vía refs internas en vez de globalThis.
  const regionsCacheRef = useRef<RegionRow[] | null>(null);
  const communesCacheRef = useRef<Record<string, CommuneRow[]>>({});
  useEffect(() => {
    let active = true;
    (async () => {
      if (regionsCacheRef.current && regionsCacheRef.current.length) {
        const ordered = sortRegionsNorthToSouth(regionsCacheRef.current);
        setRegions(ordered);
        regionsCacheRef.current = ordered;
        return;
      }
      setLoadingRegions(true);
      const { data, error } = await supabase.from('regions').select('id,name,code').order('name');
      if (!active) return;
      if (!error) {
        const ordered = sortRegionsNorthToSouth(data || []);
        setRegions(ordered);
        regionsCacheRef.current = ordered;
      } else {
        setRegions([]);
      }
      setLoadingRegions(false);
    })();
    return () => { active = false; };
  }, [supabase, sortRegionsNorthToSouth]);

  useEffect(() => {
    let active = true;
    if (!basic.region) { setCommunes([]); return; }
    (async () => {
      const regionId = basic.region;
      if (!regionId) { setCommunes([]); return; }
      const cache = communesCacheRef.current;
      if (cache[regionId]) { setCommunes(cache[regionId]); return; }
      setLoadingCommunes(true);
      const { data, error } = await supabase
        .from('communes')
        .select('id,region_id,name')
        .eq('region_id', regionId)
        .order('name');
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
    if (lastTypeRef.current !== typeSignature) {
      // Solo reset si había algo seleccionado
      if (basic.brand_id || basic.model_id || (basic as any).brand_name || (basic as any).model_name) {
        patch('basic', { brand_id: null, model_id: null, brand_name: null, model_name: null });
      }
      lastTypeRef.current = typeSignature;
    }
  }, [basic, patch, typeSignature]);

  // Cargar marcas filtradas por type_id real (si existe) usando modelos asociados
  useEffect(() => {
    let active = true;
    async function loadBrands() {
      if (!typeKey) { setBrandOptions([{ label: 'Marca', value: '' }]); return; }
      setLoadingBrands(true);
      let opts: { label: string; value: string }[] = [];
      const allowedTypeIds = (typeIds && typeIds.length) ? typeIds : (typeId ? [typeId] : null);
      if (allowedTypeIds) {
        const { data, error } = await supabase
          .from('models')
          .select('brand_id, brands!inner(id,name)')
          .eq('brands.is_verified', true)
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
          opts = Array.from(brandMap.entries())
            .sort((a, b) => a[1].localeCompare(b[1], 'es'))
            .map(([id, name]) => ({ label: name, value: id }));
        }
      } else {
        const { data, error } = await supabase.from('brands').select('id,name').eq('is_verified', true).order('name');
        if (!active) return;
        if (!error && data) {
          opts = data.map((b: any) => ({ label: b.name, value: b.id }));
        }
      }
      if (!active) return;
      if (!opts.length) {
        setBrandOptions([{ label: 'Marca', value: '' }]);
      } else {
        // Si hay una marca ya seleccionada pero no viene en el set (ej: recién creada), la preservamos.
        const selectedBrandId = basic.brand_id;
        const selectedBrandName = (basic as any).brand_name as string | null | undefined;
        const merged = [...opts];
        if (selectedBrandId && selectedBrandName && !merged.some(o => o.value === selectedBrandId)) {
          merged.unshift({ label: selectedBrandName, value: selectedBrandId });
        }
        setBrandOptions([{ label: 'Marca', value: '' }, ...merged]);
      }
      setLoadingBrands(false);
    }
    loadBrands();
    return () => { active = false; };
  }, [basic, supabase, typeId, typeIds, typeKey]);

  // Cargar modelos cuando cambia brand_id
  useEffect(() => {
    let active = true;
    async function loadModels() {
      if (!basic.brand_id) { setModelOptions([{ label: 'Modelo', value: '' }]); return; }
      setLoadingModels(true);
      let query = supabase
        .from('models')
        .select('id,name,brand_id')
        .eq('brand_id', basic.brand_id)
        .eq('is_verified', true)
        .order('name');
      const allowedTypeIds = (typeIds && typeIds.length) ? typeIds : (typeId ? [typeId] : null);
      if (allowedTypeIds) {
        query = query.in('vehicle_type_id', allowedTypeIds);
      }
      const { data, error } = await query;
      if (!active) return;
      if (error) { setModelOptions([{ label: 'Modelo', value: '' }]); }
      else {
        const opts = data.map((m: any) => ({ label: m.name, value: m.id }));
        // Preservar selección si el modelo recién se creó y aún no aparece.
        const selectedModelId = basic.model_id;
        const selectedModelName = (basic as any).model_name as string | null | undefined;
        const merged = [...opts];
        if (selectedModelId && selectedModelName && !merged.some(o => o.value === selectedModelId)) {
          merged.unshift({ label: selectedModelName, value: selectedModelId });
        }
        setModelOptions([{ label: 'Modelo', value: '' }, ...merged]);
      }
      setLoadingModels(false);
    }
    loadModels();
    return () => { active = false; };
  }, [basic, supabase, typeId, typeIds]);

  const update = (field: string, value: any) => {
    patch('basic', { [field]: value } as any);
  };

  const specs = useMemo(() => state.vehicle.specs || {}, [state.vehicle.specs]);
  const carBodyTypeOptions = useMemo(() => {
    const cat = getSpecCategory(typeKey || null);
    const field = cat?.fields?.find((f) => f.id === 'body_type');
    return field?.options || [];
  }, [typeKey]);

  const showBodyType = useMemo(() => {
    const cat = getSpecCategory(typeKey || null);
    return cat?.type_key === 'car';
  }, [typeKey]);

  const updateSpec = (id: string, value: any) => {
    patch('vehicle', { specs: { ...specs, [id]: value } });
  };

  const COLORS = getColorOptions(true).filter(o => o.value !== 'generic');

  const buildCanonicalTitle = useCallback(() => {
    // Título canónico: Marca + Modelo + (Carrocería) + Año + Color
    const brandLabel = (basic as any).brand_name || (basic.brand_id ? brandOptions.find(o => o.value === basic.brand_id)?.label : undefined);
    const modelLabel = (basic as any).model_name || (basic.model_id ? modelOptions.find(o => o.value === basic.model_id)?.label : undefined);
    const bodyTypeLabel = showBodyType
      ? carBodyTypeOptions.find((o) => o.value === (specs as any)?.body_type)?.label
      : undefined;
    const year = basic.year;
    const color = basic.color;
    if (!brandLabel || !modelLabel || year == null || !color || color === 'generic') return '';
    const parts = [brandLabel, modelLabel];
    if (bodyTypeLabel) parts.push(bodyTypeLabel);
    parts.push(String(year), color);
    return parts.join(' ');
  }, [basic, brandOptions, modelOptions, showBodyType, carBodyTypeOptions, specs]);

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
  const order = ['brand_id','model_id','body_type','year','color','estado','mileage','region','commune'];
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
    const errs: FieldError = { ...(parsed.errors || {}) };
    if (showBodyType && !(state.vehicle.specs as any)?.body_type) {
      errs.body_type = 'Carrocería requerida';
    }
    if (!parsed.ok || Object.keys(errs).length > 0) {
      setErrors(errs);
      scrollToFirstError(errs);
      return;
    }
    setStep('specs');
  };

  const requiredFilled = !!basic.brand_id
    && !!basic.model_id
    && (!showBodyType || !!(specs as any)?.body_type)
    && basic.year != null
    && !!basic.color
    && basic.color !== 'generic'
    && basic.estado != null
    && basic.mileage != null
    && !!basic.region
    && !!basic.commune;

  const brandSuggestions = useMemo(() => {
    const opts = brandOptions.filter(o => o.value);
    return getSuggestions(brandDraft, opts);
  }, [brandDraft, brandOptions, getSuggestions]);

  const modelSuggestions = useMemo(() => {
    const opts = modelOptions.filter(o => o.value);
    return getSuggestions(modelDraft, opts);
  }, [modelDraft, modelOptions, getSuggestions]);

  const handleCreateBrand = useCallback(async () => {
    setBrandCreateError(null);
    const cleaned = brandDraft.trim().replace(/\s+/g, ' ');
    if (cleaned.length < 2) {
      setBrandCreateError('Escribe una marca válida');
      return;
    }
    setBrandCreateLoading(true);
    const result = await upsertBrand({ name: cleaned });
    setBrandCreateLoading(false);
    if (!result.ok) {
      setBrandCreateError(result.error);
      return;
    }
    const created = result.data;
    setBrandPending(!created.is_verified);
    setModelPending(false);
    patch('basic', {
      brand_id: created.id,
      brand_name: created.name,
      model_id: null,
      model_name: null,
    });
    setBrandOptions(prev => {
      const existing = prev.filter(o => o.value);
      if (existing.some(o => o.value === created.id)) return prev;
      return [prev[0], { label: created.name, value: created.id }, ...existing];
    });
    setBrandDraft('');
    setBrandCreateOpen(false);
  }, [brandDraft, patch]);

  const handleCreateModel = useCallback(async () => {
    setModelCreateError(null);
    if (!basic.brand_id) {
      setModelCreateError('Selecciona o crea una marca primero');
      return;
    }
    if (!typeId) {
      setModelCreateError('No pudimos determinar el tipo de vehículo');
      return;
    }
    const cleaned = modelDraft.trim().replace(/\s+/g, ' ');
    if (cleaned.length < 1) {
      setModelCreateError('Escribe un modelo válido');
      return;
    }
    setModelCreateLoading(true);
    const result = await upsertModel({ brandId: basic.brand_id, vehicleTypeId: typeId, name: cleaned });
    setModelCreateLoading(false);
    if (!result.ok) {
      setModelCreateError(result.error);
      return;
    }
    const created = result.data;
    setModelPending(!created.is_verified);
    patch('basic', {
      model_id: created.id,
      model_name: created.name,
    });
    setModelOptions(prev => {
      const existing = prev.filter(o => o.value);
      if (existing.some(o => o.value === created.id)) return prev;
      return [prev[0], { label: created.name, value: created.id }, ...existing];
    });
    setModelDraft('');
    setModelCreateOpen(false);
  }, [basic.brand_id, modelDraft, patch, typeId]);

  return (
    <WizardStepLayout
      title="Datos básicos"
      description="Completa la información principal del vehículo. Podrás añadir detalles específicos en el siguiente paso."
      summary={(() => {
        const parts: string[] = [];
        const brandLabel = basic.brand_id ? brandOptions.find(o => o.value === basic.brand_id)?.label : null;
        const modelLabel = basic.model_id ? modelOptions.find(o => o.value === basic.model_id)?.label : null;
        if (brandLabel) parts.push(`Marca: ${brandLabel}`);
        if (modelLabel) parts.push(`Modelo: ${modelLabel}`);
        if (basic.year) parts.push(`Año: ${basic.year}`);
        if (basic.mileage != null) parts.push(`${basic.mileage.toLocaleString('es-CL')} km`);
        if ((basic as any).commune_name && (basic as any).region_name) parts.push(`Ubicación: ${(basic as any).commune_name}, ${(basic as any).region_name}`);
        if (parts.length === 0) return 'Completa marca, modelo, carrocería, año, color, condición y kilometraje.';
        return parts.join(' · ');
      })()}
      footer={(
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep('type')}>Volver</Button>
            <Button variant="ghost" size="sm" onClick={() => setCancelOpen(true)}>Cancelar</Button>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={handleContinue}
            disabled={!requiredFilled || Object.keys(errors).length > 0}
          >Continuar</Button>
        </div>
      )}
    >
      <ConfirmCancelModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => {
          router.push('/panel/mis-publicaciones');
        }}
      />
      {/* Región y Comuna se movieron al final del formulario (requerimiento) */}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Título autogenerado ocupa 2/3 y precio (si aplica) 1/3 */}
        <div className="md:col-span-2 flex flex-col">
          <label className="block text-sm font-medium mb-1 text-lighttext dark:text-darktext">Título autogenerado</label>
          <div className="h-11 flex items-center rounded-full card-surface shadow-card px-4 text-sm font-medium text-lighttext dark:text-darktext select-none">
            {basic.title || 'Título se generará automáticamente'}
          </div>
          <p className="mt-1 text-[11px] text-lighttext/70 dark:text-darktext/70">Construido con Marca + Modelo + (Carrocería) + Año + Color. Actualiza esos campos para cambiar este título.</p>
        </div>
        {/* Precio movido al paso Condiciones */}
        <div className="md:col-span-3">
          <label className="block text-sm font-medium mb-1 text-lighttext dark:text-darktext">Descripción</label>
          <div className="relative">
            <textarea
              className="w-full rounded-2xl card-surface shadow-card px-4 py-3 text-sm transition min-h-[180px] leading-relaxed text-lighttext dark:text-darktext placeholder:text-[var(--field-placeholder)] focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-[color:var(--color-primary-a40)]"
              placeholder="Describe el estado general, mantenimiento, características destacadas, historial, etc."
              maxLength={2000}
              value={basic.description || ''}
              onChange={e => update('description', e.target.value)}
            />
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-[11px] text-lighttext/70 dark:text-darktext/70">Máx 2000 caracteres.</p>
            <span className="text-[11px] text-lighttext/70 dark:text-darktext/70">{(basic.description?.length||0)}/2000</span>
          </div>
        </div>
        {/* Orden requerido: Marca, Modelo, Año, Color, Condición */}
        <div>
          <Select
            label="Marca"
            value={basic.brand_id || ''}
            onChange={(val) => {
              const nextBrandId = val ? String(val) : null;
              const nextBrandName = nextBrandId ? (brandOptions.find(o => o.value === nextBrandId)?.label ?? null) : null;
              patch('basic', { brand_id: nextBrandId, brand_name: nextBrandName, model_id: null, model_name: null });
              setBrandPending(false);
              setModelPending(false);
              setModelCreateOpen(false);
              setModelDraft('');
              setModelCreateError(null);
            }}
            options={brandOptions}
            placeholder={loadingBrands ? 'Cargando...' : 'Marca'}
            shape="pill"
            error={errors.brand_id}
          />

          {!brandCreateOpen ? (
            <div className="mt-2">
              <button
                type="button"
                className="text-[11px] underline text-lighttext/70 dark:text-darktext/70"
                onClick={() => {
                  setBrandCreateOpen(true);
                  setBrandCreateError(null);
                }}
              >
                No encuentro mi marca
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <Input
                label="Agregar marca (sin verificar)"
                value={brandDraft}
                onChange={e => setBrandDraft(e.target.value)}
                placeholder="Ej: Toyota"
                shape="pill"
                error={brandCreateError || undefined}
              />

              {brandSuggestions.length > 0 && (
                <div className="mt-2 text-[11px] text-lighttext/70 dark:text-darktext/70">
                  Sugerencias:
                  <div className="mt-1 flex flex-wrap gap-2">
                    {brandSuggestions.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        className="underline"
                        onClick={() => {
                          patch('basic', { brand_id: s.value, brand_name: s.label, model_id: null, model_name: null });
                          setBrandCreateOpen(false);
                          setBrandDraft('');
                          setBrandCreateError(null);
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBrandCreateOpen(false);
                    setBrandDraft('');
                    setBrandCreateError(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleCreateBrand}
                  disabled={brandCreateLoading}
                >
                  {brandCreateLoading ? 'Creando...' : 'Crear marca'}
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-lighttext/70 dark:text-darktext/70">
                Revisa la ortografía: quedará como no verificada.
              </p>
            </div>
          )}

          {brandPending ? (
            <p className="mt-2 text-[11px] text-lighttext/70 dark:text-darktext/70">
              Marca pendiente de aprobación. Cuando el admin la apruebe, aparecerá en el listado para todos.
            </p>
          ) : null}
        </div>
        <div>
          <Select
            label="Modelo"
            value={basic.model_id || ''}
            onChange={(val) => {
              const nextModelId = val ? String(val) : null;
              const nextModelName = nextModelId ? (modelOptions.find(o => o.value === nextModelId)?.label ?? null) : null;
              patch('basic', { model_id: nextModelId, model_name: nextModelName });
              setModelPending(false);
            }}
            options={modelOptions}
            disabled={!basic.brand_id || loadingModels}
            placeholder={basic.brand_id ? (loadingModels ? 'Cargando...' : 'Modelo') : 'Selecciona marca'}
            shape="pill"
            error={errors.model_id}
          />

          {basic.brand_id && !modelCreateOpen ? (
            <div className="mt-2">
              <button
                type="button"
                className="text-[11px] underline text-lighttext/70 dark:text-darktext/70"
                onClick={() => {
                  setModelCreateOpen(true);
                  setModelCreateError(null);
                }}
              >
                No encuentro mi modelo
              </button>
            </div>
          ) : null}

          {basic.brand_id && modelCreateOpen ? (
            <div className="mt-3">
              <Input
                label="Agregar modelo (sin verificar)"
                value={modelDraft}
                onChange={e => setModelDraft(e.target.value)}
                placeholder="Ej: Corolla"
                shape="pill"
                error={modelCreateError || undefined}
              />

              {modelSuggestions.length > 0 && (
                <div className="mt-2 text-[11px] text-lighttext/70 dark:text-darktext/70">
                  Sugerencias:
                  <div className="mt-1 flex flex-wrap gap-2">
                    {modelSuggestions.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        className="underline"
                        onClick={() => {
                          patch('basic', { model_id: s.value, model_name: s.label });
                          setModelCreateOpen(false);
                          setModelDraft('');
                          setModelCreateError(null);
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setModelCreateOpen(false);
                    setModelDraft('');
                    setModelCreateError(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleCreateModel}
                  disabled={modelCreateLoading}
                >
                  {modelCreateLoading ? 'Creando...' : 'Crear modelo'}
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-lighttext/70 dark:text-darktext/70">
                Revisa la ortografía: quedará como no verificado.
              </p>
            </div>
          ) : null}

          {modelPending ? (
            <p className="mt-2 text-[11px] text-lighttext/70 dark:text-darktext/70">
              Modelo pendiente de aprobación. Cuando el admin lo apruebe, aparecerá en el listado para todos.
            </p>
          ) : null}
        </div>
        {showBodyType ? (
          <div>
            <Select
              label="Carrocería"
              value={specs.body_type ?? ''}
              onChange={(val) => updateSpec('body_type', val || undefined)}
              options={[{ label: 'Seleccionar', value: '' }, ...carBodyTypeOptions] as any}
              shape="pill"
              size="md"
              error={errors.body_type}
            />
          </div>
        ) : null}
        <div>
          <Select
            label="Año"
            value={basic.year == null ? '' : String(basic.year)}
            onChange={(val) => {
              const raw = val ? String(val) : '';
              if (!raw) return update('year', null);
              const parsed = Number.parseInt(raw, 10);
              update('year', Number.isFinite(parsed) ? parsed : null);
            }}
            options={(() => {
              const currentYear = new Date().getFullYear();
              const maxYear = currentYear + 1;
              const minYear = 1900;
              const years: { label: string; value: string }[] = [];
              for (let y = maxYear; y >= minYear; y--) years.push({ label: String(y), value: String(y) });
              return [{ label: 'Seleccionar', value: '' }, ...years];
            })()}
            shape="pill"
            error={errors.year}
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
            error={errors.color}
          />
        </div>
        <div>
          <Select
            label="Condición"
            value={basic.estado || ''}
            onChange={(val) => update('estado', val || null)}
            shape="pill"
            options={[
              { label: 'Seleccionar', value: '' },
              { label: 'Nuevo', value: 'nuevo' },
              { label: 'Seminuevo', value: 'seminuevo' },
              { label: 'Usado', value: 'usado' },
              { label: 'Restaurado', value: 'restored' },
              { label: 'Siniestrado', value: 'accident' },
              { label: 'Desarme', value: 'to-repair' },
            ]}
            error={errors.estado}
          />
        </div>
        {showMileage && (
          <div>
            <Input
              label="Kilometraje (km)"
              type="number"
              value={basic.mileage ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') return update('mileage', null);
                const next = Number(raw);
                if (!Number.isFinite(next)) return update('mileage', null);
                update('mileage', Math.max(0, Math.trunc(next)));
              }}
              onKeyDown={(e) => {
                // Evitar notación científica y signos
                if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-' || e.key === '.') {
                  e.preventDefault();
                }
              }}
              onWheel={(e) => {
                // Evita que el scroll cambie el número accidentalmente
                (e.target as HTMLInputElement).blur();
              }}
              placeholder="75000"
              inputMode="numeric"
              min={0}
              step={1000}
              hint="Usa solo números. Ej: 75000"
              error={errors.mileage}
              shape="pill"
              rightIcon={<span className="text-xs">km</span>}
            />
          </div>
        )}

        {/* Región / Comuna al final */}
        <div>
          <div className="relative">
            {loadingRegions && (
              <div className="absolute inset-0 animate-pulse rounded-full bg-lightcard/60 dark:bg-darkcard/60" />
            )}
            <Select
              label="Región"
              value={basic.region ?? ''}
              onChange={(val) => {
                const regionId = val ? String(val) : null;
                const regionObj = regions.find(r => String(r.id) === regionId);
                patch('basic', {
                  region: regionId,
                  region_name: regionObj?.name ?? null,
                  commune: null,
                  commune_name: null,
                });
              }}
              options={[{ label: loadingRegions ? 'Cargando regiones...' : 'Seleccionar', value: '' }, ...regions.map(r => ({ label: r.name, value: r.id }))] as any}
              shape="pill"
              disabled={loadingRegions}
              error={errors.region}
            />
          </div>
        </div>
        <div>
          <div className="relative">
            {loadingCommunes && basic.region && (
              <div className="absolute inset-0 animate-pulse rounded-full bg-lightcard/60 dark:bg-darkcard/60" />
            )}
            <Select
              label="Comuna"
              value={basic.commune ?? ''}
              onChange={(val) => {
                const communeId = val ? String(val) : null;
                const communeObj = communes.find(c => String(c.id) === communeId);
                patch('basic', { commune: communeId, commune_name: communeObj?.name ?? null });
              }}
              options={[{ label: basic.region ? (loadingCommunes ? 'Cargando comunas...' : 'Seleccionar') : 'Primero región', value: '' }, ...communes.map(c => ({ label: c.name, value: c.id }))] as any}
              disabled={!basic.region || loadingCommunes || communes.length === 0}
              shape="pill"
              error={errors.commune}
            />
          </div>
          {basic.region && !loadingCommunes && communes.length === 0 && (
            <span className="block mt-1 text-[11px] text-lighttext/70 dark:text-darktext/70">Sin comunas para la región seleccionada.</span>
          )}
        </div>
      </div>
    </WizardStepLayout>
  );
};

export default StepBasic;







