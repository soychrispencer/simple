"use client";
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useWizard } from '../context/WizardContext';
import { validateStepData } from '../schemas';
import { useVehicleTypes } from '../hooks/useVehicleTypes';
import { Button } from '@/components/ui/Button';
import {
  IconCar,
  IconMotorbike,
  IconTruck,
  IconBus,
  IconBuildingWarehouse,
  IconBuildingFactory,
  IconBuildingStore,
} from '@tabler/icons-react';

// Icon mapping usando Tabler; fallback genérico minimalista
const iconForSlug = (slug: string) => {
  const s = slug.toLowerCase();
  if (['car','auto','autos','coche','vehiculo-liviano','vehiculo_liviano'].includes(s)) {
    return <IconCar size={42} stroke={1.6} aria-hidden="true" className="-mb-0.5" />;
  }
  switch (s) {
    case 'motorcycle': return <IconMotorbike size={40} stroke={1.5} aria-hidden="true" />;
    case 'truck': return <IconTruck size={40} stroke={1.5} aria-hidden="true" />; // camión / carga
    case 'van': return <IconBus size={40} stroke={1.5} aria-hidden="true" />; // furgón / pasajeros
    case 'suv': return <IconBuildingWarehouse size={40} stroke={1.5} aria-hidden="true" />; // placeholder SUV
    case 'bus': return <IconBus size={40} stroke={1.5} aria-hidden="true" />;
    case 'commercial': return <IconBuildingStore size={40} stroke={1.5} aria-hidden="true" />; // uso comercial
    case 'industrial': return <IconBuildingFactory size={40} stroke={1.5} aria-hidden="true" />; // uso industrial/pesado
    default: return (
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
  const selected = state.vehicle.type_key;

  const summaries = React.useMemo<Record<string, string>>(() => ({
    car: 'Sedán, SUV, Station Wagon...',
    motorcycle: 'Urbanas, Deportivas, Touring...',    
    truck: 'Camión ligero, Carga media...',      
    bus: 'Microbús, Minibús, Pasajeros...',    
    commercial: 'Pickup, Furgón, Utilitario...',
    industrial: 'Camión pesado, Maquinaria ligera...',
  }), []);
  const normalizeSlug = (s: string) => s.trim().toLowerCase().replace(/[_\s]+/g,'-');

  const buildDescription = React.useCallback((slugRaw: string, label: string): string => {
    const slug = normalizeSlug(slugRaw);
    if (summaries[slug]) return summaries[slug];
    // heurística: si contiene ciertas palabras clave
    if (/motor|moto/.test(slug)) return summaries['motorcycle'];
    if (/truck|camion/.test(slug)) return summaries['truck'];
    if (/van|furg/.test(slug)) return summaries['van'];
    if (/bus/.test(slug)) return summaries['bus'];
    if (/suv/.test(slug)) return summaries['suv'];
    if (/industrial|maquin/.test(slug)) return summaries['industrial'];
    if (/comercial|commercial/.test(slug)) return summaries['commercial'];
    if (/car|auto|coche|vehiculo/.test(slug)) return summaries['car'];
    // fallback amigable basado en label (sin palabra "Ejemplos")
    return label.includes(' ') ? label : `Variedades ${label}`;
  }, [summaries]);

  const options = useMemo(() => vehicleTypes.map(v => ({
    key: v.slug,
    label: v.label,
    description: buildDescription(v.slug, v.label),
    icon: iconForSlug(v.slug),
    id: v.id,
  })), [vehicleTypes, buildDescription]);

  // Log temporal para verificar slugs que llegan (eliminar luego)
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.debug('[StepTypeSelect] slugs tipos:', vehicleTypes.map(v => v.slug));
  }

  useEffect(() => {
    // No validar hasta que el usuario haya interactuado (touched) o haya un valor.
    if (!touched && !selected) {
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
  }, [selected, touched, patch]);

  const choose = useCallback((key: string) => {
    if (!touched) setTouched(true);
    const opt = options.find(o => o.key === key);
    // Guardamos el slug tal cual para backend (type_id) pero para specs usaremos resolución en StepSpecsDynamic.
    patch('vehicle', { type_key: key, type_id: opt?.id || null });
  }, [options, patch, touched]);

  const handleContinue = () => {
    const res = validateStepData('type', { type_key: selected });
    if (!res.ok) { setErrors(res.errors || {}); return; }
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
    <div className="w-full mx-auto max-w-5xl py-8 px-4 md:px-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-black dark:text-white">
          ¿Qué tipo de vehículo es?
        </h1>
        <p className="mt-3 text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Selecciona la categoría para ajustar campos específicos del siguiente paso.
        </p>
      </div>
      <div
        className="grid gap-6 md:grid-cols-3"
        role="radiogroup"
        aria-label="Tipo de vehículo"
      >
        {loading && <div className="text-sm text-gray-500 col-span-3">Cargando tipos...</div>}
        {error && <div className="text-sm text-red-500 col-span-3">Error: {error}</div>}
        {!loading && !error && options.length === 0 && <div className="text-sm text-gray-500 col-span-3">No hay tipos activos.</div>}
        {options.map((opt, idx) => {
          const active = selected === opt.key;
          return (
            <div
              key={opt.key}
              className={`intent-card-base animate-fade-up-soft ${active ? 'intent-card-base-selected' : ''}`}
              style={{ animationDelay: `${idx * 40}ms` }}
              tabIndex={0}
              role="radio"
              aria-checked={active}
              onClick={() => choose(opt.key)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(opt.key); }
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); arrowNavigate(opt.key, 1); }
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); arrowNavigate(opt.key, -1); }
              }}
            >
              <div className={`intent-card-base-icon ${active ? 'animate-pop-in' : ''}`}>{opt.icon}</div>
              <h2 className="intent-card-base-title">{opt.label}</h2>
              {opt.description && (
                <p className="intent-card-base-desc flex-1">{opt.description}</p>
              )}
              {active && <div className="intent-card-base-check" aria-hidden="true">✔</div>}
            </div>
          );
        })}
      </div>
  {touched && errors.type_key && <div className="mt-4 text-[11px] text-red-500 text-center">{errors.type_key}</div>}
  <div className="flex items-center justify-between pt-2 border-t border-lightborder/10 dark:border-darkborder/10 mt-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStep('intent')}
        >Volver</Button>
        <Button
          type="button"
          onClick={handleContinue}
          disabled={!selected}
          variant="primary"
          size="md"
        >Continuar</Button>
      </div>
    </div>
  );
};

export default StepTypeSelect;
