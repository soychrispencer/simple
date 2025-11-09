"use client";
import React, { useEffect, useState } from 'react';
import { useWizard } from '../context/WizardContext';
import { getSpecCategory, resolveSpecKey, validateSpecsWithRules } from '../specDescriptors';
import { saveVehicleSpecs, saveVehicleFeatures } from '@/lib/saveVehicleSpecs';
import { validateStepData } from '../schemas';
import Input from '@/components/ui/form/Input';
import Select from '@/components/ui/form/Select';

interface ErrorMap { [k: string]: string | undefined }

// inputBase y labelBase eliminados (no usados tras migración a componentes)

// Catálogo ahora se carga dinámicamente desde features_catalog (véase useFeaturesCatalog)
import { useFeaturesCatalog } from '../hooks/useFeaturesCatalog';
import { CONDITION_TAGS } from '@/lib/conditionTags';
import { HistorialVehiculoTag } from '@/types/vehicle';

export const StepSpecsDynamic: React.FC = () => {
  const { state, patch, setStep } = useWizard();
  const [errors, setErrors] = useState<ErrorMap>({});
  const rawType = state.vehicle.type_key;
  const cat = getSpecCategory(rawType ? resolveSpecKey(rawType) : rawType);
  const specs = state.vehicle.specs || {};
  const featureSet: string[] = (state.vehicle.features || []);
  const historialTags: string[] = (state.vehicle.historial || []);
  const { features, loading: featuresLoading, error: featuresError } = useFeaturesCatalog({ typeSlug: rawType || null });

  useEffect(() => {
    // 1. Validación base (tipos / requeridos simples)
    const result = validateStepData('specs', specs);
    let baseErrors: ErrorMap = result.ok ? {} : (result.errors || {});
    // 2. Validación cross-field según tipo
    const cross = validateSpecsWithRules(rawType || null, specs);
    if (!cross.ok) {
      baseErrors = { ...baseErrors, ...cross.errors };
    }
    setErrors(baseErrors);
    patch('validity', { specs: Object.keys(baseErrors).length === 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(specs), rawType]);

  if (!cat) {
    // Si no hay categoría pero sí existe type_key, significa que aún no definimos descriptors para ese tipo.
    if (state.vehicle.type_key) {
      return (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-lighttext dark:text-darktext">Especificaciones</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Aún no hay campos técnicos configurados para este tipo de vehículo. Puedes continuar.</p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-lightborder/10 dark:border-darkborder/10">
            <button
              type="button"
              onClick={() => setStep('basic')}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary"
            >Volver</button>
            <button
              type="button"
              onClick={() => setStep('media')}
              className="px-5 py-2.5 rounded-md text-sm font-semibold transition shadow-card bg-primary text-white hover:shadow-card-hover"
            >Continuar</button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Selecciona primero un tipo de vehículo.</p>
        <button
          className="text-xs text-primary hover:underline w-max"
          onClick={() => setStep('type')}
        >Ir a selección de tipo</button>
      </div>
    );
  }

  const update = (id: string, value: any) => {
    patch('vehicle', { specs: { ...specs, [id]: value } });
  };

  const toggleFeature = (code: string) => {
    const exists = featureSet.includes(code);
    const next = exists ? featureSet.filter(c => c !== code) : [...featureSet, code];
    patch('vehicle', { features: next });
  };

  const toggleConditionTag = (code: string) => {
    const exists = historialTags.includes(code);
    const next = exists ? historialTags.filter(c => c !== code) : [...historialTags, code];
  patch('vehicle', { historial: next as HistorialVehiculoTag[] });
  };

  // Catálogo simple inicial de etiquetas de historial (antes: condition tags) se puede externalizar luego
  // CONDITION_TAGS importado desde librería compartida

  const handleContinue = async () => {
    // Podríamos aplicar validación específica con cat.schema.parse
    try {
      cat.schema.parse(specs); // valida unidad
      const cross = validateSpecsWithRules(rawType || null, specs);
      if (!cross.ok) {
        setErrors(cross.errors);
        return;
      }
  // Si ya existe vehicle_id en algún future patch podríamos persistir specs incrementalmente.
  // (Por ahora asumimos que la creación ocurre más adelante en review, así que sólo avanzamos.)
      if ((state as any).vehicle_id) {
        try {
          await saveVehicleSpecs({ vehicleId: (state as any).vehicle_id, typeSlug: rawType || '', specs });
          await saveVehicleFeatures((state as any).vehicle_id, featureSet);
        } catch (e) {
          console.warn('[StepSpecsDynamic] Error guardando specs intermedias', e);
        }
      }
  setStep('media');
    } catch (e:any) {
      const errs: ErrorMap = {};
      if (e.issues) {
        for (const issue of e.issues) {
          if (issue.path?.length) errs[String(issue.path[0])] = issue.message;
        }
      }
      setErrors(errs);
      return;
    }
  };

  return (
    <div className="w-full mx-auto max-w-5xl py-8 px-4 md:px-6 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-black dark:text-white">Especificaciones</h2>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 max-w-2xl">Completa los campos técnicos para mejorar la calidad de tu publicación. Campos opcionales ayudan al posicionamiento.</p>
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        {cat.fields.map(f => {
          const err = errors[f.id];
          const isCar = cat.type_key === 'car';
          // En autos queremos 3 por fila siempre salvo casos especiales
          // Garantía ocupa 2 columnas
          const colSpanClass = isCar ? (f.id === 'warranty' ? 'md:col-span-2' : '') : '';
          if (f.type === 'number') {
            return (
              <div key={f.id} className={colSpanClass}>
                <Input
                  type="number"
                  label={f.label + (f.required ? ' *' : '')}
                  value={specs[f.id] ?? ''}
                  onChange={e => {
                    const raw = (e.target as HTMLInputElement).value;
                    if (raw === '') return update(f.id, undefined);
                    const n = Number(raw);
                    if (Number.isNaN(n)) return; // ignorar entrada temporal inválida
                    update(f.id, n);
                  }}
                  placeholder={f.placeholder || (f.unit ? `0 ${f.unit}` : '0')}
                  error={err}
                  shape="pill"
                  fieldSize="md"
                />
              </div>
            );
          }
          if (f.type === 'select') {
            return (
              <div key={f.id} className={colSpanClass}>
                <Select
                  label={f.label + (f.required ? ' *' : '')}
                  value={specs[f.id] ?? ''}
                  onChange={val => update(f.id, val || undefined)}
                  options={[{ label: 'Seleccionar', value: '' }, ...(f.options || [])] as any}
                  error={err}
                  shape="pill"
                  size="md"
                />
              </div>
            );
          }
          if (f.type === 'boolean') {
            return (
              <div key={f.id} className={"flex flex-col gap-2 " + colSpanClass}>
                <span className="text-sm font-medium text-black dark:text-white">{f.label}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => update(f.id, !specs[f.id])}
                    className={`h-10 px-5 text-xs font-medium rounded-full border transition focus:outline-none focus-visible:ring-1 focus-visible:ring-black dark:focus-visible:ring-white ${specs[f.id] ? 'bg-primary text-white border-primary' : 'bg-[var(--field-bg)] border-[var(--field-border)] hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)] text-[var(--field-text)]'}`}
                  >{specs[f.id] ? 'Sí' : 'No'}</button>
                </div>
                {err && <span className="text-[11px] text-red-500">{err}</span>}
              </div>
            );
          }
          // text
            return (
              <div key={f.id} className={isCar ? colSpanClass : 'md:col-span-3'}>
                <Input
                  type="text"
                  label={f.label + (f.required ? ' *' : '')}
                  value={specs[f.id] ?? ''}
                  onChange={e => update(f.id, (e.target as HTMLInputElement).value || undefined)}
                  placeholder={f.placeholder || ''}
                  error={err}
                  shape="pill"
                  fieldSize="md"
                />
              </div>
            );
        })}

        {/* Bloque equipamiento (features pivot) */}
        <div className="md:col-span-3 flex flex-col gap-3 border border-dashed border-lightborder/30 dark:border-darkborder/20 rounded-lg p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-black dark:text-white uppercase tracking-wide">Equipamiento</h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Opcional</span>
              {featureSet.length > 0 && (
                <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/30">
                  {featureSet.length} seleccionado{featureSet.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>
          {featuresLoading && (
            <div className="text-[11px] text-gray-500 animate-pulse">Cargando equipamiento...</div>
          )}
          {featuresError && !featuresLoading && (
            <div className="text-[11px] text-red-500">Error cargando equipamiento: {featuresError}</div>
          )}
          {!featuresLoading && !featuresError && features.length === 0 && (
            <div className="text-[11px] text-gray-500">No hay equipamiento disponible para este tipo.</div>
          )}
          {!featuresLoading && !featuresError && features.length > 0 && (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {features.map(feature => {
                const active = featureSet.includes(feature.code);
                return (
                  <button
                    key={feature.code}
                    type="button"
                    onClick={() => toggleFeature(feature.code)}
                    className={`text-xs px-3 py-2 rounded-md border transition text-left flex items-center gap-2 ${active ? 'bg-primary text-white border-primary shadow-sm' : 'bg-[var(--field-bg)] border-[var(--field-border)] hover:border-primary/50 hover:bg-primary/5 text-[var(--field-text)]'}`}
                  >
                    <span className="inline-block w-2 h-2 rounded-full bg-current opacity-70" />
                    {feature.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

  {/* Historial del Vehículo (etiquetas verificables) */}
        <div className="md:col-span-3 flex flex-col gap-3 border border-dashed border-lightborder/30 dark:border-darkborder/20 rounded-lg p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-black dark:text-white uppercase tracking-wide">Historial del vehículo</h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Hechos verificables (doc, uso, procedencia)</span>
              {historialTags.length > 0 && (
                <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/30">
                  {historialTags.length} seleccionado{historialTags.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {CONDITION_TAGS.map(tag => {
              const active = historialTags.includes(tag.code);
              return (
                <button
                  key={tag.code}
                  type="button"
                  onClick={() => toggleConditionTag(tag.code)}
                  aria-pressed={active}
                  className={`text-xs px-3 py-2 rounded-md border transition text-left flex items-center gap-2 ${active ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-[var(--field-bg)] border-[var(--field-border)] hover:border-emerald-500/60 hover:bg-emerald-500/5 text-[var(--field-text)]'}`}
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-current opacity-70" />
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-lightborder/10 dark:border-darkborder/10">
        <button
          type="button"
          onClick={() => setStep('type')}
          className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary"
        >Volver</button>
        <button
          type="button"
          onClick={handleContinue}
          className="h-10 px-6 rounded-full text-sm font-semibold bg-primary text-white shadow-card hover:shadow-card-hover focus:outline-none focus-visible:ring-1 focus-visible:ring-black dark:focus-visible:ring-white"
        >Continuar</button>
      </div>
    </div>
  );
};

export default StepSpecsDynamic;
