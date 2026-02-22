"use client";
import React from "react";
import { loadVehicleWithSpecs } from '@/lib/loadVehicleWithSpecs';
import { Button, PanelPageLayout, useToast } from "@simple/ui";
import { WizardProvider, useWizard } from "@/components/vehicle-wizard/context/WizardContext";
import { VehicleWizard } from "@/components/vehicle-wizard/VehicleWizard";
import { logError } from "@/lib/logger";
import { useSearchParams } from 'next/navigation';
import { useListingsScope } from "@simple/listings";
import { FREE_TIER_MAX_ACTIVE_LISTINGS } from "@simple/config";

export default function NuevaPublicacion() {
  return <WizardWithStorageKey />;
}

function BlockedPublishScreen({ message }: { message: string }) {
  return (
    <PanelPageLayout
      header={{
        title: "Publicar",
        description: "Completa los pasos y publica tu anuncio.",
      }}
    >
      <div className="w-full mt-6 sm:mt-8">
        <div className="card-surface shadow-card rounded-panel p-5 sm:p-7 border border-border/60">
          <div className="rounded-lg border border-[var(--color-warn-subtle-border)] bg-[var(--color-warn-subtle-bg)] px-4 py-3 text-sm text-[var(--color-warn)] flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <span className="font-semibold">No puedes publicar una nueva publicación ahora.</span>
              <span className="text-[12px] text-lighttext/80 dark:text-darktext/80">{message}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button type="button" variant="neutral" size="sm" onClick={() => { window.location.href = '/panel/mis-publicaciones'; }}>
                Ir a Mis Publicaciones
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={() => { window.location.href = '/panel/mis-suscripciones'; }}>
                Ver planes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PanelPageLayout>
  );
}

function LoadingGateScreen() {
  return (
    <PanelPageLayout
      header={{
        title: "Publicar",
        description: "Completa los pasos y publica tu anuncio.",
      }}
    >
      <div className="w-full mt-6 sm:mt-8">
        <div className="card-surface shadow-card rounded-panel p-5 sm:p-7 border border-border/60">
          <div className="text-sm text-lighttext/80 dark:text-darktext/80">Validando tu plan...</div>
        </div>
      </div>
    </PanelPageLayout>
  );
}

