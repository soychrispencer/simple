"use client";
import React, { useEffect, useState } from "react";
import AdvancedFiltersSidebar from "@/components/filters/AdvancedFiltersSidebar";
import { Button, ViewToggle } from "@simple/ui";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { searchVehicles, VehicleRow } from "@/lib/searchVehicles";
import { Vehicle } from "@/types/vehicle";
import { ListingFiltersState, useListingFilters } from "@/hooks/useListingFilters";
import { useRouter } from "next/navigation";
import { ensureLegacyFormat } from "@/lib/normalizeVehicleSpecs";
import { buildSearchUrl } from "@/lib/builders/buildSearchUrl";

function mapVehicleRowToVehicle(row: VehicleRow): Vehicle {
  const imagePaths: string[] = Array.isArray((row as any).image_paths)
    ? ((row as any).image_paths as string[])
    : (row as any).image_paths
    ? [String((row as any).image_paths)].filter(Boolean)
    : Array.isArray(row.specs?.gallery)
    ? row.specs.gallery
    : Array.isArray(row.specs?.legacy?.gallery)
    ? row.specs.legacy.gallery
    : [];

  return {
    id: row.id,
    owner_id: row.user_id ?? row.owner_id ?? "",
    type_id: row.type_id,
    type_key: row.vehicle_types?.slug || null,
    title: row.title,
    description: null,
    listing_type: row.listing_type as any,
    price: row.price,
    year: row.year,
    mileage: row.mileage,
    mileage_km: row.mileage,
    brand_id: null,
    model_id: null,
    condition: null,
    color: null,
    region_id: null,
    commune_id: null,
    image_urls: imagePaths,
    video_url: null,
    document_urls: [],
    allow_financing: Boolean((row as any).allow_financing),
    allow_exchange: Boolean((row as any).allow_exchange),
    featured: Boolean((row as any).featured),
    visibility: ((row as any).visibility as any) || "normal",
    created_at: row.created_at,
    updated_at: row.created_at,
    published_at: row.created_at,
    expires_at: null,
    commune_name: row.communes?.name || row.specs?.legacy?.commune_name || null,
    region_name: row.regions?.name || row.specs?.legacy?.region_name || null,
    type_label: (row.vehicle_types as any)?.label || null,
    extra_specs: ensureLegacyFormat({
      ...row.specs,
      rent_price_period: row.rent_price_period,
      rent_daily_price: row.rent_daily_price,
      rent_weekly_price: row.rent_weekly_price,
      rent_monthly_price: row.rent_monthly_price,
      rent_security_deposit: row.rent_security_deposit,
      auction_start_price: row.auction_start_price,
    }),
  } as any;
}

