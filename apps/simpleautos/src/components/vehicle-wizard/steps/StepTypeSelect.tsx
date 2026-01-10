"use client";
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWizard } from '../context/WizardContext';
import { validateStepData } from '../schemas';
import { useVehicleTypes } from '../hooks/useVehicleTypes';
import { WizardStepLayout } from '../layout/WizardStepLayout';
import { resolveSpecKey } from '../specDescriptors';
import { logDebug } from '@/lib/logger';
import { Button } from '@simple/ui';
import { ConfirmCancelModal } from '../components/ConfirmCancelModal';
import type { BaseVehicleCategoryKey } from '@/lib/vehicleCategoryOptions';
import { buildVehicleCategoryOptions } from '@/lib/vehicleCategoryOptions';
import {
  IconCar,
  IconMotorbike,
  IconTruck,
  IconBus,
  IconBuildingFactory,
  IconShip,
  IconPlane,
} from '@tabler/icons-react';

const normalizeSlug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const iconForSlug = (slug: string, label: string) => {
  const cleaned = normalizeSlug(slug || label || '');
  const resolved = cleaned ? resolveSpecKey(cleaned) : 'car';

  // Canonicalizar keys legacy/derivadas
  let key: BaseVehicleCategoryKey = 'car';
  if (resolved === 'bus') key = 'bus';
  else if (resolved === 'motorcycle') key = 'motorcycle';
  else if (resolved === 'truck') key = 'truck';
  else if (resolved === 'aerial') key = 'aerial';
  else if (resolved === 'nautical') key = 'nautical';
  else if (resolved === 'industrial' || resolved === 'machinery') key = 'machinery';
  else key = 'car';

  const iconProps = { size: 40, stroke: 1.5 } as const;

  switch (key) {
    case 'car':
      return <IconCar {...iconProps} aria-hidden="true" className="-mb-0.5" />;
    case 'bus':
      return <IconBus {...iconProps} aria-hidden="true" />;
    case 'motorcycle':
      return <IconMotorbike {...iconProps} aria-hidden="true" />;
    case 'truck':
      return <IconTruck {...iconProps} aria-hidden="true" />;
    case 'machinery':
      return <IconBuildingFactory {...iconProps} aria-hidden="true" />;
    case 'nautical':
      return <IconShip {...iconProps} aria-hidden="true" />;
    case 'aerial':
      return <IconPlane {...iconProps} aria-hidden="true" />;
    default:
      return (
        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      );
  }
};

