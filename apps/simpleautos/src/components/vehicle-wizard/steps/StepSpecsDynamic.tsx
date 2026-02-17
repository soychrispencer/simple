"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWizard } from '../context/WizardContext';
import { getSpecCategory, resolveSpecKey, validateSpecsWithRules } from '../specDescriptors';
import { saveVehicleSpecs, saveVehicleFeatures } from '@/lib/saveVehicleSpecs';
import { Button, Input, Select } from '@simple/ui';
import { WizardStepLayout } from '../layout/WizardStepLayout';
import { logWarn } from '@/lib/logger';
import { scrollToFirstInvalidField } from '../lib/scrollToFirstInvalid';
import { ConfirmCancelModal } from '../components/ConfirmCancelModal';

interface ErrorMap { [k: string]: string | undefined }

// inputBase y labelBase eliminados (no usados tras migración a componentes)
// Catálogo ahora se carga dinámicamente desde features_catalog (véase useFeaturesCatalog)
import { useFeaturesCatalog } from '../hooks/useFeaturesCatalog';
import { CONDITION_TAGS } from '@/lib/conditionTags';
import { HistorialVehiculoTag } from '@/types/vehicle';

export const StepSpecsDynamic: React.FC = () => {
  const { state, patch, setStep } = useWizard();
  const router = useRouter();
  const [errors, setErrors] = useState<ErrorMap>({});
  const [cancelOpen, setCancelOpen] = useState(false);
  const [showAllEquipment, setShowAllEquipment] = useState(false);
  const rawType = state.vehicle.type_key;
  const cat = getSpecCategory(rawType ? resolveSpecKey(rawType) : rawType);
  const specs = state.vehicle.specs || {};
  const featureSet = useMemo(() => (state.vehicle.features || []) as string[], [state.vehicle.features]);
  const historialTags = useMemo(() => (state.vehicle.historial || []) as string[], [state.vehicle.historial]);
  const bodyType = cat?.type_key === 'car' ? ((specs as any)?.body_type ?? null) : null;
  const { features, loading: featuresLoading, error: featuresError } = useFeaturesCatalog({ typeSlug: rawType || null, bodyType });

  const featureLabelByCode = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const f of features) {
      map.set(f.code, f.label);
    }
    return map;
  }, [features]);

  const selectedFeatureLabels = React.useMemo(() => {
    return (featureSet || []).map((c) => featureLabelByCode.get(c) || c);
  }, [featureSet, featureLabelByCode]);

  const featureGroups = React.useMemo(() => {
    const map = new Map<string, typeof features>();
    for (const f of features) {
      const key = (f.category || 'General').trim() || 'General';
      const existing = map.get(key);
      if (existing) {
        existing.push(f);
      } else {
        map.set(key, [f]);
      }
    }
    return Array.from(map.entries());
  }, [features]);

  const suggestedFeatures = React.useMemo(() => {
    // “Populares”: priorizar un set fijo de códigos comunes para que el primer vistazo
    // siempre tenga opciones esperables (sin depender del sort_order del seed).
    const popularCodes = [
      // Seguridad / asistencia
      'abs',
      'esc',
      'airbags_front',
      'reverse_camera',
      // Confort
      'ac',
      'power_windows',
      // Multimedia
      'bluetooth',
      'usb',
      // Extras frecuentes (si hay espacio)
      'parking_sensors_rear',
      'apple_carplay',
      'android_auto',
    ];

    const byCode = new Map(features.map((f) => [f.code, f] as const));

    const picked: typeof features = [];
    const pickedCodes = new Set<string>();

    for (const code of popularCodes) {
      const found = byCode.get(code);
      if (found && !pickedCodes.has(found.code)) {
        picked.push(found);
        pickedCodes.add(found.code);
      }
      if (picked.length >= 8) break;
    }

    if (picked.length < 8) {
      for (const f of features) {
        if (pickedCodes.has(f.code)) continue;
        picked.push(f);
        if (picked.length >= 8) break;
      }
    }

    return picked;
  }, [features]);

  useEffect(() => {
    // Validación en tiempo real usando el schema del tipo (más reglas cross-field)
    if (!cat) {
      setErrors({});
      patch('validity', { specs: true });
      return;
    }
    const baseErrors: ErrorMap = {};
    const parsed = cat.schema.safeParse(specs);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        if (issue.path?.length) {
          baseErrors[String(issue.path[0])] = issue.message;
        }
      }
    }
    const cross = validateSpecsWithRules(rawType || null, specs);
    if (!cross.ok) {
      Object.assign(baseErrors, cross.errors);
    }
    setErrors(baseErrors);
    patch('validity', { specs: Object.keys(baseErrors).length === 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specs, rawType]);

  if (!cat) {
    if (state.vehicle.type_key) {
      return (
        <WizardStepLayout
          title="Especificaciones"
          description="Aún no hay campos técnicos configurados para este tipo de vehículo. Puedes continuar."
          footer={(
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Button type="button" variant="ghost" size="sm" onClick={() => setStep('basic')}>Volver</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCancelOpen(true)}>Cancelar</Button>
              </div>
              <Button type="button" variant="primary" size="md" onClick={() => setStep('media')}>Continuar</Button>
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
          <div className="flex flex-col gap-3 text-sm text-lighttext dark:text-darktext">
            <p>Este tipo aún no tiene formularios específicos. Guardaremos la información básica y podrás seguir con multimedia.</p>
          </div>
        </WizardStepLayout>
      );
    }
    return (
      <WizardStepLayout
        title="Selecciona un tipo de vehículo"
        description="Necesitamos la categoría para mostrarte los campos técnicos adecuados."
        align="center"
        footer={(
          <div className="flex items-center justify-between gap-4 flex-wrap w-full">
            <Button type="button" variant="ghost" size="sm" onClick={() => setCancelOpen(true)}>Cancelar</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep('type')}>Ir a selección de tipo</Button>
          </div>
        )}
        showFooterDivider={false}
      >
        <ConfirmCancelModal
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          onConfirm={() => {
            router.push('/panel/mis-publicaciones');
          }}
        />
        <p className="text-sm text-lighttext dark:text-darktext text-center">Vuelve un paso para elegir el tipo de vehículo.</p>
      </WizardStepLayout>
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
        requestAnimationFrame(() => scrollToFirstInvalidField());
        return;
      }
      // Si ya existe vehicle_id en algún future patch podríamos persistir specs incrementalmente.
      // (Por ahora asumimos que la creación ocurre más adelante en review, así que sólo avanzamos.)
      if ((state as any).vehicle_id) {
        try {
          await saveVehicleSpecs({ vehicleId: (state as any).vehicle_id, typeSlug: rawType || '', specs });
          await saveVehicleFeatures((state as any).vehicle_id, featureSet);
        } catch (e) {
          logWarn('[StepSpecsDynamic] Error guardando specs intermedias', { error: (e as any)?.message || e });
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
      requestAnimationFrame(() => scrollToFirstInvalidField());
      return;
    }
  };

  return (
    <WizardStepLayout
      title="Especificaciones"
      description="Completa los campos técnicos para mejorar la calidad de tu publicación. Los opcionales ayudan al posicionamiento."
      summary={`Completado: ${Object.entries(specs).filter(([,v]) => v !== undefined && v !== null && v !== '').length} campo(s) · Equipamiento: ${featureSet.length} · Etiquetas: ${historialTags.length}`}
      footer={(
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep('basic')}>Volver</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setCancelOpen(true)}>Cancelar</Button>
          </div>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleContinue}
            disabled={Object.keys(errors).length > 0}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cat.fields.filter((f) => !(cat.type_key === 'car' && f.id === 'body_type')).map(f => {
          const err = errors[f.id];
          // En autos queremos 3 por fila siempre salvo casos especiales
          // Garantía ocupa 2 columnas
          const colSpanClass = '';
          if (f.type === 'number') {
            const min = typeof f.min === 'number' ? f.min : 0;
            const isMeters = f.id.endsWith('_m');
            const step = typeof (f as any).step === 'number' ? (f as any).step : (isMeters ? 0.1 : 1);
            const unitSuffix = f.unit ? <span className="text-xs">{f.unit}</span> : undefined;
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
                    const finalValue = step === 1 ? Math.trunc(n) : n;
                    update(f.id, finalValue);
                  }}
                  onKeyDown={(e) => {
                    // Evitar notación científica en números (UX)
                    if (e.key === 'e' || e.key === 'E' || e.key === '+') {
                      e.preventDefault();
                    }
                    // Evitar negativos si el mínimo es >= 0
                    if (e.key === '-' && min >= 0) {
                      e.preventDefault();
                    }
                  }}
                  placeholder={f.placeholder || (f.unit ? `0 ${f.unit}` : '0')}
                  step={step}
                  error={err}
                  shape="pill"
                  fieldSize="md"
                  rightIcon={unitSuffix}
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
                <span className="text-sm font-medium text-lighttext dark:text-darktext">{f.label}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => update(f.id, !specs[f.id])}
                    aria-pressed={!!specs[f.id]}
                    className={`h-10 px-5 text-xs font-medium rounded-full border transition focus:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--color-primary-a40)] ${specs[f.id] ? 'bg-primary text-[var(--color-on-primary)] border-primary' : 'bg-[var(--field-bg)] border-[var(--field-border)] hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)] text-[var(--field-text)]'}`}
                  >{specs[f.id] ? 'Sí' : 'No'}</button>
                </div>
                {err && <span className="text-[11px] text-[var(--color-danger)]">{err}</span>}
              </div>
            );
          }
          // text
            return (
              <div key={f.id} className={colSpanClass}>
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
            <h3 className="text-sm font-semibold text-lighttext dark:text-darktext uppercase tracking-wide">Equipamiento</h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-lighttext/70 dark:text-darktext/70">Opcional</span>
              {featureSet.length > 0 && (
                <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-[var(--color-primary-a10)] text-primary border border-[var(--color-primary-a30)]">
                  {featureSet.length} seleccionado{featureSet.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>

          {/* Vista simple (por defecto): solo lo seleccionado */}
          {featureSet.length > 0 && !showAllEquipment && (
            <div className="flex flex-wrap gap-2">
              {selectedFeatureLabels.map((label, idx) => (
                <span
                  key={label + String(idx)}
                  className="text-[11px] px-2 py-1 rounded-full bg-[var(--field-bg)] border border-[var(--field-border)] text-[var(--field-text)]"
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Sugeridas (por defecto): algunas opciones visibles para evitar percepción de “hay que escribir” */}
          {!featuresLoading && !featuresError && suggestedFeatures.length > 0 && !showAllEquipment && featureSet.length === 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-semibold text-lighttext/70 dark:text-darktext/70 uppercase tracking-wide">
                Sugeridas
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {suggestedFeatures.map((feature) => {
                  const active = featureSet.includes(feature.code);
                  return (
                    <button
                      key={feature.code}
                      type="button"
                      onClick={() => toggleFeature(feature.code)}
                      aria-pressed={active}
                      className={`text-xs px-3 py-2 rounded-md border transition text-left flex items-center gap-2 ${active ? 'bg-primary text-[var(--color-on-primary)] border-primary shadow-sm' : 'bg-[var(--field-bg)] border-[var(--field-border)] hover:border-[var(--color-primary-a50)] hover:bg-[var(--color-primary-a05)] text-[var(--field-text)]'}`}
                    >
                      <span className="inline-block w-2 h-2 rounded-full bg-current opacity-70" />
                      {feature.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[11px] text-lighttext/70 dark:text-darktext/70">
              {featuresLoading
                ? 'Cargando catálogo…'
                : featuresError
                ? 'Catálogo no disponible'
                : `${features.length} opción(es) disponibles`}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAllEquipment((v) => !v)}
              disabled={featuresLoading || !!featuresError || features.length === 0}
            >
              {showAllEquipment ? 'Ocultar opciones' : (featureSet.length > 0 ? 'Editar equipamiento' : 'Ver todo el equipamiento')}
            </Button>
          </div>

          {featuresLoading && (
            <div className="text-[11px] text-lighttext/70 dark:text-darktext/70 animate-pulse">Cargando equipamiento...</div>
          )}
          {featuresError && !featuresLoading && (
            <div className="text-[11px] text-[var(--color-danger)]">Error cargando equipamiento: {featuresError}</div>
          )}
          {!featuresLoading && !featuresError && features.length === 0 && (
            <div className="text-[11px] text-lighttext/70 dark:text-darktext/70">No hay equipamiento disponible para este tipo.</div>
          )}
          {!featuresLoading && !featuresError && features.length > 0 && showAllEquipment && (
            <div className="flex flex-col gap-4">
              {featureGroups.map(([category, items]) => (
                <div key={category} className="flex flex-col gap-2">
                  <div className="text-[11px] font-semibold text-lighttext/70 dark:text-darktext/70 uppercase tracking-wide">
                    {category}
                  </div>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {items.map((feature) => {
                      const active = featureSet.includes(feature.code);
                      return (
                        <button
                          key={feature.code}
                          type="button"
                          onClick={() => toggleFeature(feature.code)}
                          aria-pressed={active}
                          className={`text-xs px-3 py-2 rounded-md border transition text-left flex items-center gap-2 ${active ? 'bg-primary text-[var(--color-on-primary)] border-primary shadow-sm' : 'bg-[var(--field-bg)] border-[var(--field-border)] hover:border-[var(--color-primary-a50)] hover:bg-[var(--color-primary-a05)] text-[var(--field-text)]'}`}
                        >
                          <span className="inline-block w-2 h-2 rounded-full bg-current opacity-70" />
                          {feature.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

  {/* Etiquetas del vehículo */}
        <div className="md:col-span-3 flex flex-col gap-3 border border-dashed border-lightborder/30 dark:border-darkborder/20 rounded-lg p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-lighttext dark:text-darktext uppercase tracking-wide">Etiquetas del vehículo</h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-lighttext/70 dark:text-darktext/70">Para categorizar y destacar tu publicación</span>
              {historialTags.length > 0 && (
                <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-[var(--color-primary-a10)] text-primary border border-[var(--color-primary-a30)]">
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
                  className={`text-xs px-3 py-2 rounded-md border transition text-left flex items-center gap-2 ${active ? 'bg-primary text-[var(--color-on-primary)] border-primary shadow-sm' : 'bg-[var(--field-bg)] border-[var(--field-border)] hover:border-[var(--color-primary-a50)] hover:bg-[var(--color-primary-a05)] text-[var(--field-text)]'}`}
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-current opacity-70" />
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </WizardStepLayout>
  );
};

export default StepSpecsDynamic;







