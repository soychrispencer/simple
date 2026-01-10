"use client";
import React from "react";
import Link from "next/link";
import { useSupabase, PanelPageLayout, Button, Input, Select } from "@simple/ui";
import { useToast } from "@simple/ui";
import {
  useListingsScope,
  duplicateListingWithRelations,
  bulkToggleFeaturedListings,
  bulkDeleteListings,
  bulkUpdateListingStatus,
} from "@simple/listings";
import type { ScopeFilter } from "@simple/listings";
import {
  IconPlus,
  IconRefresh,
  IconCopy,
  IconTrash,
  IconPlayerPause,
  IconCircleCheck,
  IconStar,
  IconStarFilled,
  IconEye,
} from "@tabler/icons-react";
import type { Property } from "@/types/property";
import { logError } from "@/lib/logger";
type ListingDbStatus = "published" | "inactive" | "draft" | "sold";

type ListingRow = {
  id: string;
  title: string;
  description?: string | null;
  listing_type: Property["listing_type"];
  price?: number | null;
  currency?: string | null;
  status: ListingDbStatus;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  user_id?: string | null;
  is_featured?: boolean | null;
  views?: number | null;
  listing_metrics?: { views?: number | null } | { views?: number | null }[] | null;
  regions?: { name?: string | null } | { name?: string | null }[] | null;
  communes?: { name?: string | null } | { name?: string | null }[] | null;
  images?: { url?: string | null; position?: number | null; is_primary?: boolean | null }[] | null;
  listings_properties?:
    | {
        property_type?: Property["property_type"] | null;
        operation_type?: string | null;
        bedrooms?: number | null;
        bathrooms?: number | null;
        parking_spaces?: number | null;
        total_area?: number | null;
        built_area?: number | null;
        land_area?: number | null;
        floor?: number | null;
        building_floors?: number | null;
        year_built?: number | null;
        furnished?: boolean | null;
        pet_friendly?: boolean | null;
        features?: string[] | null;
        amenities?: string[] | null;
      }
    | Array<{
        property_type?: Property["property_type"] | null;
        operation_type?: string | null;
        bedrooms?: number | null;
        bathrooms?: number | null;
        parking_spaces?: number | null;
        total_area?: number | null;
        built_area?: number | null;
        land_area?: number | null;
        floor?: number | null;
        building_floors?: number | null;
        year_built?: number | null;
        furnished?: boolean | null;
        pet_friendly?: boolean | null;
        features?: string[] | null;
        amenities?: string[] | null;
      }>;
};

interface PropertyListingItem {
  property: Property;
  status: ListingDbStatus;
  featured: boolean;
  publishedAt?: string | null;
}

type ActionType = "duplicate" | "status" | "feature" | "delete";

const LISTING_SELECT = `
  id,
  title,
  description,
  listing_type,
  price,
  currency,
  status,
  published_at,
  created_at,
  updated_at,
  user_id,
  is_featured,
  views,
  listing_metrics(views),
  regions(name),
  communes(name),
  images:images(url, position, is_primary),
  listings_properties(
    property_type,
    operation_type,
    bedrooms,
    bathrooms,
    parking_spaces,
    total_area,
    built_area,
    land_area,
    floor,
    building_floors,
    year_built,
    furnished,
    pet_friendly,
    features,
    amenities
  ),
  verticals!inner(key)
`;

const DETAIL_CONFIG = {
  table: "listings_properties",
  alias: "listings_properties",
  select: `
    property_type,
    operation_type,
    bedrooms,
    bathrooms,
    parking_spaces,
    total_area,
    built_area,
    land_area,
    floor,
    building_floors,
    year_built,
    furnished,
    pet_friendly,
    features,
    amenities
  `,
} as const;

const STATUS_META: Record<
  ListingDbStatus,
  { label: string; badgeClass: string; next?: ListingDbStatus; actionLabel: string }
> = {
  published: {
    label: "Publicado",
    badgeClass: "bg-[var(--color-success-subtle-bg)] border border-[var(--color-success-subtle-border)] text-[var(--color-success)]",
    next: "inactive",
    actionLabel: "Pausar",
  },
  inactive: {
    label: "Pausado",
    badgeClass: "bg-[var(--color-warn-subtle-bg)] border border-[var(--color-warn-subtle-border)] text-[var(--color-warn)]",
    next: "published",
    actionLabel: "Publicar",
  },
  draft: {
    label: "Borrador",
    badgeClass: "card-surface text-lighttext/80 dark:text-darktext/80",
    next: "published",
    actionLabel: "Publicar",
  },
  sold: {
    label: "Completado",
    badgeClass: "bg-[var(--color-success-subtle-bg)] border border-[var(--color-success-subtle-border)] text-[var(--color-success)]",
    next: "inactive",
    actionLabel: "Pausar",
  },
};