export const StepTypeSelect: React.FC = () => {
  const { state, patch, setStep } = useWizard();
  const { vehicleTypes, loading, error } = useVehicleTypes();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const selected = state.vehicle.type_key;
  const [localSelection, setLocalSelection] = useState<string | null>(selected);

  const router = useRouter();
  const sameTypeKey = useCallback((a: string | null | undefined, b: string | null | undefined) => {
    if (!a || !b) return false;
    return resolveSpecKey(normalizeSlug(a)) === resolveSpecKey(normalizeSlug(b));
  }, []);

  useEffect(() => {
    setLocalSelection(selected);
  }, [selected]);

  const summaries = React.useMemo<Record<string, string>>(() => ({
    car: 'SUV, Pickup, Sedán, Hatchback…',
    bus: 'Microbús, Minibús, Pasajeros…',
    motorcycle: 'Urbanas, Deportivas, Enduro…',
    truck: 'Livianos y pesados, carga…',
    machinery: 'Excavadora, Tractor, Retro…',
    nautical: 'Lancha, Velero, Yate…',
    aerial: 'Avión, Helicóptero, Drone…',
  }), []);
  const buildDescription = React.useCallback((slugRaw: string, label: string): string => {
    const slug = resolveSpecKey(normalizeSlug(slugRaw));
    if (summaries[slug]) return summaries[slug];
    // heurística: si contiene ciertas palabras clave
    if (/motor|moto/.test(slug)) return summaries['motorcycle'];
    if (/truck|camion/.test(slug)) return summaries['truck'];
    if (/bus/.test(slug)) return summaries['bus'];
    if (/industrial|maquin|machin/.test(slug)) return summaries['machinery'];
    if (/naut|boat|lancha|velero|yate|jet\b|jetski|moto-agua/.test(slug)) return summaries['nautical'];
    if (/aer|avion|helic|drone|dron/.test(slug)) return summaries['aerial'];
    if (/car|auto|coche|vehiculo/.test(slug)) return summaries['car'];
    // fallback amigable basado en label (sin palabra "Ejemplos")
    return label.includes(' ') ? label : `Variedades ${label}`;
  }, [summaries]);

  const options = useMemo(() => {
    const categoryOptions = buildVehicleCategoryOptions(
      (vehicleTypes || []).map((v) => ({
        id: v.id,
        slug: String(v.slug || ''),
        name: v.label,
        category: v.category ?? null,
        sort_order: v.sort_order,
      }))
    );

    return categoryOptions.map((o) => ({
      key: o.key,
      label: o.label,
      description: o.description || buildDescription(o.key, o.label),
      icon: iconForSlug(o.key, o.label),
      ids: o.ids,
    }));
  }, [vehicleTypes, buildDescription]);

  const selectedOption = useMemo(() => {
    if (!selected) return null;
    return options.find((o) => sameTypeKey(o.key, selected)) || null;
  }, [options, sameTypeKey, selected]);

  const selectedLabel = useMemo(() => {
    if (!selected) return null;
    return options.find(o => sameTypeKey(o.key, selected))?.label || selected;
  }, [selected, options, sameTypeKey]);

  // Log temporal para verificar slugs que llegan (solo cuando cambia el catálogo)
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      logDebug('[StepTypeSelect] slugs tipos', { slugs: vehicleTypes.map(v => v.slug) });
    }
  }, [vehicleTypes]);

  useEffect(() => {
    let active = true;
    const runValidation = async () => {
      await Promise.resolve();
      if (!active) return;
      if (loading) {
        patch('validity', { type: false });
        return;
      }

      if (!touched && !selected) {
        patch('validity', { type: false });
        return;
      }

      if (selected && !selectedOption) {
        setErrors({ type_key: 'Selecciona un tipo válido' });
        patch('validity', { type: false });
        return;
      }

      const result = validateStepData('type', { type_key: selected });
      if (!result.ok) {
        setErrors(result.errors || {});
        patch('validity', { type: false });
      } else {
        setErrors({});
        patch('validity', { type: true });
      }
    };
    runValidation();
    return () => {
      active = false;
    };
  }, [selected, selectedOption, touched, patch, loading]);

  const choose = useCallback((key: string) => {
    if (!touched) setTouched(true);
    setLocalSelection(key);
    const opt = options.find(o => o.key === key);
    patch('vehicle', {
      type_key: key,
      type_id: opt?.ids?.[0] || null,
      type_ids: (opt?.ids && opt.ids.length ? opt.ids : null),
    });
  }, [options, patch, touched]);

  const handleContinue = () => {
    if (!selectedOption) {
      setErrors({ type_key: 'Selecciona un tipo válido' });
      patch('validity', { type: false });
      return;
    }
    const res = validateStepData('type', { type_key: selected });
    if (!res.ok) {
      setErrors(res.errors || {});
      return;
    }
    setStep('basic');
  };

  // Navegación con flechas estilo radiogrupo
  const keys = options.map(o => o.key);
  const arrowNavigate = (current: string, dir: 1 | -1) => {
    const idx = keys.indexOf(current);
    const next = keys[(idx + dir + keys.length) % keys.length];
    choose(next);
  };

  return (
    <WizardStepLayout
      title="¿Qué tipo de vehículo es?"
      description="Selecciona la categoría para ajustar campos específicos del siguiente paso."
      summary={selectedLabel ? `Seleccionado: ${selectedLabel}` : 'Selecciona un tipo para continuar.'}
      align="center"
      footer={(
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStep('intent')}
            >Volver</Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCancelOpen(true)}
            >Cancelar</Button>
          </div>
          <Button
            type="button"
            onClick={handleContinue}
            disabled={!selectedOption}
            variant="primary"
            size="md"
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
      <div className="flex flex-col gap-4">
        <div
          className="grid gap-6 md:grid-cols-3"
          role="radiogroup"
          aria-label="Tipo de vehículo"
        >
          {loading && <div className="text-sm text-lighttext/70 dark:text-darktext/70 col-span-3">Cargando tipos...</div>}
          {error && <div className="text-sm text-[var(--color-danger)] col-span-3">Error: {error}</div>}
          {!loading && !error && options.length === 0 && <div className="text-sm text-lighttext/70 dark:text-darktext/70 col-span-3">No hay tipos activos.</div>}
          {options.map((opt, idx) => {
            const current = (localSelection || selected);
            const active = sameTypeKey(opt.key, current);
            return (
              <button
                type="button"
                key={opt.key}
                className={`intent-card-base animate-fade-up-soft ${active ? 'intent-card-base-selected' : ''}`}
                style={{ animationDelay: `${idx * 40}ms` }}
                role="radio"
                aria-checked={active}
                onClick={() => choose(opt.key)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); arrowNavigate(opt.key, 1); }
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); arrowNavigate(opt.key, -1); }
                }}
              >
                <div className={`intent-card-base-icon ${active ? 'animate-pop-in' : ''}`}>{opt.icon}</div>
                <h2 className="intent-card-base-title">{opt.label}</h2>
                {opt.description && (
                  <p className="intent-card-base-desc flex-1">{opt.description}</p>
                )}
                {active && <div className="intent-card-base-check" aria-hidden="true">✓</div>}
              </button>
            );
          })}
        </div>
        {touched && errors.type_key && <div className="text-[11px] text-[var(--color-danger)] text-center">{errors.type_key}</div>}
      </div>
    </WizardStepLayout>
  );
};

export default StepTypeSelect;