function WizardWithStorageKey() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const forceNew = !id && searchParams.get('new') === '1';

  const { user, loading: scopeLoading, scopeFilter } = useListingsScope({ toastOnMissing: false });
  const isCreating = !id;

  const [gateLoading, setGateLoading] = React.useState(isCreating);
  const [blockedMessage, setBlockedMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isCreating) {
      setGateLoading(false);
      setBlockedMessage(null);
      return;
    }

    if (!user?.id) {
      // Sin usuario no hacemos gate; el wizard ya maneja auth al enviar.
      setGateLoading(false);
      setBlockedMessage(null);
      return;
    }

    if (scopeLoading) return;
    if (!scopeFilter) {
      // Sin scope válido, no bloqueamos acá (el wizard puede guiar/mostrar error cuando corresponda).
      setGateLoading(false);
      setBlockedMessage(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setGateLoading(true);
      try {
        const params = new URLSearchParams({
          mode: 'limits',
          scopeColumn: scopeFilter.column,
          scopeValue: scopeFilter.value,
        });
        const response = await fetch(`/api/vehicles?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error(`No se pudieron obtener límites (${response.status})`);
        }
        const payload = await response.json() as {
          maxActiveListings?: number;
          maxTotalListings?: number;
          activePublishedCount?: number;
          totalListingsCount?: number;
        };
        const parsedMaxActive = Number(payload.maxActiveListings);
        const parsedMaxTotal = Number(payload.maxTotalListings);
        const activePublished = Number(payload.activePublishedCount);
        const totalListings = Number(payload.totalListingsCount);

        const maxActive = Number.isFinite(parsedMaxActive)
          ? parsedMaxActive
          : FREE_TIER_MAX_ACTIVE_LISTINGS;
        const maxTotal = Number.isFinite(parsedMaxTotal) ? parsedMaxTotal : 1;
        const safeActivePublished = Number.isFinite(activePublished) ? activePublished : 0;
        const safeTotalListings = Number.isFinite(totalListings) ? totalListings : 0;

        const blockedByTotal = maxTotal > -1 && safeTotalListings >= maxTotal;
        const blockedByActive = maxActive > -1 && safeActivePublished >= maxActive;

        if (!cancelled && (blockedByTotal || blockedByActive)) {
          const reason = blockedByTotal
            ? `Tu plan permite hasta ${maxTotal} publicación(es) en total. Elimina la actual o mejora tu plan para crear otra.`
            : `Tu plan permite hasta ${maxActive} publicación(es) activa(s). Pausa la actual o mejora tu plan para publicar otra.`;
          setBlockedMessage(reason);
        } else if (!cancelled) {
          setBlockedMessage(null);
        }
      } catch {
        // Ante cualquier error de gate, no bloqueamos el flujo.
        if (!cancelled) setBlockedMessage(null);
      } finally {
        if (!cancelled) setGateLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isCreating, scopeFilter, scopeLoading, user?.id]);

  if (isCreating && gateLoading) {
    return <LoadingGateScreen />;
  }

  if (isCreating && blockedMessage) {
    return <BlockedPublishScreen message={blockedMessage} />;
  }

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

        const normalizeRentPeriod = (value: unknown): 'daily' | 'weekly' | 'monthly' | null => {
          if (value === 'daily' || value === 'weekly' || value === 'monthly') return value;
          return null;
        };

        const normalizeDateTimeLocal = (value: unknown): string | null => {
          if (typeof value !== 'string') return null;
          const match = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
          return match ? match[1] : null;
        };
        
        // Resolver nombres de región/comuna mediante API interna.
        let regionName: string | null = null;
        let communeName: string | null = null;

        if (vehicle.region_id) {
          try {
            const regionsResponse = await fetch('/api/geo?mode=regions', { cache: 'no-store' });
            if (regionsResponse.ok) {
              const payload = await regionsResponse.json() as { regions?: Array<{ id: number | string; name: string }> };
              const targetRegionId = Number(vehicle.region_id);
              const match = (payload.regions || []).find((region) => Number(region.id) === targetRegionId);
              regionName = match?.name || null;
            }
          } catch {
            regionName = null;
          }
        }

        if (vehicle.commune_id) {
          try {
            const query = vehicle.region_id
              ? `/api/geo?mode=communes&region_id=${encodeURIComponent(String(vehicle.region_id))}`
              : '/api/geo?mode=communes';
            const communesResponse = await fetch(query, { cache: 'no-store' });
            if (communesResponse.ok) {
              const payload = await communesResponse.json() as { communes?: Array<{ id: number | string; name: string }> };
              const targetCommuneId = Number(vehicle.commune_id);
              const match = (payload.communes || []).find((commune) => Number(commune.id) === targetCommuneId);
              communeName = match?.name || null;
            }
          } catch {
            communeName = null;
          }
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
          const response = await fetch(`/api/documents?listing_id=${encodeURIComponent(id)}`, {
            method: 'GET',
            cache: 'no-store',
          });
          const payload = await response.json().catch(() => ({} as Record<string, unknown>));
          const docs = response.ok && Array.isArray((payload as { documents?: unknown[] }).documents)
            ? ((payload as { documents: Array<{ id: string | number; name?: string | null; url?: string | null; file_type?: string | null; file_size?: number | null; is_public?: boolean | null }> }).documents ?? [])
            : [];

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
  }, [
    addToast,
    patch,
    setStep,
    state.basic?.brand_id,
    state.basic?.model_id,
    state.basic?.title,
    state.listing_type,
    state.media?.images?.length,
    state.vehicle?.type_key,
    state.vehicle_id,
  ]);
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
      <div className="w-full mt-6 sm:mt-8">
        <div className="card-surface shadow-card rounded-panel p-5 sm:p-7 border border-border/60">
          <VehicleWizard />
        </div>
      </div>
    </PanelPageLayout>
  );
}







