"use client";
import { getJSON, setJSON } from "@/lib/storage";
import React from "react";
import { createPortal } from "react-dom";
import { Button, CircleButton, ViewToggle, useToast, Input, Select, Modal } from "@simple/ui";
import { PanelPageLayout } from "@simple/ui";
import { useSupabase } from "@/lib/supabase/useSupabase";
import { AdminVehicleCard } from "@/components/vehicles/AdminVehicleCard";
import { InstagramPublishModal } from "@/components/instagram/InstagramPublishModal";
import { ensureLegacyFormat } from "@/lib/normalizeVehicleSpecs";
import { logError } from "@/lib/logger";
import {
  bulkDeleteListings,
  bulkUpdateListingStatus,
  duplicateListingWithRelations,
  useListingsScope,
} from "@simple/listings";
import { IconPlus, IconCar, IconFilterX, IconSearch, IconTrash, IconChecks, IconX, IconPlayerPause } from '@tabler/icons-react';
import { hasActiveBoost } from '@/lib/boostState';
import { FREE_TIER_MAX_ACTIVE_LISTINGS } from '@simple/config';

type Item = {
  id: string;
  titulo: string;
  precio: number;
  currency?: string;
  estadoPublicacion: string; // Estado de publicación: Publicado/Pausado/Borrador
  condicionVehiculo?: string; // Condición del vehículo: Nuevo/Usado/Seminuevo
  portada: string;
  vistas?: number; 
  clics?: number;
  imagenes?: string[];
  year?: number;
  mileage?: number;
  fuel?: string;
  transmission?: string;
  commune?: string;
  region?: string;
  listing_type?: string;
  featured?: boolean;
  type_key?: string;
  type_label?: string;
  extra_specs?: {
    rent_daily_price?: number | null;
    rent_weekly_price?: number | null;
    rent_monthly_price?: number | null;
    rent_price_period?: 'daily' | 'weekly' | 'monthly' | null;
    estado?: string | null;
    condition?: string | null;
    state?: string | null;
    location?: {
      commune_name?: string | null;
      region_name?: string | null;
    } | null;
    legacy?: {
      fuel_legacy?: string | null;
      transmission_legacy?: string | null;
      commune_name?: string | null;
      region_name?: string | null;
    } | null;
    [key: string]: any;
  } | null;
  rent_daily_price?: number | null;
  rent_weekly_price?: number | null;
  rent_monthly_price?: number | null;
  rent_price_period?: 'daily' | 'weekly' | 'monthly' | null;
  auction_start_price?: number | null;
  auction_start_at?: string | null;
  auction_end_at?: string | null;
  // Condiciones comerciales avanzadas
  commercial_conditions?: {
    financing?: any[];
    bonuses?: any[];
    discounts?: any[];
    additional_conditions?: string;
  } | null;
};

const AUTOS_VERTICAL_KEYS = ["vehicles", "autos"] as const;

type UiStatus = "Publicado" | "Pausado" | "Borrador";

const STATUS_LABEL_BY_DB: Record<string, UiStatus> = {
  published: "Publicado",
  inactive: "Pausado",
  draft: "Borrador",
  sold: "Pausado",
};

const DB_STATUS_BY_LABEL: Record<UiStatus, "published" | "inactive" | "draft"> = {
  Publicado: "published",
  Pausado: "inactive",
  Borrador: "draft",
};

const LISTING_SELECT = `
  id,
  vertical_id,
  user_id,
  title,
  price,
  currency,
  status,
  listing_type,
  visibility,
  featured_until,
  views,
  rent_daily_price,
  rent_weekly_price,
  rent_monthly_price,
  rent_security_deposit,
  auction_start_price,
  auction_start_at,
  auction_end_at,
  metadata,
  region_id,
  commune_id,
  created_at,
  published_at,
  tags,
  contact_phone,
  contact_email,
  contact_whatsapp,
  allow_financing,
  allow_exchange,
  verticals!inner(key),
  listings_vehicles(
    vehicle_type_id,
    brand_id,
    model_id,
    year,
    mileage,
    transmission,
    fuel_type,
    condition,
    vehicle_types(slug, name, category),
    brands(name),
    models(name)
  ),
  listing_boost_slots(is_active, ends_at),
  listing_metrics(views, clicks),
  images:images(url, position, is_primary, alt_text, caption),
  communes(name),
  regions(name)
`;

type ListingRow = {
  id: string;
  title: string;
  price: number | null;
  currency?: string | null;
  status: string;
  listing_type: string;
  visibility?: string | null;
  featured_until?: string | null;
  views?: number | null;
  rent_daily_price?: number | null;
  rent_weekly_price?: number | null;
  rent_monthly_price?: number | null;
  rent_price_period?: Item["rent_price_period"];
  rent_security_deposit?: number | null;
  auction_start_price?: number | null;
  auction_start_at?: string | null;
  auction_end_at?: string | null;
  metadata?: Record<string, any> | null;
  region_id?: string | null;
  commune_id?: string | null;
  created_at?: string | null;
  published_at?: string | null;
  tags?: string[] | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  contact_whatsapp?: string | null;
  allow_financing?: boolean | null;
  allow_exchange?: boolean | null;
  listings_vehicles?: {
    vehicle_type_id?: string | null;
    brand_id?: string | null;
    model_id?: string | null;
    year?: number | null;
    mileage?: number | null;
    transmission?: string | null;
    fuel_type?: string | null;
    condition?: string | null;
    vehicle_types?: {
      slug?: string | null;
      name?: string | null;
      category?: string | null;
    } | null;
    brands?: { name?: string | null } | null;
    models?: { name?: string | null } | null;
  } | null;
  listing_metrics?:
    | { views?: number | null; clicks?: number | null }
    | { views?: number | null; clicks?: number | null }[]
    | null;
  listing_boost_slots?: { is_active?: boolean | null; ends_at?: string | null }[] | null;
  images?: { url?: string | null; position?: number | null; is_primary?: boolean | null }[] | null;
  communes?: { name?: string | null } | null;
  regions?: { name?: string | null } | null;
};

