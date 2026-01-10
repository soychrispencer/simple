"use client";

import React, { useEffect, useState } from "react";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { getSupabaseClient } from '@/lib/supabase/supabase';
import { Vehicle } from "@/types/vehicle";
import { mapVehicleRowToVehicle, type VehicleJoinedRow } from '@/lib/vehicleUtils';
import { LISTING_CARD_SELECT, listingRowToVehicleRow } from '@/lib/listings/queryHelpers';
import { useRouter } from "next/navigation";
import { logDebug, logError } from "@/lib/logger";
import { ViewToggle, Button, Input, Select } from "@simple/ui";
import { IconFilter, IconX } from "@tabler/icons-react";

interface UserVehiclesListProps {
  userId?: string;
  publicProfileId?: string;
  title?: string;
  showFilters?: boolean;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  total?: number;
  sellerInfo?: {
    username: string;
    public_name: string;
    avatar_url?: string;
    email?: string;
    phone?: string;
  };
}


export default function UserVehiclesList({ userId, publicProfileId, title = "Vehículos del Vendedor", showFilters = true, page = 1, pageSize = 24, onPageChange, total, sellerInfo }: UserVehiclesListProps) {
  const [vehicles, setVehicles] = useState<VehicleJoinedRow[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<VehicleJoinedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState<'vertical' | 'horizontal'>('vertical');
  const [showFiltersInternal, setShowFiltersInternal] = useState(false);
  const [filters, setFilters] = useState({
    listing_type: '',
    minPrice: '',
    maxPrice: '',
    minYear: '',
    maxYear: '',
    vehicle_type: '',
    brand_id: '',
    model_id: '',
    region_id: '',
    commune_id: '',
    transmission: '',
    fuel_type: '',
    condition: '',
    color: ''
  });
  const [regions, setRegions] = useState<Array<{ id: number; name: string }>>([]);
  const [communes, setCommunes] = useState<Array<{ id: number; name: string; region_id: number }>>([]);
  const [brands, setBrands] = useState<Array<{ id: number; name: string }>>([]);
  const [models, setModels] = useState<Array<{ id: number; name: string; brand_id: number }>>([]);
  const [totalVehicles, setTotalVehicles] = useState<number | null>(typeof total === 'number' ? total : null);
  const supabase = getSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    if (typeof total === 'number') {
      setTotalVehicles(total);
    }
  }, [total]);

  const handleVehicleClick = (id: string) => {
    router.push(`/vehiculo/${id}`);
  };

  useEffect(() => {
    if (!publicProfileId && !userId) {
      logDebug('[UserVehiclesList] No identifier provided; skipping vehicle load');
      setLoading(false);
      return;
    }

    async function loadUserVehicles() {
      try {
        setLoading(true);

        // Obtener vehículos activos del usuario con paginación
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from('listings')
          .select(LISTING_CARD_SELECT, { count: 'exact' })
          .eq('status', 'published')
          .neq('visibility', 'hidden')
          .order('created_at', { ascending: false })
          .range(from, to);

        if (publicProfileId) {
          query = query.eq('public_profile_id', publicProfileId);
        } else if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data: listingsData, error: vehiclesError, count } = await query;

        if (typeof count === 'number') {
          setTotalVehicles(count);
        }

        if (vehiclesError) {
          logError('Error fetching user vehicles', vehiclesError);
          setVehicles([]);
          return;
        }

        if (!listingsData || listingsData.length === 0) {
          setVehicles([]);
          return;
        }

        const mappedRows = listingsData.map((listing) => listingRowToVehicleRow(listing));
        setVehicles(mappedRows);
      } catch (error) {
        logError('Error loading user vehicles', error);
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    }

    if (publicProfileId || userId) {
      loadUserVehicles();
    }
  }, [userId, publicProfileId, page, pageSize, supabase]);

  // Cargar datos adicionales para filtros
  useEffect(() => {
    async function loadFilterData() {
      try {
        // Regiones
        const { data: regionsData } = await supabase
          .from('regions')
          .select('id, name')
          .order('name');
        if (regionsData) setRegions(regionsData);

        // Comunas
        const { data: communesData } = await supabase
          .from('communes')
          .select('id, name, region_id')
          .order('name');
        if (communesData) setCommunes(communesData);

        // Marcas
        const { data: brandsData } = await supabase
          .from('brands')
          .select('id, name')
          .order('name');
        if (brandsData) setBrands(brandsData);

        // Modelos
        const { data: modelsData } = await supabase
          .from('models')
          .select('id, name, brand_id')
          .order('name');
        if (modelsData) setModels(modelsData);
      } catch (error) {
        logError('Error loading filter data', error);
      }
    }

    loadFilterData();
  }, [supabase]);

  // Aplicar filtros cuando cambian los vehículos o los filtros
  useEffect(() => {
    let filtered = [...vehicles];

    if (filters.listing_type) {
      filtered = filtered.filter(vehicle => vehicle.listing_type === filters.listing_type);
    }

    if (filters.vehicle_type) {
      filtered = filtered.filter(vehicle => vehicle.type_id && vehicle.type_id.toString() === filters.vehicle_type);
    }

    if (filters.minPrice) {
      const minPrice = parseFloat(filters.minPrice);
      filtered = filtered.filter(vehicle => {
        const price = vehicle.listing_type === 'rent' 
          ? (vehicle.rent_daily_price || vehicle.rent_weekly_price || vehicle.rent_monthly_price)
          : vehicle.price;
        return price && price >= minPrice;
      });
    }

    if (filters.maxPrice) {
      const maxPrice = parseFloat(filters.maxPrice);
      filtered = filtered.filter(vehicle => {
        const price = vehicle.listing_type === 'rent' 
          ? (vehicle.rent_daily_price || vehicle.rent_weekly_price || vehicle.rent_monthly_price)
          : vehicle.price;
        return price && price <= maxPrice;
      });
    }

    if (filters.minYear) {
      const minYear = parseInt(filters.minYear);
      filtered = filtered.filter(vehicle => vehicle.year && vehicle.year >= minYear);
    }

    if (filters.maxYear) {
      const maxYear = parseInt(filters.maxYear);
      filtered = filtered.filter(vehicle => vehicle.year && vehicle.year <= maxYear);
    }

    if (filters.brand_id) {
      filtered = filtered.filter(vehicle => vehicle.brand_id && vehicle.brand_id.toString() === filters.brand_id);
    }

    if (filters.model_id) {
      filtered = filtered.filter(vehicle => vehicle.model_id && vehicle.model_id.toString() === filters.model_id);
    }

    if (filters.region_id) {
      filtered = filtered.filter(vehicle => vehicle.region_id && vehicle.region_id.toString() === filters.region_id);
    }

    if (filters.commune_id) {
      filtered = filtered.filter(vehicle => vehicle.commune_id && vehicle.commune_id.toString() === filters.commune_id);
    }

    if (filters.transmission) {
      filtered = filtered.filter(vehicle => {
        const val = vehicle.extra_specs?.transmission ?? vehicle.listings_vehicles?.transmission ?? null;
        return val === filters.transmission;
      });
    }

    if (filters.fuel_type) {
      filtered = filtered.filter(vehicle => {
        const val = vehicle.extra_specs?.fuel_type ?? vehicle.listings_vehicles?.fuel_type ?? null;
        return val === filters.fuel_type;
      });
    }

    if (filters.condition) {
      filtered = filtered.filter(vehicle => {
        const val = vehicle.extra_specs?.condition ?? vehicle.listings_vehicles?.condition ?? null;
        return val === filters.condition;
      });
    }

    if (filters.color) {
      filtered = filtered.filter(vehicle => {
        const val = vehicle.extra_specs?.color ?? vehicle.listings_vehicles?.color ?? null;
        return val === filters.color;
      });
    }

    setFilteredVehicles(filtered);
  }, [vehicles, filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleBrandChange = (value: string | number) => {
    setFilters(prev => ({ ...prev, brand_id: value.toString(), model_id: '' })); // Reset model when brand changes
  };

  const handleRegionChange = (value: string | number) => {
    setFilters(prev => ({ ...prev, region_id: value.toString(), commune_id: '' })); // Reset commune when region changes
  };

  const clearFilters = () => {
    setFilters({
      listing_type: '',
      minPrice: '',
      maxPrice: '',
      minYear: '',
      maxYear: '',
      vehicle_type: '',
      brand_id: '',
      model_id: '',
      region_id: '',
      commune_id: '',
      transmission: '',
      fuel_type: '',
      condition: '',
      color: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');
  const totalDisplay = typeof total === 'number'
    ? total
    : typeof totalVehicles === 'number'
      ? totalVehicles
      : vehicles.length;
  const totalForPagination = typeof total === 'number' ? total : totalVehicles;

  // Función para convertir VehicleRow a Vehicle (similar a la de ventas)
  const rowToVehicleCard = React.useCallback((row: VehicleJoinedRow): Vehicle => {
    const base = mapVehicleRowToVehicle(row as any);
    const ensureArray = (value: string[] | string | null | undefined): string[] => {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string' && value.length > 0) {
        return [value];
      }
      return [];
    };
    const rowImages = ensureArray(row.image_paths);
    const baseImagePaths = ensureArray(base.image_paths);
    const baseImageUrls = ensureArray(base.image_urls);
    return {
      ...base,
      owner_id: row.owner_id ?? base.owner_id ?? '',
      type_id: row.type_id ?? base.type_id ?? '',
      title: row.title ?? base.title,
      price: base.price ?? row.price ?? null,
      year: row.year ?? base.year ?? null,
      mileage: row.mileage ?? base.mileage ?? null,
      image_urls: rowImages.length ? rowImages : baseImageUrls,
      image_paths: rowImages.length ? rowImages : baseImagePaths,
      listing_type: (row.listing_type as any) ?? base.listing_type,
      listing_kind: (row.listing_type as any) ?? base.listing_kind,
      allow_financing: row.allow_financing ?? base.allow_financing,
      allow_exchange: row.allow_exchange ?? base.allow_exchange,
      visibility: (row.visibility as any) ?? base.visibility,
      rent_daily_price: row.rent_daily_price ?? base.rent_daily_price,
      rent_weekly_price: row.rent_weekly_price ?? base.rent_weekly_price,
      rent_monthly_price: row.rent_monthly_price ?? base.rent_monthly_price,
      rent_price_period: row.rent_price_period ?? (base as any).rent_price_period,
      rent_security_deposit: row.rent_security_deposit ?? base.rent_security_deposit,
      extra_specs: row.extra_specs ?? base.extra_specs ?? null,
      commune_name: row.commune_name ?? base.commune_name,
      region_name: row.region_name ?? base.region_name,
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full">
        <div className="flex items-baseline justify-between mb-4 gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
        </div>
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 card-surface shadow-card rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-baseline justify-between mb-4 gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
        </div>
        <div className="text-center py-8 border border-dashed rounded-xl border-border/60">
          <p className="text-sm text-lighttext/70 dark:text-darktext/70">Este vendedor aún no tiene vehículos publicados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <div className="text-sm text-lighttext/70 dark:text-darktext/70">
            {filteredVehicles.length} de {totalDisplay} vehículo{totalDisplay !== 1 ? 's' : ''}
          </div>
          <ViewToggle layout={layout} onLayoutChange={setLayout} />
          {showFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFiltersInternal(!showFiltersInternal)}
              className="flex items-center gap-2"
            >
              <IconFilter size={16} />
              Filtros
              {hasActiveFilters && (
                <span className="bg-primary text-[var(--color-on-primary)] text-xs rounded-full px-1.5 py-0.5">
                  {Object.values(filters).filter(v => v !== '').length}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      {showFilters && showFiltersInternal && (
        <div className="mb-6 p-4 card-surface shadow-card rounded-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 mb-4">
            <Select
              label="Tipo de lista"
              value={filters.listing_type}
              onChange={(value) => setFilters(prev => ({ ...prev, listing_type: value as string }))}
              options={[
                { label: "Todos", value: "" },
                { label: "Venta", value: "sale" },
                { label: "Arriendo", value: "rent" },
                { label: "Subasta", value: "auction" }
              ]}
              placeholder="Seleccionar tipo"
              size="sm"
            />

            <Input
              label="Precio mín."
              type="number"
              name="minPrice"
              value={filters.minPrice}
              onChange={handleFilterChange}
              placeholder="0"
              fieldSize="sm"
            />

            <Input
              label="Precio máx."
              type="number"
              name="maxPrice"
              value={filters.maxPrice}
              onChange={handleFilterChange}
              placeholder="Sin límite"
              fieldSize="sm"
            />

            <Input
              label="Año mín."
              type="number"
              name="minYear"
              value={filters.minYear}
              onChange={handleFilterChange}
              placeholder="1900"
              fieldSize="sm"
            />

            <Input
              label="Año máx."
              type="number"
              name="maxYear"
              value={filters.maxYear}
              onChange={handleFilterChange}
              placeholder="Actual"
              fieldSize="sm"
            />

            <Select
              label="Tipo vehículo"
              value={filters.vehicle_type}
              onChange={(value) => setFilters(prev => ({ ...prev, vehicle_type: value as string }))}
              options={[
                { label: "Todos", value: "" },
                { label: "Auto", value: "1" },
                { label: "Camioneta", value: "2" },
                { label: "Moto", value: "3" },
                { label: "Bicicleta", value: "4" },
                { label: "Maquinaria", value: "5" }
              ]}
              placeholder="Seleccionar tipo"
              size="sm"
            />

            <Select
              label="Marca"
              value={filters.brand_id}
              onChange={handleBrandChange}
              options={[
                { label: "Todas", value: "" },
                ...brands.map(brand => ({ label: brand.name, value: brand.id.toString() }))
              ]}
              placeholder="Seleccionar marca"
              size="sm"
            />

            <Select
              label="Modelo"
              value={filters.model_id}
              onChange={(value) => setFilters(prev => ({ ...prev, model_id: value as string }))}
              options={[
                { label: "Todos", value: "" },
                ...models
                  .filter(model => !filters.brand_id || model.brand_id.toString() === filters.brand_id)
                  .map(model => ({ label: model.name, value: model.id.toString() }))
              ]}
              placeholder="Seleccionar modelo"
              size="sm"
              disabled={!filters.brand_id}
            />

            <Select
              label="Región"
              value={filters.region_id}
              onChange={handleRegionChange}
              options={[
                { label: "Todas", value: "" },
                ...regions.map(region => ({ label: region.name, value: region.id.toString() }))
              ]}
              placeholder="Seleccionar región"
              size="sm"
            />

            <Select
              label="Comuna"
              value={filters.commune_id}
              onChange={(value) => setFilters(prev => ({ ...prev, commune_id: value as string }))}
              options={[
                { label: "Todas", value: "" },
                ...communes
                  .filter(commune => !filters.region_id || commune.region_id.toString() === filters.region_id)
                  .map(commune => ({ label: commune.name, value: commune.id.toString() }))
              ]}
              placeholder="Seleccionar comuna"
              size="sm"
              disabled={!filters.region_id}
            />

            <Select
              label="Transmisión"
              value={filters.transmission}
              onChange={(value) => setFilters(prev => ({ ...prev, transmission: value as string }))}
              options={[
                { label: "Todas", value: "" },
                { label: "Manual", value: "manual" },
                { label: "Automática", value: "automatic" }
              ]}
              placeholder="Seleccionar transmisión"
              size="sm"
            />

            <Select
              label="Combustible"
              value={filters.fuel_type}
              onChange={(value) => setFilters(prev => ({ ...prev, fuel_type: value as string }))}
              options={[
                { label: "Todos", value: "" },
                { label: "Gasolina", value: "gasolina" },
                { label: "Diésel", value: "diesel" },
                { label: "Eléctrico", value: "electrico" },
                { label: "Híbrido", value: "hibrido" }
              ]}
              placeholder="Seleccionar combustible"
              size="sm"
            />

            <Select
              label="Estado"
              value={filters.condition}
              onChange={(value) => setFilters(prev => ({ ...prev, condition: value as string }))}
              options={[
                { label: "Todos", value: "" },
                { label: "Nuevo", value: "nuevo" },
                { label: "Usado", value: "usado" }
              ]}
              placeholder="Seleccionar estado"
              size="sm"
            />

            <Select
              label="Color"
              value={filters.color}
              onChange={(value) => setFilters(prev => ({ ...prev, color: value as string }))}
              options={[
                { label: "Todos", value: "" },
                { label: "Blanco", value: "blanco" },
                { label: "Negro", value: "negro" },
                { label: "Gris", value: "gris" },
                { label: "Plata", value: "plata" },
                { label: "Azul", value: "azul" },
                { label: "Rojo", value: "rojo" },
                { label: "Verde", value: "verde" },
                { label: "Otro", value: "otro" }
              ]}
              placeholder="Seleccionar color"
              size="sm"
            />
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <IconX size={16} />
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>
      )}

      {filteredVehicles.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-xl border-border/60">
          <p className="text-sm text-lighttext/70 dark:text-darktext/70">
            {hasActiveFilters ? 'No se encontraron vehículos con los filtros aplicados.' : 'Este vendedor aún no tiene vehículos publicados.'}
          </p>
        </div>
      ) : (
        <div className={`grid gap-6 ${layout === 'horizontal' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 justify-items-center'}`}>
          {filteredVehicles.map((auto) => {
              const vehicle = rowToVehicleCard(auto);
            const seller = sellerInfo ? {
              id: sellerInfo.username || '',
              username: sellerInfo.username,
              nombre: sellerInfo.public_name || 'Vendedor',
              avatar: sellerInfo.avatar_url || undefined,
              email: sellerInfo.email || undefined,
              phone: sellerInfo.phone || undefined,
            } : undefined;

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
      )}

      {/* Paginación */}
      {typeof totalForPagination === 'number' && totalForPagination > pageSize && onPageChange && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-4 py-2 text-sm font-medium text-lighttext dark:text-darktext bg-lightcard dark:bg-darkcard shadow-card rounded-lg hover:bg-lightbg dark:hover:bg-darkbg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>

          <span className="text-sm text-lighttext/70 dark:text-darktext/70">
            Página {page} de {Math.ceil(totalForPagination / pageSize)}
          </span>

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= Math.ceil(totalForPagination / pageSize)}
            className="px-4 py-2 text-sm font-medium text-lighttext dark:text-darktext bg-lightcard dark:bg-darkcard shadow-card rounded-lg hover:bg-lightbg dark:hover:bg-darkbg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}