const STATUS_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "published", label: "Publicado" },
  { value: "inactive", label: "Pausado" },
  { value: "draft", label: "Borrador" },
] as const;

const LISTING_TYPE_FILTERS = [
  { value: "all", label: "Todos los tipos" },
  { value: "sale", label: "Venta" },
  { value: "rent", label: "Arriendo" },
  { value: "auction", label: "Subasta" },
] as const;

type StatusFilterValue = "all" | ListingDbStatus;
type ListingTypeFilter = "all" | Property["listing_type"];
type FeaturedFilter = "all" | "featured" | "normal";

interface FiltersState {
  search: string;
  status: StatusFilterValue;
  type: ListingTypeFilter;
  featured: FeaturedFilter;
}

function pickDetail(row: ListingRow["listings_properties"]) {
  if (!row) return null;
  return Array.isArray(row) ? row[0] ?? null : row;
}

function sortImages(images: ListingRow["images"]) {
  return (images || [])
    .filter((img): img is { url: string; position?: number | null; is_primary?: boolean | null } => !!img?.url)
    .sort((a, b) => {
      if (!!a.is_primary === !!b.is_primary) {
        return (a.position ?? 0) - (b.position ?? 0);
      }
      return a.is_primary ? -1 : 1;
    });
}

function mapRowToListing(row: ListingRow): PropertyListingItem {
  const detail = pickDetail(row.listings_properties);
  const orderedImages = sortImages(row.images);
  const primaryImage = orderedImages[0]?.url ?? "/placeholder-property.svg";
  const regionName = Array.isArray(row.regions) ? row.regions[0]?.name : row.regions?.name;
  const communeName = Array.isArray(row.communes) ? row.communes[0]?.name : row.communes?.name;
  const viewsMetric = Array.isArray(row.listing_metrics)
    ? row.listing_metrics[0]?.views
    : row.listing_metrics?.views ?? row.views ?? 0;

  const property: Property = {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    property_type: (detail?.property_type ?? "house") as Property["property_type"],
    listing_type: row.listing_type,
    status: "available",
    price: row.price ?? 0,
    currency: row.currency ?? "CLP",
    rent_price: detail?.operation_type === "rent" ? row.price ?? null : null,
    country: "Chile",
    region: regionName ?? "",
    city: communeName ?? "",
    bedrooms: detail?.bedrooms ?? 0,
    bathrooms: detail?.bathrooms ?? 0,
    area_m2: detail?.total_area ?? 0,
    area_built_m2: detail?.built_area ?? null,
    parking_spaces: detail?.parking_spaces ?? 0,
    floor: detail?.floor ?? null,
    total_floors: detail?.building_floors ?? null,
    has_pool: detail?.features?.includes("pool") ?? false,
    has_garden: detail?.features?.includes("garden") ?? false,
    has_elevator: detail?.amenities?.includes("elevator") ?? false,
    has_balcony: detail?.features?.includes("balcony") ?? false,
    has_terrace: detail?.features?.includes("terrace") ?? false,
    has_gym: detail?.amenities?.includes("gym") ?? false,
    has_security: detail?.amenities?.includes("security") ?? false,
    is_furnished: detail?.furnished ?? false,
    allows_pets: detail?.pet_friendly ?? false,
    image_urls: orderedImages.map((img) => img.url),
    thumbnail_url: primaryImage,
    owner_id: row.user_id ?? "",
    views_count: viewsMetric ?? 0,
    featured: !!row.is_featured,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  };

  return {
    property,
    status: row.status,
    featured: !!row.is_featured,
    publishedAt: row.published_at ?? null,
  };
}