function extractMetrics(row: ListingRow) {
  const metrics = Array.isArray(row.listing_metrics)
    ? row.listing_metrics[0]
    : row.listing_metrics;
  const views = typeof metrics?.views === "number" ? metrics.views : typeof row.views === "number" ? row.views : 0;
  const clicks = typeof metrics?.clicks === "number" ? metrics.clicks : 0;
  return { views: views ?? 0, clicks: clicks ?? 0 };
}

function normalizeImages(row: ListingRow) {
  return (row.images || [])
    .filter((img): img is { url: string; position?: number | null; is_primary?: boolean | null } => !!img?.url)
    .sort((a, b) => {
      if (!!a.is_primary === !!b.is_primary) {
        return (a.position ?? 0) - (b.position ?? 0);
      }
      return a.is_primary ? -1 : 1;
    });
}

function buildExtraSpecs(row: ListingRow): Item["extra_specs"] {
  const metadata = row.metadata && typeof row.metadata === "object" ? { ...(row.metadata as Record<string, any>) } : {};
  const location = {
    ...(metadata.location || {}),
    commune_name: metadata.location?.commune_name ?? row.communes?.name ?? null,
    region_name: metadata.location?.region_name ?? row.regions?.name ?? null,
  };
  const legacy = {
    ...(metadata.legacy || {}),
    fuel_legacy: metadata.legacy?.fuel_legacy ?? row.listings_vehicles?.fuel_type ?? null,
    transmission_legacy: metadata.legacy?.transmission_legacy ?? row.listings_vehicles?.transmission ?? null,
    commune_name: metadata.legacy?.commune_name ?? row.communes?.name ?? null,
    region_name: metadata.legacy?.region_name ?? row.regions?.name ?? null,
  };

  const base = {
    ...metadata,
    location,
    legacy,
  };

  return ensureLegacyFormat(base);
}

function mapListingRowToItem(row: ListingRow): Item {
  const { views, clicks } = extractMetrics(row);
  const images = normalizeImages(row);
  const extraSpecs = buildExtraSpecs(row);
  const vehicle = row.listings_vehicles || {};
  const statusLabel = STATUS_LABEL_BY_DB[row.status] ?? "Borrador";
  const primaryImage = images.find((img) => img.is_primary)?.url || images[0]?.url || "/file.svg";
  const fallbackRentPeriod = (
    row.rent_daily_price != null
      ? 'daily'
      : row.rent_weekly_price != null
      ? 'weekly'
      : row.rent_monthly_price != null
      ? 'monthly'
      : null
  ) as Item["rent_price_period"];
  const rentPeriod =
    (row.rent_price_period as Item["rent_price_period"]) ||
    (extraSpecs?.rent_price_period as Item["rent_price_period"]) ||
    fallbackRentPeriod;
  const featured = hasActiveBoost(row.listing_boost_slots);

  return {
    id: row.id,
    titulo: row.title,
    precio: row.price ?? 0,
    currency: row.currency ?? undefined,
    estadoPublicacion: statusLabel,
    condicionVehiculo: vehicle.condition ?? extraSpecs?.estado ?? extraSpecs?.condition ?? undefined,
    portada: primaryImage,
    imagenes: images.map((img) => img.url),
    vistas: views,
    clics: clicks,
    year: vehicle.year ?? undefined,
    mileage: vehicle.mileage ?? undefined,
    fuel: vehicle.fuel_type ?? extraSpecs?.legacy?.fuel_legacy ?? undefined,
    transmission: vehicle.transmission ?? extraSpecs?.legacy?.transmission_legacy ?? undefined,
    commune: row.communes?.name ?? extraSpecs?.location?.commune_name ?? undefined,
    region: row.regions?.name ?? extraSpecs?.location?.region_name ?? undefined,
    listing_type: row.listing_type,
    featured,
    type_key:
      vehicle.vehicle_types?.slug ?? vehicle.vehicle_types?.category ?? (extraSpecs as any)?.type_key ?? undefined,
    type_label: vehicle.vehicle_types?.name ?? undefined,
    extra_specs: extraSpecs,
    rent_daily_price: row.rent_daily_price ?? (extraSpecs as any)?.rent_daily_price ?? null,
    rent_weekly_price: row.rent_weekly_price ?? (extraSpecs as any)?.rent_weekly_price ?? null,
    rent_monthly_price: row.rent_monthly_price ?? (extraSpecs as any)?.rent_monthly_price ?? null,
    rent_price_period: rentPeriod ?? undefined,
    auction_start_price: row.auction_start_price ?? (extraSpecs as any)?.auction_start_price ?? null,
    auction_start_at: row.auction_start_at ?? (extraSpecs as any)?.auction_start_at ?? null,
    auction_end_at: row.auction_end_at ?? (extraSpecs as any)?.auction_end_at ?? null,
    commercial_conditions: (extraSpecs as any)?.commercial_conditions ?? null,
  } satisfies Item;
}

