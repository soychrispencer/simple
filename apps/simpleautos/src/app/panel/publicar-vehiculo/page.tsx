"use client";
import React from "react";
import { loadVehicleWithSpecs } from '@/lib/loadVehicleWithSpecs';
import { PanelPageLayout, useToast } from "@simple/ui";
import { WizardProvider, useWizard } from "@/components/vehicle-wizard/context/WizardContext";
import { VehicleWizard } from "@/components/vehicle-wizard/VehicleWizard";
import { logError } from "@/lib/logger";
import { useSearchParams } from 'next/navigation';
import { getSupabaseClient } from "@/lib/supabase/supabase";

export default function NuevaPublicacion() {
  return <WizardWithStorageKey />;
}

function WizardWithStorageKey() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const forceNew = !id && searchParams.get('new') === '1';
  // Aislamos el borrador por publicación cuando es edición, para no mezclar progreso
  // entre distintos IDs.
  const storageKey = id
    ? `vwizard:draft:v1:edit:${id}`
    : forceNew
    ? 'vwizard:draft:v1:new'
    : 'vwizard:draft:v1';
  return (
    <WizardProvider key={storageKey} storageKey={storageKey}>
      {forceNew && <ForceNewDraft />}
      <Hydrator />
      <ActionsHeaderWrapper />
    </WizardProvider>
  );
}

function ForceNewDraft() {
  const { reset, setStep } = useWizard();
  const ranRef = React.useRef(false);

  React.useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    // Limpiamos el borrador por defecto para evitar que reaparezca al entrar sin ?new=1.
    try { localStorage.removeItem('vwizard:draft:v1'); } catch { /* silent */ }

    // Reseteamos el wizard actual (storageKey actual) y partimos desde intent.
    reset();
    setStep('intent');

    // Quitamos el query param para que refrescar no borre el progreso.
    try {
      window.history.replaceState({}, '', '/panel/publicar-vehiculo');
    } catch { /* silent */ }
  }, [reset, setStep]);

  return null;
}