export default function VehiculosPage() {
  const router = useRouter();
  const { filters, update, setPage, normalizedForQuery } = useListingFilters("todos");
  const [draftFilters, setDraftFilters] = useState<ListingFiltersState>(filters);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [layout, setLayout] = useState<"vertical" | "horizontal">("vertical");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  const applyDisabled = buildSearchUrl(draftFilters) === buildSearchUrl(filters);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const res = await searchVehicles({
          ...normalizedForQuery,
          visibility: "publica",
          page: filters.page,
          page_size: filters.page_size,
        });
        if (!active) return;
        setVehicles(res.data);
        setTotal(res.count);
      } catch (e: any) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(normalizedForQuery), filters.page, filters.page_size]);

  const applyFilters = (next: ListingFiltersState = draftFilters) => {
    update(next, false);
    router.push(buildSearchUrl(next));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDraftFilters((prev) => ({ ...prev, [name]: value, page: 1 } as any));
  };

  const handleColorChange = (color: string) => {
    setDraftFilters((prev) => ({ ...prev, color, page: 1 }));
  };

  const handleMultiChange = (changes: Record<string, any>) => {
    setDraftFilters((prev) => ({ ...prev, ...changes, page: 1 }));
  };

  const handleSyncChange = (changes: Record<string, any>) => {
    setDraftFilters((prev) => ({ ...prev, ...changes }));
  };

  const handleClearFilters = () => {
    const cleared: ListingFiltersState = {
      ...draftFilters,
      type_id: "",
      brand_id: "",
      model_id: "",
      body_type: "",
      region_id: "",
      commune_id: "",
      price_min: "",
      price_max: "",
      year_min: "",
      year_max: "",
      transmission: "",
      fuel_type: "",
      color: "",
      estado: "",
      page: 1,
    };
    setDraftFilters(cleared);
    applyFilters(cleared);
  };

  const handleApplyFilters = () => {
    applyFilters({ ...draftFilters, page: 1 });
  };

  const handleVehicleClick = (id: string) => {
    router.push(`/vehiculo/${id}`);
  };

  const totalPages = Math.max(1, Math.ceil(total / filters.page_size));
  const canPrev = filters.page > 1;
  const canNext = filters.page < totalPages;

  if (error) return <p className="text-center py-8 text-[var(--color-danger)]">Error: {error}</p>;

  return (
    <div className="w-full px-4 md:px-8 pb-24 md:pb-8">
      <div className="md:hidden flex items-center justify_between gap-3 mb-4">
        <Button variant="neutral" size="sm" onClick={() => setFiltersOpen(true)}>Filtros</Button>
        <ViewToggle layout={layout} onLayoutChange={setLayout} />
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 bg-[var(--overlay-scrim-40)] backdrop-blur-sm md:hidden">
          <div className="absolute inset-y-0 left-0 w-[82vw] max-w-sm card-surface shadow-card p-4 overflow-y-auto rounded-r-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Filtros</h2>
              <Button variant="ghost" size="sm" onClick={() => setFiltersOpen(false)}>Cerrar</Button>
            </div>
            <AdvancedFiltersSidebar
              filters={draftFilters}
              onChange={handleChange}
              onColorChange={handleColorChange}
              onMultiChange={handleMultiChange}
              onSyncChange={handleSyncChange}
              onClearFilters={() => { handleClearFilters(); setFiltersOpen(false); }}
              onApplyFilters={() => { handleApplyFilters(); setFiltersOpen(false); }}
              applyDisabled={applyDisabled}
            />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-[var(--overlay-scrim-40)]">
            <Button className="w-full" disabled={applyDisabled} onClick={() => { handleApplyFilters(); setFiltersOpen(false); }}>
              Aplicar filtros
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 w-full pb-8">
        <div className="w-full md:w-64 flex-shrink-0 hidden md:block">
          <AdvancedFiltersSidebar
            filters={draftFilters}
            onChange={handleChange}
            onColorChange={handleColorChange}
            onMultiChange={handleMultiChange}
            onSyncChange={handleSyncChange}
            onClearFilters={handleClearFilters}
            onApplyFilters={handleApplyFilters}
            applyDisabled={applyDisabled}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-4 gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">Todos los vehículos publicados</h1>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="text-sm text-lighttext/70 dark:text-darktext/70">{total} resultado{total !== 1 ? "s" : ""}</div>
              <ViewToggle layout={layout} onLayoutChange={setLayout} />
            </div>
          </div>
          {!loading && vehicles.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-xl border-border/60">
              <p className="text-lg font-medium mb-2">Sin resultados</p>
              <p className="text-sm text-lighttext/70 dark:text-darktext/70">Ajusta los filtros o intenta con otros términos.</p>
            </div>
          ) : loading ? (
            <div className="h-64"></div>
          ) : (
            <>
              <div
                className={
                  layout === 'vertical'
                    ? 'grid gap-6 mb-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 justify-items-center'
                    : 'grid gap-6 mb-8 grid-cols-1'
                }
              >
                {vehicles.map((auto) => {
                  const vehicle = mapVehicleRowToVehicle(auto);
                  const seller = auto.profiles
                    ? {
                        id: auto.profiles.username || "",
                        username: auto.profiles.username,
                        nombre: auto.profiles.public_name || "Vendedor",
                        avatar: auto.profiles.avatar_url || undefined,
                      email: auto.contact_email || undefined,
                      phone: auto.contact_phone || auto.contact_whatsapp || undefined,
                      }
                    : undefined;

                  if (layout === 'vertical') {
                    return (
                      <div key={auto.id} className="w-full max-w-[360px]">
                        <VehicleCard
                          vehicle={vehicle}
                          seller={seller}
                          layout={layout}
                          onClick={handleVehicleClick}
                        />
                      </div>
                    );
                  }

                  return (
                    <VehicleCard
                      key={auto.id}
                      vehicle={vehicle}
                      seller={seller}
                      layout={layout}
                      onClick={handleVehicleClick}
                    />
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="neutral"
                  size="sm"
                  shape="rounded"
                  disabled={!canPrev}
                  onClick={() => canPrev && setPage(filters.page - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm font-medium">
                  Página {filters.page} de {totalPages}
                </span>
                <Button
                  variant="neutral"
                  size="sm"
                  shape="rounded"
                  disabled={!canNext}
                  onClick={() => canNext && setPage(filters.page + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      {!loading && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-5 pt-3 card-surface/95 backdrop-blur shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold leading-tight">{total} resultado{total !== 1 ? 's' : ''}</div>
              <div className="text-xs text-lighttext/70 dark:text-darktext/70">Ajusta los filtros sin perder la lista</div>
            </div>
            <Button size="sm" className="flex-1" onClick={() => setFiltersOpen(true)}>
              Abrir filtros
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
