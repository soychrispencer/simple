"use client";
import React from "react";
import { loadVehicleWithSpecs } from '@/lib/loadVehicleWithSpecs';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { Button } from "@/components/ui/Button";
import PanelPageLayout from "@/components/panel/PanelPageLayout";
import { WizardProvider, useWizard } from "@/components/vehicle-wizard/context/WizardContext";
import { VehicleWizard } from "@/components/vehicle-wizard/VehicleWizard";
import FormStepper from "@/components/ui/form/FormStepper";

function buildStatuses(state: any) {
  const v = state.validity || {};
  const map: Record<string, 'pending' | 'complete' | 'error' | 'current'> = {};
  const keys = ['type','basic','specs','media','commercial','review'];
  keys.forEach(k => { map[k] = v[k as any] ? 'complete' : 'pending'; });
  return map;
}

function HeaderProgress() {
  const { state, setStep, validateStep } = useWizard();
  // Steps visibles (omitimos intent y publish en el stepper)
  const steps = React.useMemo(() => ([
    { key: 'type', label: 'Tipo' },
    { key: 'basic', label: 'Básicos' },
    { key: 'specs', label: 'Especificaciones' },
    { key: 'media', label: 'Imágenes' },
    { key: 'commercial', label: 'Condiciones' },
    { key: 'review', label: 'Revisión' },
  ]), []);
  return (
    <div className="w-full flex items-center justify-center py-1">
  {state.step !== 'intent' && (
        <div className="max-w-4xl w-full flex justify-center">
          <FormStepper
            steps={steps}
            current={state.step}
            statuses={buildStatuses(state)}
            clickable
            onSelect={(key) => {
              if (key === state.step) return;
              const order = steps.map(s => s.key);
              const targetIndex = order.indexOf(key);
              const currentIndex = order.indexOf(state.step as any);
              if (targetIndex === -1 || targetIndex > currentIndex) return;
              validateStep(key as any);
              setStep(key as any);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function NuevaPublicacion() {
  return (
    <WizardProvider>
      <Hydrator />
      <ActionsHeaderWrapper />
    </WizardProvider>
  );
}

// Lee ?id= en la URL para modo edición y carga datos remotos
function Hydrator() {
  const { patch, state } = useWizard();
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;
    // Evitar recargar si ya hidratamos
    if (state.vehicle_id === id) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createPagesBrowserClient();
        const { vehicle, specs, typeSlug, features } = await loadVehicleWithSpecs({ id });
        if (cancelled) return;
        
        // Cargar nombres de región y comuna si existen los IDs
        let regionName: string | null = null;
        let communeName: string | null = null;
        
        if (vehicle.region_id) {
          const { data: reg } = await supabase.from('regions').select('name').eq('id', vehicle.region_id).single();
          if (reg) regionName = reg.name;
        }
        
        if (vehicle.commune_id) {
          const { data: com } = await supabase.from('communes').select('name').eq('id', vehicle.commune_id).single();
          if (com) communeName = com.name;
        }
        
        // Basic
        patch('basic', {
          title: vehicle.title,
          description: vehicle.description || '',
          estado: vehicle.extra_specs?.estado || vehicle.condition || (vehicle as any).state || null,
          year: vehicle.year || null,
          mileage: (vehicle as any).mileage_km ?? (vehicle as any).mileage ?? null,
          brand_id: vehicle.brand_id || null,
          model_id: vehicle.model_id || null,
          color: vehicle.color || null,
          region: vehicle.region_id || null,
          commune: vehicle.commune_id || null,
          region_name: regionName,
          commune_name: communeName,
        } as any);
        
        // Vehicle (tipo y specs)
        patch('vehicle', { 
          type_key: typeSlug || vehicle.extra_specs?.type_key || vehicle.type_key, 
          type_id: vehicle.type_id, 
          specs,
          historial: vehicle.extra_specs?.historial || vehicle.extra_specs?.condition_tags || vehicle.extra_specs?.status_tags || [],
          features // ← Usar features del resultado de loadVehicleWithSpecs (desde tabla pivot)
        });
        
        // Media (imágenes y video)
        patch('media', { 
          images: (vehicle.image_urls || []).map((url: string, idx: number) => ({ 
            id: crypto.randomUUID(), 
            url, 
            main: idx === 0,
            remoteUrl: url // Marcar como ya subida
          })),
          video_url: vehicle.video_url || undefined
        });
        
        // Commercial (precios y condiciones)
        patch('commercial', {
          visibility: vehicle.visibility || 'normal',
          financing_available: !!vehicle.allow_financing,
          exchange_considered: !!vehicle.allow_exchange,
          price: vehicle.price || null,
          offer_price: vehicle.extra_specs?.offer_price || null,
          discount_type: vehicle.extra_specs?.discount_type || null,
          discount_valid_until: vehicle.extra_specs?.discount_valid_until || null,
          condiciones: vehicle.extra_specs?.condiciones || { flags: [], notas: vehicle.extra_specs?.conditions_notes || null },
          // Campos de arriendo
          rent_daily_price: (vehicle as any).rent_daily_price || undefined,
          rent_weekly_price: (vehicle as any).rent_weekly_price || undefined,
          rent_monthly_price: (vehicle as any).rent_monthly_price || undefined,
          rent_price_period: vehicle.extra_specs?.rent_price_period || (vehicle as any).rent_price_period || undefined,
          rent_security_deposit: (vehicle as any).rent_security_deposit || undefined,
          // Campos de subasta
          auction_start_price: (vehicle as any).auction_start_price || undefined,
          auction_start_at: (vehicle as any).auction_start_at || undefined,
          auction_end_at: (vehicle as any).auction_end_at || undefined,
        });
        
        // Tipo de publicación y ID
        patch('listing_type', vehicle.listing_type);
        patch('vehicle_id', id as any);
        
        // Status de publicación actual
        patch('publication_status', vehicle.status || 'draft');
      } catch (e) {
        console.error('[Hydrator] Error cargando vehículo', e);
      }
    })();
    return () => { cancelled = true; };
  }, [patch, state.vehicle_id]);
  return null;
}

function ActionsHeaderWrapper() {
  const wiz = useWizard();
  // warning antes de salir si no está completo
  React.useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      const progress = wiz.computeProgress();
  if (progress < 100) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [wiz]);
  return (
    <PanelPageLayout
      header={{
        title: "Publicar Vehículo",
        description: "Completa los pasos y publica tu anuncio.",
        actions: (
          <div className="flex items-center gap-5">
            <AutoSaveStatus iso={wiz.state.meta.last_auto_save} />
            <Button variant="neutral" size="sm" onClick={wiz.forceSave}>Guardar ahora</Button>
            <Button variant="neutral" size="sm" onClick={wiz.reset}>Reiniciar</Button>
          </div>
        ),
        children: <HeaderProgress />
      }}
    >
      <div className="bg-transparent p-0">
        <VehicleWizard />
      </div>
    </PanelPageLayout>
  );
}

function AutoSaveStatus({ iso }: { iso?: string | null }) {
  const [label, setLabel] = React.useState('Sin auto-guardado');
  React.useEffect(() => {
    function compute() {
      if (!iso) { setLabel('Sin auto-guardado'); return; }
      const diff = Date.now() - new Date(iso).getTime();
      if (diff < 0) { setLabel('Auto-guardado ahora'); return; }
      const sec = Math.floor(diff/1000);
      if (sec < 5) { setLabel('Auto-guardado ahora'); return; }
      if (sec < 60) { setLabel(`Auto-guardado hace ${sec}s`); return; }
      const min = Math.floor(sec/60);
      if (min < 60) { setLabel(`Auto-guardado hace ${min}m`); return; }
      const h = Math.floor(min/60);
      setLabel(`Auto-guardado hace ${h}h`);
    }
    compute();
    const id = setInterval(compute, 5000);
    return () => clearInterval(id);
  }, [iso]);
  return (
    <span className="inline-flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
      <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
      {label}
    </span>
  );
}