// Lee ?id= en la URL para modo edición y carga datos remotos
function Hydrator() {
  const { patch, setStep, state } = useWizard();
  const { addToast } = useToast();
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;
    // Si ya existe un draft de esta misma publicación (edición), igual forzamos
    // partir desde el paso 0 (Intención) y reseteamos el progreso visual.
    if (state.vehicle_id === id) {
      const looksHydrated =
        !!state.listing_type ||
        !!state.vehicle?.type_key ||
        !!state.basic?.brand_id ||
        !!state.basic?.model_id ||
        !!state.basic?.title ||
        (state.media?.images?.length ?? 0) > 0;

      // Si el draft local ya tiene data, solo reseteamos el progreso visual.
      if (looksHydrated) {
        patch('validity', {
          intent: true,
          type: false,
          basic: false,
          specs: false,
          media: false,
          commercial: false,
        } as any);
        setStep('intent');
        return;
      }
      // Si el draft local está vacío/corrupto, seguimos y recargamos desde remoto.
    }
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const loaded = await loadVehicleWithSpecs({ id });
        if (!loaded) {
          addToast('No se pudo cargar la publicación para editar.', { type: 'error' });
          return;
        }
        const { vehicle, specs, typeSlug, features } = loaded;
        if (cancelled) return;

        const toNumberOrNull = (value: unknown): number | null => {
          if (value == null) return null;
          if (typeof value === 'number') return Number.isFinite(value) ? value : null;
          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) return null;
            const num = Number(trimmed);
            return Number.isFinite(num) ? num : null;
          }
          return null;
        };

        const normalizeVisibility = (value: unknown): 'featured' | 'normal' | 'hidden' => {
          if (value === 'featured' || value === 'normal' || value === 'hidden') return value;
          if (value === 'destacado') return 'featured';
          if (value === 'oculto') return 'hidden';
          return 'normal';
        };

        const normalizeRentPeriod = (value: unknown): 'daily' | 'weekly' | 'monthly' | null => {
          if (value === 'daily' || value === 'weekly' || value === 'monthly') return value;
          return null;
        };

        const normalizeDateTimeLocal = (value: unknown): string | null => {
          if (typeof value !== 'string') return null;
          const match = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
          return match ? match[1] : null;
        };
        
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
          estado: (vehicle.metadata as any)?.estado || (vehicle.metadata as any)?.condition || vehicle.extra_specs?.estado || vehicle.condition || (vehicle as any).state || null,
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
          historial: (() => {
            const raw =
              (vehicle.metadata as any)?.historial ||
              (vehicle.metadata as any)?.condition_tags ||
              (vehicle.metadata as any)?.status_tags ||
              vehicle.extra_specs?.historial ||
              vehicle.extra_specs?.condition_tags ||
              vehicle.extra_specs?.status_tags ||
              [];
            return Array.isArray(raw) ? raw : [];
          })(),
          features // ? Usar features del resultado de loadVehicleWithSpecs (desde tabla pivot)
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

        // Documentos (tabla public.documents)
        try {
          const { data: docs } = await supabase
            .from('documents')
            .select('id, name, url, file_type, file_size, is_public')
            .eq('listing_id', id)
            .order('created_at', { ascending: true });

          const documents = (docs || []).map((d: any) => ({
            id: crypto.randomUUID(),
            record_id: String(d.id),
            name: d.name || 'documento',
            type: d.file_type || '',
            size: typeof d.file_size === 'number' ? d.file_size : 0,
            path: d.url || null,
            is_public: !!d.is_public,
          }));
          patch('media', { documents } as any);
        } catch {
          // silent
        }
        
        // Commercial (precios y condiciones)
        const meta = (vehicle.metadata as any) || {};
        const advancedConditions =
          meta.advanced_conditions ??
          (vehicle as any)?.extra_specs?.advanced_conditions ??
          (vehicle as any)?.extra_specs?.legacy?.advanced_conditions ??
          null;
        const tradeIn = meta.trade_in || null;
        const inferRentPeriod = (): 'daily' | 'weekly' | 'monthly' | null => {
          const fromMeta = normalizeRentPeriod(meta?.rent_price_period);
          if (fromMeta) return fromMeta;
          const daily = toNumberOrNull((vehicle as any).rent_daily_price);
          const weekly = toNumberOrNull((vehicle as any).rent_weekly_price);
          const monthly = toNumberOrNull((vehicle as any).rent_monthly_price);
          if (daily != null) return 'daily';
          if (weekly != null) return 'weekly';
          if (monthly != null) return 'monthly';
          return null;
        };

        patch('commercial', {
          // Visibilidad no se edita desde el wizard (pausar/impulsar se hace post-publicación)
          visibility: 'normal',
          financing_available: !!vehicle.allow_financing,
          exchange_considered: !!vehicle.allow_exchange,
          exchange_accepts: tradeIn?.accepts ?? null,
          exchange_balance: tradeIn?.balance ?? null,
          currency: ((vehicle as any).currency || 'CLP') as any,
          price: toNumberOrNull((vehicle as any).price),
          offer_price: null,
          discount_type: null,
          discount_valid_until: null,
          condiciones: (() => {
            const raw =
              meta.condiciones ||
              meta.commercial_conditions ||
              vehicle.extra_specs?.condiciones ||
              { flags: [], notas: vehicle.extra_specs?.conditions_notes || null };
            const flags = Array.isArray((raw as any)?.flags) ? (raw as any).flags : [];
            const notas = typeof (raw as any)?.notas === 'string' ? (raw as any).notas : ((raw as any)?.notas == null ? null : String((raw as any).notas));
            return { ...(raw as any), flags, notas };
          })(),
          advanced_conditions: advancedConditions,
          // Campos de arriendo
          rent_daily_price: toNumberOrNull((vehicle as any).rent_daily_price),
          rent_weekly_price: toNumberOrNull((vehicle as any).rent_weekly_price),
          rent_monthly_price: toNumberOrNull((vehicle as any).rent_monthly_price),
          rent_price_period: inferRentPeriod(),
          rent_security_deposit: toNumberOrNull((vehicle as any).rent_security_deposit),
          // Campos de subasta
          auction_start_price: toNumberOrNull((vehicle as any).auction_start_price ?? meta?.auction_start_price),
          auction_start_at: normalizeDateTimeLocal((vehicle as any).auction_start_at ?? meta?.auction_start_at),
          auction_end_at: normalizeDateTimeLocal((vehicle as any).auction_end_at ?? meta?.auction_end_at),
        });
        
        // Tipo de publicación y ID
        patch('listing_type', vehicle.listing_type);
        patch('vehicle_id', id as any);
        
        // Status de publicación actual
        patch('publication_status', vehicle.status || 'draft');

        // Reset de progreso visual al editar: evita checks heredados del draft local.
        // Dejamos Tipo como completo (ya viene definido) y el resto pendiente.
        patch('validity', {
          intent: true,
          type: false,
          basic: false,
          specs: false,
          media: false,
          commercial: false,
        } as any);

        // Al editar, partimos siempre desde el paso 0 (Intención), no en el último paso guardado.
        if (!cancelled) {
          setStep('intent');
        }
      } catch (e) {
        logError('[Hydrator] Error cargando vehículo', e);
      }
    })();
    return () => { cancelled = true; };
  }, [patch, setStep, state.vehicle_id]);
  return null;
}

function ActionsHeaderWrapper() {
  const wiz = useWizard();
  // warning antes de salir si no est� completo
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
        title: "Publicar",
        description: "Completa los pasos y publica tu anuncio.",
      }}
    >
      <div className="w-full mt-8">
        <div className="card-surface shadow-card rounded-3xl p-6 sm:p-8">
          <VehicleWizard />
        </div>
      </div>
    </PanelPageLayout>
  );
}