function formatPrice(value: number, currency = "CLP") {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

interface PropertyCardProps {
  item: PropertyListingItem;
  onDuplicate: (id: string) => void;
  onToggleFeatured: (id: string, next: boolean) => void;
  onStatusChange: (id: string, next: ListingDbStatus) => void;
  onDelete: (id: string) => void;
  actionState: { id: string | null; type: ActionType | null };
}

function PropertyListingCard({ item, onDuplicate, onToggleFeatured, onStatusChange, onDelete, actionState }: PropertyCardProps) {
  const statusConfig = STATUS_META[item.status] ?? STATUS_META.draft;
  const isActionPending = (type: ActionType) => actionState.id === item.property.id && actionState.type === type;

  return (
    <div className="card-surface shadow-card p-5 space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="w-full md:w-52 h-40 rounded-2xl overflow-hidden card-surface flex-shrink-0">
          <img
            src={item.property.thumbnail_url || "/placeholder-property.svg"}
            alt={item.property.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-lighttext dark:text-darktext line-clamp-2">{item.property.title}</h3>
              <p className="text-sm text-lighttext/70 dark:text-darktext/70">
                {item.property.city && item.property.region
                  ? `${item.property.city}, ${item.property.region}`
                  : item.property.region || "Sin ubicación"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusConfig.badgeClass}`}>
                {statusConfig.label}
              </span>
              {item.featured && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-warn)]">
                  <IconStarFilled size={16} /> Destacada
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-lighttext/80 dark:text-darktext/80">
            <span className="font-semibold text-lg text-lighttext dark:text-darktext">
              {formatPrice(item.property.price, item.property.currency)}
            </span>
            <span>{item.property.property_type === "apartment" ? "Departamento" : item.property.property_type === "house" ? "Casa" : "Propiedad"}</span>
            {item.property.bedrooms ? <span>{item.property.bedrooms} habs</span> : null}
            {item.property.bathrooms ? <span>{item.property.bathrooms} baños</span> : null}
            {item.property.area_m2 ? <span>{item.property.area_m2} m² totales</span> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/panel/nueva-publicacion?id=${item.property.id}`}>
                <IconEye size={16} /> Editar
              </Link>
            </Button>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => onDuplicate(item.property.id)}
              loading={isActionPending("duplicate")}
            >
              <IconCopy size={16} /> Duplicar
            </Button>
            {statusConfig.next && (
              <Button
                variant={statusConfig.next === "published" ? "primary" : "ghost"}
                size="sm"
                onClick={() => onStatusChange(item.property.id, statusConfig.next as ListingDbStatus)}
                loading={isActionPending("status")}
              >
                {statusConfig.next === "published" ? (
                  <>
                    <IconCircleCheck size={16} /> Publicar
                  </>
                ) : (
                  <>
                    <IconPlayerPause size={16} /> Pausar
                  </>
                )}
              </Button>
            )}
            <Button
              variant={item.featured ? "primary" : "ghost"}
              size="sm"
              onClick={() => onToggleFeatured(item.property.id, !item.featured)}
              loading={isActionPending("feature")}
            >
              {item.featured ? <IconStarFilled size={16} /> : <IconStar size={16} />} {item.featured ? "Quitar destacado" : "Destacar"}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(item.property.id)}
              loading={isActionPending("delete")}
            >
              <IconTrash size={16} /> Eliminar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PropertyListingsPage() {
  const supabase = useSupabase();
  const { addToast } = useToast();
  const { user, scopeFilter, loading: scopeLoading, ensureScope } = useListingsScope({ verticalKey: "properties" });

  const [listings, setListings] = React.useState<PropertyListingItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState<FiltersState>({ search: "", status: "all", type: "all", featured: "all" });
  const [actionState, setActionState] = React.useState<{ id: string | null; type: ActionType | null }>({ id: null, type: null });

  const loadListings = React.useCallback(async () => {
    if (!scopeFilter || scopeLoading) {
      setListings([]);
      if (!scopeLoading) {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("listings")
        .select(LISTING_SELECT)
        .eq(scopeFilter.column, scopeFilter.value)
        .eq("verticals.key", "properties")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const mapped = (data as ListingRow[] | null | undefined)?.map(mapRowToListing) ?? [];
      setListings(mapped);
    } catch (err: any) {
      logError("[PropertyListings] Error loading listings", err);
      addToast(err?.message || "Error cargando publicaciones", { type: "error" });
    } finally {
      setLoading(false);
    }
  }, [addToast, scopeFilter, scopeLoading, supabase]);

  React.useEffect(() => {
    if (scopeLoading) return;
    loadListings();
  }, [loadListings, scopeLoading]);

  const filteredListings = React.useMemo(() => {
    return listings.filter((item) => {
      if (filters.status !== "all" && item.status !== filters.status) {
        return false;
      }
      if (filters.type !== "all" && item.property.listing_type !== filters.type) {
        return false;
      }
      if (filters.featured === "featured" && !item.featured) {
        return false;
      }
      if (filters.featured === "normal" && item.featured) {
        return false;
      }
      if (filters.search.trim()) {
        const needle = filters.search.trim().toLowerCase();
        const haystack = `${item.property.title} ${item.property.city} ${item.property.region}`.toLowerCase();
        if (!haystack.includes(needle)) {
          return false;
        }
      }
      return true;
    });
  }, [filters, listings]);

  const stats = React.useMemo(() => {
    return listings.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === "published") acc.published += 1;
        if (item.status === "inactive") acc.paused += 1;
        if (item.status === "draft") acc.drafts += 1;
        return acc;
      },
      { total: 0, published: 0, paused: 0, drafts: 0 }
    );
  }, [listings]);

  async function withAction(
    id: string,
    type: ActionType,
    cb: (filter: ScopeFilter) => Promise<void>,
    successMessage: string
  ) {
    if (!ensureScope() || !scopeFilter) return;
    const scopedFilter = scopeFilter;
    setActionState({ id, type });
    try {
      await cb(scopedFilter);
      addToast(successMessage, { type: "success" });
      await loadListings();
    } catch (error: any) {
      logError(`[PropertyListings] ${type} failed`, error);
      addToast(error?.message || "Acción no completada", { type: "error" });
    } finally {
      setActionState({ id: null, type: null });
    }
  }

  const handleDuplicate = (id: string) => {
    if (!user) return;
    withAction(
      id,
      "duplicate",
      async (scoped) => {
        await duplicateListingWithRelations(supabase, {
          listingId: id,
          userId: user.id,
          scopeFilter: scoped,
          detail: DETAIL_CONFIG,
        });
      },
      "Publicación duplicada"
    );
  };

  const handleStatusChange = (id: string, next: ListingDbStatus) => {
    const target: "published" | "inactive" | "draft" =
      next === "published" ? "published" : next === "inactive" ? "inactive" : "draft";
    withAction(id, "status", (scoped) => bulkUpdateListingStatus(supabase, [id], target, scoped), "Estado actualizado");
  };

  const handleToggleFeatured = (id: string, next: boolean) => {
    withAction(
      id,
      "feature",
      (scoped) => bulkToggleFeaturedListings(supabase, [id], next, scoped),
      next ? "Publicación destacada" : "Destacado desactivado"
    );
  };

  const handleDelete = (id: string) => {
    withAction(id, "delete", (scoped) => bulkDeleteListings(supabase, [id], scoped), "Publicación eliminada");
  };

  const resetFilters = () => setFilters({ search: "", status: "all", type: "all", featured: "all" });

  return (
    <PanelPageLayout
      header={{
        title: "Publicaciones",
        description: "Gestiona y duplica tus propiedades",
      }}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-lighttext/70 dark:text-darktext/70">Acciones rapidas</div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="sm" onClick={loadListings} disabled={loading}>
              <IconRefresh size={16} /> Actualizar
            </Button>
            <Button size="sm" asChild>
              <Link href="/panel/nueva-publicacion">
                <IconPlus size={16} /> Nueva propiedad
              </Link>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total} helper="Inventario actual" loading={loading} />
          <StatCard label="Publicadas" value={stats.published} helper="Visibles en el sitio" loading={loading} />
          <StatCard label="Pausadas" value={stats.paused} helper="Ocultas temporalmente" loading={loading} />
          <StatCard label="Borradores" value={stats.drafts} helper="Pendientes de publicación" loading={loading} />
        </div>

        <div className="card-surface shadow-card p-4 flex flex-wrap gap-3">
          <Input
            placeholder="Buscar por titulo o ubicacion"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="flex-1 min-w-[200px]"
          />
          <Select
            value={filters.status}
            onChange={(v) => setFilters((prev) => ({ ...prev, status: v as FiltersState["status"] }))}
            options={STATUS_FILTERS.map((opt) => ({ value: opt.value, label: opt.label }))}
          />
          <Select
            value={filters.type}
            onChange={(v) => setFilters((prev) => ({ ...prev, type: v as FiltersState["type"] }))}
            options={LISTING_TYPE_FILTERS.map((opt) => ({ value: opt.value, label: opt.label }))}
          />
          <Select
            value={filters.featured}
            onChange={(v) => setFilters((prev) => ({ ...prev, featured: v as FiltersState["featured"] }))}
            options={[
              { value: "all", label: "Todos" },
              { value: "featured", label: "Destacados" },
              { value: "normal", label: "Sin destacar" },
            ]}
          />
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Limpiar
          </Button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-lighttext/70 dark:text-darktext/70">Cargando publicaciones...</div>
        ) : filteredListings.length === 0 ? (
          <div className="card-surface shadow-card py-16 text-center text-lighttext/70 dark:text-darktext/70">
            No encontramos publicaciones con los filtros actuales.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredListings.map((item) => (
              <PropertyListingCard
                key={item.property.id}
                item={item}
                onDuplicate={handleDuplicate}
                onToggleFeatured={handleToggleFeatured}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                actionState={actionState}
              />
            ))}
          </div>
        )}
      </div>
    </PanelPageLayout>
  );
}

function StatCard({ label, value, helper, loading }: { label: string; value: number; helper: string; loading: boolean }) {
  return (
    <div className="card-surface shadow-card p-4">
      <p className="text-sm text-lighttext/70 dark:text-darktext/70">{label}</p>
      <p className="text-3xl font-semibold text-lighttext dark:text-darktext">{loading ? "—" : value}</p>
      <p className="text-xs text-lighttext/60 dark:text-darktext/60">{helper}</p>
    </div>
  );
}
