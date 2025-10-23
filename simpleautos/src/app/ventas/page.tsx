"use client";
import React, { useEffect, useState } from "react";
import AdvancedFiltersSidebar from "@/components/filters/AdvancedFiltersSidebar";
import { Button } from "@/components/ui/Button";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import CategoryFeaturedSlider from "@/components/slider/CategoryFeaturedSlider";
import { searchVehicles, VehicleRow } from "@/lib/searchVehicles";
import { Vehicle } from "@/types/vehicle";
import { useListingFilters } from "@/hooks/useListingFilters";
import { useRouter } from "next/navigation";
import { ensureLegacyFormat } from "@/lib/normalizeVehicleSpecs";
import { ViewToggle } from "@/components/ui/ViewToggle";

// Función para convertir VehicleRow a Vehicle
function mapVehicleRowToVehicle(row: VehicleRow): Vehicle {
  const imagePaths: string[] = [];

  const communeName = row.communes?.name || row.specs?.legacy?.commune_name || null;
  const regionName = row.regions?.name || row.specs?.legacy?.region_name || null;

  return {
    id: row.id,
    owner_id: '',
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
    allow_financing: false,
    allow_exchange: false,
    featured: false,
    visibility: 'normal',
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
      auction_start_price: row.auction_start_price,
    }),
  } as any;
}

export default function VentasPage() {
  const router = useRouter();
  const { filters, update, setPage, normalizedForQuery } = useListingFilters('venta');
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [layout, setLayout] = useState<'vertical' | 'horizontal'>('vertical');

  useEffect(() => {
    const active = true;
    async function load() {
      setLoading(true);
      try {
        const res = await searchVehicles({ ...normalizedForQuery, visibility: 'publica', page: filters.page, page_size: filters.page_size });
        if (!active) return;
        setVehicles(res.data);
        setTotal(res.count);
      } catch (e:any) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(normalizedForQuery), filters.page, filters.page_size]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    update({ [e.target.name]: e.target.value, page: 1 }, true);
  };

  const handleColorChange = (color: string) => {
    update({ color, page: 1 }, true);
  };

  const handleMultiChange = (changes: Record<string, any>) => {
    update({ ...changes, page: 1 }, true);
  };

  const handleSyncChange = (changes: Record<string, any>) => {
    update(changes, false); // No actualizar URL para sincronización
  };

  const handleClearFilters = () => {
    update({
      type_id: '',
      brand_id: '',
      model_id: '',
      body_type: '',
      region_id: '',
      commune_id: '',
      price_min: '',
      price_max: '',
      year_min: '',
      year_max: '',
      transmission: '',
      fuel_type: '',
      color: '',
      estado: '',
      page: 1
    }, true);
  };

  const handleVehicleClick = (id: string) => {
    router.push(`/vehiculo/${id}`);
  };

  const totalPages = Math.max(1, Math.ceil(total / filters.page_size));
  const canPrev = filters.page > 1;
  const canNext = filters.page < totalPages;

  // Removido: if (loading) return <p>Cargando...</p>; para evitar intermitencia visual
  if (error) return <p className="text-center py-8 text-red-500">Error: {error}</p>;

  return (
    <div className="w-full px-4 md:px-8 lg:px-8">
      <div className="flex flex-col md:flex-row gap-8 max-w-[1400px] mx-auto pb-8">
        <div className="w-full md:w-64 flex-shrink-0">
          <AdvancedFiltersSidebar 
            filters={filters} 
            onChange={handleChange} 
            onColorChange={handleColorChange}
            onMultiChange={handleMultiChange}
            onSyncChange={handleSyncChange}
            onClearFilters={handleClearFilters}
          />
        </div>
        <div className="flex-1 min-w-0">
          {/* Slider de vehículos impulsados en ventas */}
          <CategoryFeaturedSlider listingType="sale" limit={4} slidesPerView={4} />
        <div className="flex items-baseline justify-between mb-4 gap-4 flex-wrap">
          <h1 className="text-2xl font-bold">Vehículos en ventas</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">{total} resultado{total!==1?'s':''}</div>
            <ViewToggle layout={layout} onLayoutChange={setLayout} />
          </div>
        </div>
        {!loading && vehicles.length === 0 ? (
          <div className="text-center py-16 border border-dashed rounded-xl dark:border-white/10 border-black/10">
            <p className="text-lg font-medium mb-2">Sin resultados</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ajusta los filtros o intenta con otros términos.</p>
          </div>
        ) : loading ? (
          <div className="h-64"></div>
        ) : (
        <>
          <div className={`grid gap-6 mb-8 ${layout === 'horizontal' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
            {vehicles.map((auto) => {
              const vehicle = mapVehicleRowToVehicle(auto);
              const seller = auto.profiles ? {
                id: auto.profiles.username || '',
                username: auto.profiles.username,
                nombre: auto.profiles.public_name || 'Vendedor',
                avatar: auto.profiles.avatar_url || undefined,
                email: auto.profiles.email || undefined,
                phone: auto.profiles.phone || undefined,
              } : undefined;
              
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
            <Button variant="neutral" size="sm" shape="rounded" disabled={!canPrev} onClick={() => canPrev && setPage(filters.page - 1)}>Anterior</Button>
            <span className="text-sm font-medium">Página {filters.page} de {totalPages}</span>
            <Button variant="neutral" size="sm" shape="rounded" disabled={!canNext} onClick={() => canNext && setPage(filters.page + 1)}>Siguiente</Button>
          </div>
        </>
        )}
        </div>
      </div>
    </div>
  );
}
