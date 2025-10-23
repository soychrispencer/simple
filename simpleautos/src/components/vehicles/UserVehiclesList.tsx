"use client";

import React, { useEffect, useState } from "react";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { getSupabaseClient } from '@/lib/supabase/supabase';
import { Vehicle } from "@/types/vehicle";
import { useRouter } from "next/navigation";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/form/Input";
import Select from "@/components/ui/form/Select";
import { IconFilter, IconX } from "@tabler/icons-react";

interface UserVehiclesListProps {
  userId: string;
  title?: string;
  limit?: number;
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

interface VehicleRow {
  id: string;
  title: string;
  listing_type: string;
  price: number | null;
  year: number | null;
  mileage: number | null;
  image_urls: string[] | string | null;
  type_id: number;
  brand_id: number | null;
  model_id: number | null;
  owner_id: string;
  region_id: number | null;
  commune_id: number | null;
  rent_daily_price: number | null;
  rent_weekly_price: number | null;
  rent_monthly_price: number | null;
  rent_security_deposit: number | null;
  auction_start_price: number | null;
  auction_start_at: string | null;
  auction_end_at: string | null;
  specs: any;
  created_at: string;
  vehicle_types?: { slug: string; label: string }[];
  regions: { name: string }[];
  communes: { name: string }[];
  brands?: { name: string }[];
  models?: { name: string }[];
  profiles?: {
    username: string;
    public_name: string;
    avatar_url?: string;
    email?: string;
    phone?: string;
  }[];
}

export default function UserVehiclesList({ userId, title = "Vehículos del Vendedor", limit, showFilters = true, page = 1, pageSize = 24, onPageChange, total, sellerInfo }: UserVehiclesListProps) {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<VehicleRow[]>([]);
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
  const supabase = getSupabaseClient();
  const router = useRouter();

  const handleVehicleClick = (id: string) => {
    router.push(`/vehiculo/${id}`);
  };

  useEffect(() => {
    if (!userId) {
      console.log('No userId provided, skipping vehicle load');
      setLoading(false);
      return;
    }

    async function loadUserVehicles() {
      try {
        setLoading(true);

        // Obtener vehículos activos del usuario con paginación
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const query = supabase
          .from('vehicles')
          .select(`
            id,
            title,
            listing_type,
            price,
            year,
            mileage,
            image_urls,
            type_id,
            brand_id,
            model_id,
            owner_id,
            region_id,
            commune_id,
            rent_daily_price,
            rent_weekly_price,
            rent_monthly_price,
            rent_security_deposit,
            auction_start_price,
            auction_start_at,
            auction_end_at,
            specs,
            created_at,
            vehicle_types(slug, label),
            regions(name),
            communes(name),
            brands(name),
            models(name)
          `, { count: 'exact' })
          .eq('visibility', 'normal')
          .eq('owner_id', userId)
          .order('created_at', { ascending: false })
          .range(from, to);

        const { data: vehiclesData, error: vehiclesError, count } = await query;

        if (vehiclesError) {
          console.error('Error fetching user vehicles:', vehiclesError);
          setVehicles([]);
          return;
        }

        if (!vehiclesData || vehiclesData.length === 0) {
          setVehicles([]);
          return;
        }

        // Actualizar el total si se proporcionó una función
        if (onPageChange && count !== null) {
          // Esto es un hack para pasar el total, pero necesitamos una mejor solución
          // Por ahora, asumimos que el componente padre maneja el total
        }

        setVehicles(vehiclesData);
      } catch (error) {
        console.error('Error loading user vehicles:', error);
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      loadUserVehicles();
    }
  }, [userId, page, pageSize, supabase]);

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
        console.error('Error loading filter data:', error);
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
      filtered = filtered.filter(vehicle => vehicle.type_id.toString() === filters.vehicle_type);
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
      filtered = filtered.filter(vehicle => vehicle.specs?.transmission === filters.transmission);
    }

    if (filters.fuel_type) {
      filtered = filtered.filter(vehicle => vehicle.specs?.fuel_type === filters.fuel_type);
    }

    if (filters.condition) {
      filtered = filtered.filter(vehicle => vehicle.specs?.condition === filters.condition);
    }

    if (filters.color) {
      filtered = filtered.filter(vehicle => vehicle.specs?.color === filters.color);
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

  // Función para convertir VehicleRow a Vehicle (similar a la de ventas)
  function mapVehicleRowToVehicle(row: VehicleRow): Vehicle {
    const imagePaths = Array.isArray(row.image_urls)
      ? row.image_urls
      : row.image_urls
      ? [row.image_urls].filter(Boolean)
      : [];

    return {
      id: row.id,
      owner_id: row.owner_id,
      type_id: row.type_id,
      type_key: row.vehicle_types?.[0]?.slug || null,
      title: row.title,
      description: null,
      listing_type: row.listing_type as any,
      listing_kind: row.listing_type as any,
      price: row.price,
      year: row.year,
      mileage: row.mileage,
      mileage_km: row.mileage,
      brand_id: null,
      model_id: null,
      condition: null,
      color: null,
      region_id: row.region_id,
      commune_id: row.commune_id,
      image_urls: imagePaths,
      video_url: null,
      document_urls: [],
      allow_financing: false,
      allow_exchange: false,
      featured: false,
      visibility: 'publica',
      created_at: row.created_at,
      updated_at: row.created_at,
      published_at: row.created_at,
      expires_at: null,
      commune_name: row.communes?.[0]?.name || null,
      region_name: row.regions?.[0]?.name || null,
      type_label: row.vehicle_types?.[0]?.label || null,
      extra_specs: {
        ...row.specs,
        rent_price_period: null,
        rent_daily_price: row.rent_daily_price,
        rent_weekly_price: row.rent_weekly_price,
        rent_monthly_price: row.rent_monthly_price,
        auction_start_price: row.auction_start_price,
      },
    } as any;
  }

  if (loading) {
    return (
      <div className="w-full mt-8">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="w-full mt-8">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <div className="text-center py-8 border border-dashed rounded-xl dark:border-white/10 border-black/10">
          <p className="text-sm text-gray-500 dark:text-gray-400">Este vendedor aún no tiene vehículos publicados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mt-8 px-4 md:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {filteredVehicles.length} de {vehicles.length} vehículo{vehicles.length !== 1 ? 's' : ''}
          </span>
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
                <span className="bg-primary text-white text-xs rounded-full px-1.5 py-0.5">
                  {Object.values(filters).filter(v => v !== '').length}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      {showFilters && showFiltersInternal && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
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
        <div className="text-center py-8 border border-dashed rounded-xl dark:border-white/10 border-black/10">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {hasActiveFilters ? 'No se encontraron vehículos con los filtros aplicados.' : 'Este vendedor aún no tiene vehículos publicados.'}
          </p>
        </div>
      ) : (
        <div className={`grid gap-6 ${layout === 'horizontal' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4'}`}>
          {filteredVehicles.map((auto) => {
            const vehicle = mapVehicleRowToVehicle(auto);
            const seller = sellerInfo ? {
              id: sellerInfo.username || '',
              username: sellerInfo.username,
              nombre: sellerInfo.public_name || 'Vendedor',
              avatar: sellerInfo.avatar_url || undefined,
              email: sellerInfo.email || undefined,
              phone: sellerInfo.phone || undefined,
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
      )}

      {/* Paginación */}
      {total && total > pageSize && onPageChange && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>

          <span className="text-sm text-gray-600 dark:text-gray-400">
            Página {page} de {Math.ceil(total / pageSize)}
          </span>

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= Math.ceil(total / pageSize)}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