export default function MisPublicaciones() {
  const { addToast } = useToast();
  const supabase = useSupabase();
  const { user, loading: scopeLoading, scopeFilter, ensureScope } = useListingsScope();

  // Evitar que cambios de identidad del toast disparen efectos de fetch.
  const addToastRef = React.useRef(addToast);
  React.useEffect(() => {
    addToastRef.current = addToast;
  }, [addToast]);
  
  const [view, setView] = React.useState<"list" | "grid">("grid");
  const [items, setItems] = React.useState<Item[]>([]);
  const [mounted, setMounted] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const [limitsLoading, setLimitsLoading] = React.useState(true);
  const [maxActiveListings, setMaxActiveListings] = React.useState<number>(FREE_TIER_MAX_ACTIVE_LISTINGS);
  const [maxTotalListings, setMaxTotalListings] = React.useState<number>(1);
  const [activePublishedCount, setActivePublishedCount] = React.useState<number>(0);
  const [totalListingsCount, setTotalListingsCount] = React.useState<number>(0);
  
  // Estados de filtros
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterType, setFilterType] = React.useState<string>("all");
  const [filterStatus, setFilterStatus] = React.useState<string>("all");
  const [filterFeatured, setFilterFeatured] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<string>("date-desc");
  
  // Estados para acciones en lote
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = React.useState(false);
  
  // Estado para modal de confirmación de eliminación
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [vehicleToDelete, setVehicleToDelete] = React.useState<{ id: string; titulo: string } | null>(null);
  const [modalMounted, setModalMounted] = React.useState(false);
  const [instagramModalOpen, setInstagramModalOpen] = React.useState(false);
  const [instagramVehicle, setInstagramVehicle] = React.useState<Item | null>(null);

  React.useEffect(() => {
    setModalMounted(true);
  }, []);

  const openInstagramFor = (id: string) => {
    const found = items.find((it) => it.id === id) || null;
    setInstagramVehicle(found);
    setInstagramModalOpen(true);
  };

  React.useEffect(() => {
    setMounted(true);
    const storedView = getJSON<"list" | "grid">("pub:view", "grid");
    setView(storedView);
  }, []);
  
  React.useEffect(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [scopeFilter]);

  const userId = user?.id ?? null;
  const scopeColumn = scopeFilter?.column ?? null;
  const scopeValue = scopeFilter?.value ?? null;

  const refreshLimits = React.useCallback(async () => {
    if (!supabase) return;
    if (!user?.id) return;
    if (!scopeFilter) {
      setLimitsLoading(false);
      return;
    }

    setLimitsLoading(true);
    try {
      const { data: verticals, error: verticalError } = await supabase
        .from('verticals')
        .select('id, key')
        .in('key', AUTOS_VERTICAL_KEYS as unknown as string[])
        .limit(1);

      if (verticalError || !verticals || verticals.length === 0) {
        throw verticalError ?? new Error('No se encontró la vertical de autos.');
      }

      const verticalId = verticals[0].id as string;

      let companyId: string | null = null;
      if (scopeFilter.column === 'public_profile_id') {
        const { data: pp, error: ppError } = await supabase
          .from('public_profiles')
          .select('company_id')
          .eq('id', scopeFilter.value)
          .maybeSingle();
        if (ppError) throw ppError;
        companyId = (pp as any)?.company_id ?? null;
      }

      let planLimits: any = null;
      if (companyId) {
        const { data: activeSub, error: subError } = await supabase
          .from('subscriptions')
          .select('status, current_period_end, subscription_plans(limits)')
          .eq('company_id', companyId)
          .eq('status', 'active')
          .eq('vertical_id', verticalId)
          .maybeSingle();

        if (subError) throw subError;
        const planSource = Array.isArray((activeSub as any)?.subscription_plans)
          ? (activeSub as any)?.subscription_plans?.[0]
          : (activeSub as any)?.subscription_plans;
        planLimits = planSource?.limits ?? null;
      } else {
        const { data: activeSub, error: subError } = await supabase
          .from('subscriptions')
          .select('status, current_period_end, subscription_plans(limits)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .eq('vertical_id', verticalId)
          .maybeSingle();

        if (subError) throw subError;
        const planSource = Array.isArray((activeSub as any)?.subscription_plans)
          ? (activeSub as any)?.subscription_plans?.[0]
          : (activeSub as any)?.subscription_plans;
        planLimits = planSource?.limits ?? null;
      }

      const parsedMaxActive = Number(planLimits?.max_active_listings ?? planLimits?.max_listings);
      const parsedMaxTotal = Number(planLimits?.max_total_listings ?? planLimits?.max_listings);

      const nextMaxActive = Number.isFinite(parsedMaxActive) ? parsedMaxActive : FREE_TIER_MAX_ACTIVE_LISTINGS;
      // Para Free: queremos 1 publicación total (evita duplicados/drafts infinitos)
      const nextMaxTotal = Number.isFinite(parsedMaxTotal) ? parsedMaxTotal : 1;

      setMaxActiveListings(nextMaxActive);
      setMaxTotalListings(nextMaxTotal);

      let publishedQuery = supabase
        .from('listings')
        .select('id', { count: 'exact' })
        .eq('vertical_id', verticalId)
        .eq('status', 'published')
        .eq(scopeFilter.column, scopeFilter.value)
        .limit(1);

      let totalQuery = supabase
        .from('listings')
        .select('id', { count: 'exact' })
        .eq('vertical_id', verticalId)
        .eq(scopeFilter.column, scopeFilter.value)
        .limit(1);

      const [{ count: publishedCount, error: pubErr }, { count: totalCount, error: totalErr }] = await Promise.all([
        publishedQuery,
        totalQuery,
      ]);

      if (pubErr) throw pubErr;
      if (totalErr) throw totalErr;

      setActivePublishedCount(typeof publishedCount === 'number' ? publishedCount : 0);
      setTotalListingsCount(typeof totalCount === 'number' ? totalCount : 0);
    } catch (err: any) {
      logError('[Publicaciones] Error refrescando límites', err);
      // Fallback seguro: Free
      setMaxActiveListings(FREE_TIER_MAX_ACTIVE_LISTINGS);
      setMaxTotalListings(1);
      setActivePublishedCount(0);
      setTotalListingsCount(0);
    } finally {
      setLimitsLoading(false);
    }
  }, [scopeFilter, supabase, user?.id]);

  React.useEffect(() => {
    refreshLimits();
  }, [refreshLimits]);

  React.useEffect(() => {
    if (!supabase) {
      return;
    }

    if (!userId) {
      if (!scopeLoading) {
        setItems([]);
        setLoading(false);
      }
      return;
    }

    if (!scopeColumn || !scopeValue) {
      if (!scopeLoading) {
        setItems([]);
        setLoading(false);
      }
      return;
    }

    let cancelled = false;

    const fetchListings = async () => {
      try {
        setLoading(true);
        const { data: verticalRows, error: verticalError } = await supabase
          .from('verticals')
          .select('id, key')
          .in('key', Array.from(AUTOS_VERTICAL_KEYS));

        if (verticalError) {
          logError('[Publicaciones] Error cargando verticals', verticalError);
        }

        const verticalIds = (verticalRows || []).map((v: any) => v.id).filter(Boolean);

        let query = supabase
          .from('listings')
          .select(LISTING_SELECT)
          .eq(scopeColumn, scopeValue)
          .order('created_at', { ascending: false });

        if (verticalIds.length > 0) {
          query = query.in('vertical_id', verticalIds);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (!cancelled) {
          const mapped = (data as ListingRow[] | null | undefined)?.map(mapListingRowToItem) ?? [];
          setItems(mapped);
        }
      } catch (err: any) {
        if (!cancelled) {
          logError('[Publicaciones] Error cargando listings', err);
          addToastRef.current('Error cargando publicaciones: ' + (err?.message || 'Error desconocido'), { type: 'error' });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchListings();

    return () => {
      cancelled = true;
    };
  }, [scopeColumn, scopeValue, supabase, userId, scopeLoading]);
  
  React.useEffect(() => { if (mounted) setJSON("pub:view", view); }, [mounted, view]);

  const confirmarEliminar = (id: string, titulo: string) => {
    setVehicleToDelete({ id, titulo });
    setDeleteModalOpen(true);
  };

  const eliminar = async () => {
    if (!vehicleToDelete || !supabase) return;
    if (!ensureScope() || !scopeFilter) return;

    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', vehicleToDelete.id)
        .eq(scopeFilter.column, scopeFilter.value);

      if (error) {
        logError('[Publicaciones] Error eliminando', error);
        throw error;
      }

      setItems((arr) => arr.filter((i) => i.id !== vehicleToDelete.id));
      addToast(`"${vehicleToDelete.titulo}" eliminada`, { type: 'info' });
      setDeleteModalOpen(false);
      setVehicleToDelete(null);
      refreshLimits();
    } catch (error: any) {
      logError('[Publicaciones] Error eliminando publicacion', error);
      addToast('Error eliminando publicacion: ' + (error?.message || 'Error desconocido'), { type: 'error' });
    }
  };
  
  const duplicar = async (id: string) => {
    if (!supabase || !user?.id) return;
    if (!ensureScope() || !scopeFilter) return;

    try {
      if (!limitsLoading && typeof maxTotalListings === 'number' && maxTotalListings > -1) {
        // Para Free: maxTotalListings suele ser 1. Duplicar siempre implicaría crear una segunda.
        if (totalListingsCount >= maxTotalListings) {
          addToast(
            `No puedes duplicar: alcanzaste el límite de ${maxTotalListings} publicación(es) para tu plan.`,
            { type: 'error' }
          );
          return;
        }
      }

      const newListingId = await duplicateListingWithRelations(supabase, {
        listingId: id,
        userId: user.id,
        scopeFilter,
        detail: {
          table: 'listings_vehicles',
        },
      });

      const { data: refreshed, error: refreshError } = await supabase
        .from('listings')
        .select(LISTING_SELECT)
        .eq('id', newListingId)
        .single();

      if (refreshError || !refreshed) {
        throw refreshError ?? new Error('No se pudo cargar la copia');
      }

      const newItem = mapListingRowToItem(refreshed as ListingRow);
      setItems((prev) => [newItem, ...prev]);
      addToast('Publicacion duplicada exitosamente', { type: 'success' });
      refreshLimits();
    } catch (error: any) {
      logError('[duplicar] Error completo', error);
      const errorMsg = error?.message || error?.details || error?.hint || 'Error desconocido al duplicar';
      addToast('Error duplicando publicacion: ' + errorMsg, { type: 'error' });
    }
  };

  const editarVehiculo = (id: string) => {
    window.location.href = `/panel/publicar-vehiculo?id=${id}`;
  };

  // Sincronizar estado de impulso desde listing_boost_slots
  const impulsarPublicacion = async (id: string) => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('listing_boost_slots')
        .select('is_active, ends_at')
        .eq('listing_id', id);

      if (error) throw error;

      const featured = hasActiveBoost(data);
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === id ? { ...item, featured } : item
        )
      );
    } catch (error: any) {
      logError('[impulsarPublicacion] Error', error, { listingId: id });
      const errorMsg = error?.message || error?.details || error?.hint || 'Error desconocido';
      addToast('Error al sincronizar impulso: ' + errorMsg, { type: 'error' });
    }
  };

  // Cambiar estado de un solo veh�culo
  const cambiarEstadoIndividual = async (id: string, nuevoEstado: 'Publicado' | 'Pausado' | 'Borrador') => {
    if (!supabase) return;
    if (!ensureScope() || !scopeFilter) return;

    try {
      if (nuevoEstado === 'Publicado' && !limitsLoading && typeof maxActiveListings === 'number' && maxActiveListings > -1) {
        const current = items.find((i) => i.id === id);
        // Solo bloqueamos si el listing NO está actualmente publicado.
        if (current?.estadoPublicacion !== 'Publicado') {
          const effectiveActive = activePublishedCount;
          if (effectiveActive >= maxActiveListings) {
            addToast(
              maxActiveListings === 1
                ? `En tu plan solo puedes tener ${maxActiveListings} publicación activa. Pausa la actual o mejora el plan.`
                : `Has alcanzado el límite de ${maxActiveListings} publicaciones activas.`,
              { type: 'error' }
            );
            return;
          }
        }
      }

      const dbStatus = DB_STATUS_BY_LABEL[nuevoEstado];

      const { error } = await supabase
        .from('listings')
        .update({ status: dbStatus })
        .eq('id', id)
        .eq(scopeFilter.column, scopeFilter.value);

      if (error) throw error;

      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === id ? { ...item, estadoPublicacion: nuevoEstado } : item
        )
      );

      addToast(`Publicacion cambiada a ${nuevoEstado}`, { type: 'success' });
      refreshLimits();
    } catch (error: any) {
      logError('[cambiarEstadoIndividual] Error', error, { listingId: id, nuevoEstado });
      addToast('Error cambiando estado: ' + (error?.message || 'Error desconocido'), { type: 'error' });
    }
  };

  // Funciones para acciones en lote
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedIds(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedItems.map(item => item.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0 || !supabase) return;
    if (!ensureScope() || !scopeFilter) return;

    if (!window.confirm(`Estas seguro de eliminar ${selectedIds.size} publicacion(es)?`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await bulkDeleteListings(supabase, ids, scopeFilter);

      setItems((arr) => arr.filter((i) => !selectedIds.has(i.id)));
      addToast(`${ids.length} publicacion(es) eliminadas`, { type: 'success' });
      setSelectedIds(new Set());
      setSelectionMode(false);
      refreshLimits();
    } catch (error: any) {
      logError('[Publicaciones] Error en eliminacion masiva', error, { count: selectedIds.size });
      addToast('Error eliminando publicaciones: ' + (error?.message || 'Error desconocido'), { type: 'error' });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkChangeStatus = async (newStatus: UiStatus) => {
    if (selectedIds.size === 0 || !supabase) return;
    if (!ensureScope() || !scopeFilter) return;

    const dbStatus = DB_STATUS_BY_LABEL[newStatus] || 'draft';

    if (newStatus === 'Publicado' && !limitsLoading && typeof maxActiveListings === 'number' && maxActiveListings > -1) {
      const selected = Array.from(selectedIds);
      const selectedItems = items.filter((i) => selected.includes(i.id));
      const toPublishCount = selectedItems.filter((i) => i.estadoPublicacion !== 'Publicado').length;
      if (activePublishedCount + toPublishCount > maxActiveListings) {
        addToast(
          `No puedes publicar ${toPublishCount} publicación(es): tu plan permite ${maxActiveListings} activa(s).`,
          { type: 'error' }
        );
        return;
      }
    }

    setBulkActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await bulkUpdateListingStatus(supabase, ids, dbStatus, scopeFilter);

      setItems((arr) => arr.map((i) =>
        selectedIds.has(i.id) ? { ...i, estadoPublicacion: newStatus } : i
      ));
      addToast(`${ids.length} publicacion(es) actualizadas a ${newStatus}`, { type: 'success' });
      setSelectedIds(new Set());
      setSelectionMode(false);
      refreshLimits();
    } catch (error: any) {
      logError('[Publicaciones] Error en cambio de estado masivo', error, { count: selectedIds.size, newStatus });
      addToast('Error actualizando publicaciones: ' + (error?.message || 'Error desconocido'), { type: 'error' });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Filtrar items seg�n b�squeda y filtros
  const filteredItems = React.useMemo(() => {
    return items.filter(item => {
      // B�squeda por t�tulo
      const matchesSearch = searchQuery === "" || 
        item.titulo.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filtro por tipo de publicaci�n
      const matchesType = filterType === "all" || item.listing_type === filterType;
      
      // Filtro por estado
      const matchesStatus = filterStatus === "all" || item.estadoPublicacion === filterStatus;
      
      // Filtro por destacado
      const matchesFeatured = filterFeatured === "all" || 
        (filterFeatured === "featured" && item.featured) ||
        (filterFeatured === "not-featured" && !item.featured);
      
      return matchesSearch && matchesType && matchesStatus && matchesFeatured;
    });
  }, [items, searchQuery, filterType, filterStatus, filterFeatured]);

  const resetFilters = React.useCallback(() => {
    setSearchQuery("");
    setFilterType("all");
    setFilterStatus("all");
    setFilterFeatured("all");
  }, []);

  // Ordenar items filtrados
  const sortedItems = React.useMemo(() => {
    const itemsToSort = [...filteredItems];
    switch (sortBy) {
      case "date-desc":
        return itemsToSort;
      case "date-asc":
        return itemsToSort.reverse();
      case "price-desc":
        return itemsToSort.sort((a, b) => (b.precio ?? 0) - (a.precio ?? 0));
      case "price-asc":
        return itemsToSort.sort((a, b) => (a.precio ?? 0) - (b.precio ?? 0));
      case "views-desc":
        return itemsToSort.sort((a, b) => (b.vistas ?? 0) - (a.vistas ?? 0));
      case "clicks-desc":
        return itemsToSort.sort((a, b) => (b.clics ?? 0) - (a.clics ?? 0));
      case "title-asc":
        return itemsToSort.sort((a, b) => (a.titulo || "").localeCompare(b.titulo || ""));
      default:
        return itemsToSort;
    }
  }, [filteredItems, sortBy]);

  return (
    <PanelPageLayout
      header={{
        title: "Mis Publicaciones",
        description: "Administra y organiza tus vehículos publicados, pausados y borradores.",
      }}
    >
      <div className="flex flex-col gap-3 mb-6">
        {!selectionMode && items.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap w-full">
            <div className="flex-1 min-w-[200px]">
              <Input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                shape="rounded"
                fieldSize="md"
                leftIcon={<IconSearch size={18} stroke={1.5} />}
              />
            </div>

            <div className="min-w-[140px]">
              <Select
                options={[
                  { label: "Más reciente", value: "date-desc" },
                  { label: "Más antiguo", value: "date-asc" },
                  { label: "Precio: Mayor", value: "price-desc" },
                  { label: "Precio: Menor", value: "price-asc" },
                  { label: "Más vistas", value: "views-desc" },
                  { label: "Más clics", value: "clicks-desc" },
                  { label: "Título: A-Z", value: "title-asc" },
                ]}
                value={sortBy}
                onChange={(val) => setSortBy(String(val))}
                placeholder="Ordenar"
                shape="rounded"
                size="md"
              />
            </div>

            <div className="min-w-[120px]">
              <Select
                options={[
                  { label: "Todos", value: "all" },
                  { label: "Venta", value: "sale" },
                  { label: "Arriendo", value: "rent" },
                  { label: "Subasta", value: "auction" },
                ]}
                value={filterType}
                onChange={(val) => setFilterType(String(val))}
                placeholder="Tipo"
                shape="rounded"
                size="md"
              />
            </div>

            <div className="min-w-[140px]">
              <Select
                options={[
                  { label: "Todos", value: "all" },
                  { label: "Publicado", value: "Publicado" },
                  { label: "Pausado", value: "Pausado" },
                  { label: "Borrador", value: "Borrador" },
                ]}
                value={filterStatus}
                onChange={(val) => setFilterStatus(String(val))}
                placeholder="Estado"
                shape="rounded"
                size="md"
              />
            </div>

            <div className="min-w-[140px]">
              <Select
                options={[
                  { label: "Todos", value: "all" },
                  { label: "Destacados", value: "featured" },
                  { label: "No destacados", value: "not-featured" },
                ]}
                value={filterFeatured}
                onChange={(val) => setFilterFeatured(String(val))}
                placeholder="Impulso"
                shape="rounded"
                size="md"
              />
            </div>

            {(searchQuery || filterType !== "all" || filterStatus !== "all" || filterFeatured !== "all") && (
              <CircleButton
                size={40}
                variant="ghost"
                onClick={resetFilters}
                aria-label="Limpiar filtros"
              >
                <IconFilterX size={20} stroke={1.5} />
              </CircleButton>
            )}

            <CircleButton
              size={40}
              variant="default"
              onClick={toggleSelectionMode}
              aria-label="Modo seleccion"
            >
              <IconChecks size={20} stroke={1.5} />
            </CircleButton>

            <ViewToggle
              layout={view === "grid" ? "vertical" : "horizontal"}
              onLayoutChange={(mode) => setView(mode === "vertical" ? "grid" : "list")}
            />
          </div>
        )}

      </div>
      {/* Barra de acciones en lote */}
      {selectionMode && (
        <div className="card-surface ring-1 ring-border/60 p-6 rounded-3xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Info de selecci�n */}
            <div className="flex items-center gap-3">
              <Button
                variant="neutral"
                size="sm"
                shape="rounded"
                onClick={toggleSelectionMode}
                className="inline-flex items-center gap-1.5"
              >
                <IconX size={16} stroke={2} />
                Cancelar
              </Button>
              {selectedIds.size > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-primary-a10)] dark:bg-[var(--color-primary-a20)]">
                    <span className="text-sm font-semibold text-[var(--color-primary)]">{selectedIds.size}</span>
                  </div>
                  <span className="text-sm font-medium text-lighttext dark:text-darktext">
                    seleccionada{selectedIds.size > 1 ? 's' : ''}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-lighttext/70 dark:text-darktext/70">
                  Selecciona las publicaciones para aplicar acciones
                </span>
              )}
              
              {sortedItems.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-a80)] font-medium transition-colors"
                >
                  {selectedIds.size === sortedItems.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                </button>
              )}
            </div>

            {/* Acciones */}
            {selectedIds.size > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="neutral"
                  size="sm"
                  shape="rounded"
                  onClick={() => bulkChangeStatus('Publicado')}
                  disabled={bulkActionLoading}
                >
                  Publicar
                </Button>
                <Button
                  variant="neutral"
                  size="sm"
                  shape="rounded"
                  onClick={() => bulkChangeStatus('Pausado')}
                  disabled={bulkActionLoading}
                  className="inline-flex items-center gap-1.5"
                >
                  <IconPlayerPause size={14} />
                  Pausar
                </Button>
                <Button
                  variant="neutral"
                  size="sm"
                  shape="rounded"
                  onClick={() => bulkChangeStatus('Borrador')}
                  disabled={bulkActionLoading}
                >
                  Borrador
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  shape="rounded"
                  onClick={bulkDelete}
                  disabled={bulkActionLoading}
                  className="inline-flex items-center gap-1.5"
                >
                  <IconTrash size={14} />
                  Eliminar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="card-surface ring-1 ring-border/60 p-8 text-center rounded-3xl">
          <div className="text-lighttext/80 dark:text-darktext/80">Cargando publicaciones...</div>
        </div>
      ) : items.length === 0 ? (
        <div className="card-surface ring-1 ring-border/60 p-12 text-center rounded-3xl">
          {/* Icono decorativo */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-[var(--color-primary-a10)] dark:bg-[var(--color-primary-a20)] mb-6">
            <IconCar size={48} stroke={1.5} className="text-[var(--color-primary)]" />
          </div>
          
          {/* Título */}
            <h3 className="text-2xl font-semibold text-lighttext dark:text-darktext mb-2">
              No tienes publicaciones aún
          </h3>
          
          {/* Descripción */}
            <p className="text-lighttext/80 dark:text-darktext/80 mb-6 max-w-md mx-auto">
              Empieza a publicar tus vehículos y llega a miles de compradores interesados. 
              ¡Es rápido y fácil!
          </p>
          
          {/* Botón de acción */}
          <Button 
            variant="primary" 
            size="lg"
            onClick={()=>location.href='/panel/publicar-vehiculo?new=1'}
            className="inline-flex items-center gap-2"
          >
            <IconPlus size={20} stroke={2} />
            Crear primera publicación
          </Button>
          
          {/* Tips */}
          <div className="mt-8 pt-8">
            <p className="text-sm text-lighttext/70 dark:text-darktext/70 mb-3">
              <strong>Tip:</strong> Las publicaciones con más fotos y detalles obtienen hasta 3x más vistas
            </p>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="card-surface ring-1 ring-border/60 p-12 text-center rounded-3xl">
          {/* Icono decorativo */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-xl card-surface ring-1 ring-border/60 mb-6">
            <IconSearch size={48} stroke={1.5} className="text-lighttext/60 dark:text-darktext/60" />
          </div>
          
          {/* T�tulo */}
          <h3 className="text-2xl font-semibold text-lighttext dark:text-darktext mb-2">
            No se encontraron publicaciones
          </h3>
          
          {/* Descripci�n */}
          <p className="text-lighttext/80 dark:text-darktext/80 mb-6 max-w-md mx-auto">
            No hay publicaciones que coincidan con los filtros aplicados. 
            Intenta ajustar los criterios de búsqueda.
          </p>
          
          {/* Filtros activos */}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl card-surface ring-1 ring-border/60 text-sm text-lighttext dark:text-darktext">
                <IconSearch size={14} />
                &quot;{searchQuery}&quot;
              </span>
            )}
            {filterType !== "all" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl card-surface ring-1 ring-border/60 text-sm text-lighttext dark:text-darktext">
                Tipo: {filterType === "sale" ? "Venta" : filterType === "rent" ? "Arriendo" : "Subasta"}
              </span>
            )}
            {filterStatus !== "all" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl card-surface ring-1 ring-border/60 text-sm text-lighttext dark:text-darktext">
                Estado: {filterStatus}
              </span>
            )}
            {filterFeatured !== "all" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl card-surface ring-1 ring-border/60 text-sm text-lighttext dark:text-darktext">
                {filterFeatured === "featured" ? "Solo destacados" : "No destacados"}
              </span>
            )}
          </div>
          
          {/* Bot�n de acci�n */}
          <Button 
            variant="neutral" 
            size="md" 
            onClick={() => {
              setSearchQuery("");
              setFilterType("all");
              setFilterStatus("all");
              setFilterFeatured("all");
            }}
            className="inline-flex items-center gap-2"
          >
            <IconFilterX size={18} stroke={2} />
            Limpiar todos los filtros
          </Button>
        </div>
      ) : !mounted || view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
          {sortedItems.map((i) => (
            <div 
              key={i.id} 
              className={`relative w-full max-w-[360px] transition-all duration-200 ${selectionMode ? 'cursor-pointer' : ''} 
                         ${selectedIds.has(i.id) ? 'scale-[0.98]' : ''}`}
              onClick={() => selectionMode && toggleSelectItem(i.id)}
            >
              <div className={`${selectedIds.has(i.id) ? 'opacity-75' : ''} transition-opacity`}>
                <AdminVehicleCard
                  vehicle={i}
                  layout="vertical"
                  selectionMode={selectionMode}
                  selected={selectedIds.has(i.id)}
                  onToggleSelected={() => toggleSelectItem(i.id)}
                  userId={user?.id}
                  onView={(id: string) => window.location.href = `/vehiculo/${id}`}
                  onEdit={(id: string) => editarVehiculo(id)}
                  onDuplicate={(id: string) => duplicar(id)}
                  onDelete={(id: string) => confirmarEliminar(id, i.titulo)}
                  onChangeStatus={(id: string, newStatus: 'Publicado' | 'Pausado' | 'Borrador') => cambiarEstadoIndividual(id, newStatus)}
                  onBoost={(id: string) => impulsarPublicacion(id)}
                  onInstagramPublish={(id: string) => openInstagramFor(id)}
                  canPublish={!limitsLoading && (maxActiveListings < 0 || activePublishedCount < maxActiveListings)}
                  canDuplicate={!limitsLoading && (maxTotalListings < 0 || totalListingsCount < maxTotalListings)}
                  publishDisabledTitle={
                    !limitsLoading && maxActiveListings > -1 && activePublishedCount >= maxActiveListings
                      ? `Límite alcanzado: ${maxActiveListings} publicación(es) activa(s)`
                      : undefined
                  }
                  duplicateDisabledTitle={
                    !limitsLoading && maxTotalListings > -1 && totalListingsCount >= maxTotalListings
                      ? `Límite alcanzado: ${maxTotalListings} publicación(es)`
                      : undefined
                  }
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedItems.map((i) => (
            <div 
              key={i.id} 
              className={`relative w-full max-w-full overflow-hidden transition-all duration-200 ${selectionMode ? 'cursor-pointer' : ''} 
                         ${selectedIds.has(i.id) ? 'scale-[0.99]' : ''}`}
              onClick={() => selectionMode && toggleSelectItem(i.id)}
            >
              <div className={`w-full max-w-full overflow-hidden ${selectedIds.has(i.id) ? 'opacity-75' : ''} transition-opacity`}>
                <AdminVehicleCard
                  vehicle={i}
                  layout="horizontal"
                  selectionMode={selectionMode}
                  selected={selectedIds.has(i.id)}
                  onToggleSelected={() => toggleSelectItem(i.id)}
                  userId={user?.id}
                  onView={(id: string) => window.location.href = `/vehiculo/${id}`}
                  onEdit={(id: string) => editarVehiculo(id)}
                  onDuplicate={(id: string) => duplicar(id)}
                  onDelete={(id: string) => confirmarEliminar(id, i.titulo)}
                  onChangeStatus={(id: string, newStatus: 'Publicado' | 'Pausado' | 'Borrador') => cambiarEstadoIndividual(id, newStatus)}
                  onBoost={(id: string) => impulsarPublicacion(id)}
                  onInstagramPublish={(id: string) => openInstagramFor(id)}
                  canPublish={!limitsLoading && (maxActiveListings < 0 || activePublishedCount < maxActiveListings)}
                  canDuplicate={!limitsLoading && (maxTotalListings < 0 || totalListingsCount < maxTotalListings)}
                  publishDisabledTitle={
                    !limitsLoading && maxActiveListings > -1 && activePublishedCount >= maxActiveListings
                      ? `Límite alcanzado: ${maxActiveListings} publicación(es) activa(s)`
                      : undefined
                  }
                  duplicateDisabledTitle={
                    !limitsLoading && maxTotalListings > -1 && totalListingsCount >= maxTotalListings
                      ? `Límite alcanzado: ${maxTotalListings} publicación(es)`
                      : undefined
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {modalMounted && createPortal(
        <Modal
          open={deleteModalOpen && !!vehicleToDelete}
          onClose={() => {
            setDeleteModalOpen(false);
            setVehicleToDelete(null);
          }}
          maxWidth="max-w-md"
          contentClassName="pt-10"
          footer={
            <div className="flex gap-3">
              <Button
                variant="neutral"
                size="md"
                shape="rounded"
                className="flex-1"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setVehicleToDelete(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="md"
                shape="rounded"
                className="flex-1"
                onClick={eliminar}
              >
                Eliminar
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] text-center">
              ¿Eliminar publicación?
            </h3>
            <p className="text-sm text-[var(--text-secondary)] text-center">
              Estás a punto de eliminar la publicación:
            </p>

            <div className="text-center">
              <div className="text-base font-semibold text-[var(--text-primary)] px-4 py-3 bg-[var(--field-bg)] border border-[var(--field-border)] rounded-md">
                {vehicleToDelete?.titulo}
              </div>
            </div>

            <div className="flex items-center gap-2 justify-center text-[var(--color-danger)] bg-[var(--color-danger-subtle-bg)] border border-[var(--color-danger-subtle-border)] px-4 py-3 rounded-md">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium">Esta acción no se puede deshacer</span>
            </div>
          </div>
        </Modal>,
        document.body
      )}

      {/* Modal Publicar en Instagram */}
      {modalMounted && createPortal(
        <InstagramPublishModal
          open={instagramModalOpen}
          onClose={() => {
            setInstagramModalOpen(false);
            setInstagramVehicle(null);
          }}
          vehicle={
            instagramVehicle
              ? {
                  id: instagramVehicle.id,
                  titulo: instagramVehicle.titulo,
                  precio: instagramVehicle.precio ?? null,
                  listing_type: instagramVehicle.listing_type ?? null,
                  year: instagramVehicle.year ?? null,
                  mileage: instagramVehicle.mileage ?? null,
                  region: instagramVehicle.region ?? null,
                  commune: instagramVehicle.commune ?? null,
                  portada: instagramVehicle.portada ?? null,
                  imagenes: instagramVehicle.imagenes ?? null,
                }
              : null
          }
        />,
        document.body
      )}
    </PanelPageLayout>
  );
}







