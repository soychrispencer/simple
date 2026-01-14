'use client';

import { useEffect, useState, useCallback } from 'react';
import { VehicleCard } from '@/components/vehicles/VehicleCard';
import { useRouter } from 'next/navigation';
import { fetchFeaturedBySlot, BoostSlotKey } from '@/lib/fetchFeaturedBySlot';
import { FeaturedVehicleRow } from '@/lib/vehicleUtils';
import type { VehicleRow } from '@/lib/searchVehicles';
import { getDemoFeaturedVehicleRows, getDemoListingsMode, isDemoListingsEnabled } from '@/lib/demo/demoVehicles';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/autoplay';
import { IconChevronLeft, IconChevronRight, IconSparkles } from "@tabler/icons-react";
import { logError, logInfo } from '../../lib/logger';

interface CategoryVehicle {
  id: string;
  title: string;
  listing_type: string;
  price: number | null;
  year: number | null;
  mileage: number | null;
  image_urls: string[];
  type_key: string | null;
  type_label: string | null;
  region_name: string | null;
  commune_name: string | null;
  owner_id: string;
  featured?: boolean;
  visibility?: string | null;
  extra_specs?: any;
  rent_daily_price?: number | null;
  rent_weekly_price?: number | null;
  rent_monthly_price?: number | null;
  rent_price_period?: string | null;
  auction_start_price?: number | null;
}

type SellerProfile = {
  id: string;
  public_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  phone?: string | null;
};

interface CategoryFeaturedSliderProps {
  listingType: 'sale' | 'rent' | 'auction';
  title?: string;
  limit?: number;
  slidesPerView?: number;
}

const SLOT_BY_LISTING_TYPE: Record<CategoryFeaturedSliderProps['listingType'], BoostSlotKey> = {
  sale: 'venta_tab',
  rent: 'arriendo_tab',
  auction: 'subasta_tab',
};

function mapFeaturedRowToCategoryVehicle(row: FeaturedVehicleRow): CategoryVehicle {
  return {
    id: row.id,
    title: row.title,
    listing_type: row.listing_type,
    price: row.price,
    year: row.year,
    mileage: row.mileage,
    image_urls: row.image_urls ?? [],
    type_key: row.type_key ?? null,
    type_label: row.type_label ?? row.listing_type ?? null,
    region_name: row.region_name ?? null,
    commune_name: row.commune_name ?? null,
    owner_id: row.owner_id ?? '',
    rent_daily_price: row.rent_daily_price ?? null,
    rent_weekly_price: row.rent_weekly_price ?? null,
    rent_monthly_price: row.rent_monthly_price ?? null,
    rent_price_period: row.rent_price_period ?? null,
    auction_start_price: row.auction_start_price ?? null,
    featured: true,
    visibility: 'featured',
    extra_specs: row.extra_specs ?? undefined,
  };
}

function mapDemoRowToCategoryVehicle(row: VehicleRow): CategoryVehicle {
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
    title: row.title,
    listing_type: row.listing_type,
    price: row.price ?? null,
    year: row.year ?? null,
    mileage: row.mileage ?? null,
    image_urls: imagePaths,
    type_key: row.vehicle_types?.slug || null,
    type_label: (row.vehicle_types as any)?.label || null,
    region_name: row.regions?.name || row.specs?.legacy?.region_name || null,
    commune_name: row.communes?.name || row.specs?.legacy?.commune_name || null,
    owner_id: row.owner_id ?? row.user_id ?? '',
    featured: true,
    visibility: 'featured',
    extra_specs: row.specs ?? undefined,
    rent_daily_price: row.rent_daily_price ?? null,
    rent_weekly_price: row.rent_weekly_price ?? null,
    rent_monthly_price: row.rent_monthly_price ?? null,
    rent_price_period: row.rent_price_period ?? null,
    auction_start_price: row.auction_start_price ?? null,
  };
}

export default function CategoryFeaturedSlider({ 
  listingType, 
  title,
  limit = 10,
  slidesPerView = 5
}: CategoryFeaturedSliderProps) {
  const [vehicles, setVehicles] = useState<CategoryVehicle[]>([]);
  const [profiles, setProfiles] = useState<Record<string, SellerProfile>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadFeaturedVehicles = useCallback(async () => {
    try {
      setLoading(true);

      const demoMode = getDemoListingsMode();
      if (demoMode === 'always') {
        const demoRows = getDemoFeaturedVehicleRows({ listingType, count: limit });
        const mappedVehicles = demoRows.map(mapDemoRowToCategoryVehicle);

        const profilesMap: Record<string, SellerProfile> = {};
        demoRows.forEach((vehicle) => {
          const ownerId = (vehicle.owner_id ?? vehicle.user_id) || '';
          if (!ownerId || !vehicle.profiles) return;
          profilesMap[ownerId] = {
            id: ownerId,
            public_name: vehicle.profiles.public_name ?? null,
            username: vehicle.profiles.username ?? null,
            avatar_url: vehicle.profiles.avatar_url ?? null,
            email: vehicle.contact_email ?? null,
            phone: vehicle.contact_phone ?? vehicle.contact_whatsapp ?? null,
          };
        });

        logInfo(`Showing demo featured vehicles (always) for type ${listingType}`, {
          listingType,
          limit,
          demoCount: mappedVehicles.length,
        });
        setVehicles(mappedVehicles);
        setProfiles(profilesMap);
        return;
      }

      const slotKey = SLOT_BY_LISTING_TYPE[listingType];
      const featuredVehicles = await fetchFeaturedBySlot(slotKey, limit);

      if (!featuredVehicles.length) {
        if (isDemoListingsEnabled()) {
          const demoRows = getDemoFeaturedVehicleRows({ listingType, count: limit });
          const mappedVehicles = demoRows.map(mapDemoRowToCategoryVehicle);

          const profilesMap: Record<string, SellerProfile> = {};
          demoRows.forEach((vehicle) => {
            const ownerId = (vehicle.owner_id ?? vehicle.user_id) || '';
            if (!ownerId || !vehicle.profiles) return;
            profilesMap[ownerId] = {
              id: ownerId,
              public_name: vehicle.profiles.public_name ?? null,
              username: vehicle.profiles.username ?? null,
              avatar_url: vehicle.profiles.avatar_url ?? null,
              email: vehicle.contact_email ?? null,
              phone: vehicle.contact_phone ?? vehicle.contact_whatsapp ?? null,
            };
          });

          logInfo(`No featured vehicles found for type ${listingType}; showing demo`, {
            listingType,
            limit,
            demoCount: mappedVehicles.length,
          });
          setVehicles(mappedVehicles);
          setProfiles(profilesMap);
          return;
        }

        logInfo(`No featured vehicles found for type ${listingType}`, { listingType, limit });
        setVehicles([]);
        setProfiles({});
        return;
      }

      const mappedVehicles = featuredVehicles.map(mapFeaturedRowToCategoryVehicle);
      const profilesMap: Record<string, SellerProfile> = {};

      featuredVehicles.forEach((vehicle) => {
        if (vehicle.owner_id && vehicle.profiles) {
          profilesMap[vehicle.owner_id] = {
            id: vehicle.owner_id,
            public_name: vehicle.profiles.public_name ?? null,
            username: vehicle.profiles.username ?? null,
            avatar_url: vehicle.profiles.avatar_url ?? null,
            email: vehicle.contact_email ?? null,
            phone: vehicle.contact_phone ?? vehicle.contact_whatsapp ?? null,
          };
        }
      });

      setVehicles(mappedVehicles);
      setProfiles(profilesMap);
    } catch (error) {
      logError('Error loading featured vehicles', error, { listingType, limit });
      setVehicles([]);
      setProfiles({});
    } finally {
      setLoading(false);
    }
  }, [listingType, limit]);

  useEffect(() => {
    loadFeaturedVehicles();
  }, [loadFeaturedVehicles]);

  const handleVehicleClick = (id: string) => {
    router.push(`/vehiculo/${id}`);
  };

  // Removido: mensaje de loading para evitar intermitencia visual
  if (loading || vehicles.length === 0) {
    return null; // No mostrar nada durante la carga o si no hay vehículos
  }

  const titleText = title || `Vehículos Impulsados en ${
    listingType === 'sale' ? 'Venta' : 
    listingType === 'rent' ? 'Arriendo' : 
    'Subasta'
  }`;

  return (
    <section className="w-full py-8">
      <div className="max-w-screen-2xl mx-auto">
        {/* Header con título */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-lighttext dark:text-darktext flex items-center gap-3">
            <IconSparkles className="text-primary" size={28} />
            {titleText}
          </h2>
          <div className="text-sm text-lighttext/70 dark:text-darktext/70">
            {vehicles.length} vehículo{vehicles.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Slider */}
        <div className="relative group">
          <Swiper
            modules={[Navigation, Autoplay]}
            spaceBetween={20}
            slidesPerView={slidesPerView}
            navigation={{
              prevEl: '.category-featured-prev',
              nextEl: '.category-featured-next',
            }}
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
            }}
            breakpoints={{
              320: { slidesPerView: 1, spaceBetween: 10 },
              640: { slidesPerView: 2, spaceBetween: 15 },
              768: { slidesPerView: 3, spaceBetween: 15 },
              1024: { slidesPerView: 4, spaceBetween: 20 },
              1280: { slidesPerView: slidesPerView, spaceBetween: 20 },
            }}
            className="!pb-4"
          >
            {vehicles.map((vehicle) => {
              const profile = vehicle.owner_id ? profiles[vehicle.owner_id] : undefined;
              const displayName = profile?.public_name || profile?.username || 'Vendedor';
              const seller = profile
                ? {
                    id: profile.id || vehicle.owner_id,
                    username: profile.username || profile.public_name || 'Usuario',
                    nombre: displayName,
                    avatar: profile.avatar_url || undefined,
                    email: profile.email || undefined,
                    phone: profile.phone || undefined,
                  }
                : undefined;

              return (
                <SwiperSlide key={vehicle.id} className="h-auto flex">
                  <div className="w-full max-w-[360px] mx-auto">
                    <VehicleCard
                      vehicle={vehicle as any}
                      seller={seller}
                      onClick={handleVehicleClick}
                    />
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>

          {/* Botones de navegación */}
          {vehicles.length > 1 && (
            <>
              <button
                className="category-featured-prev absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full card-surface shadow-card flex items-center justify-center text-lighttext dark:text-darktext hover:bg-primary hover:text-[var(--color-on-primary)] transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 -translate-x-1/2"
                aria-label="Anterior"
              >
                <IconChevronLeft size={20} />
              </button>
              <button
                className="category-featured-next absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full card-surface shadow-card flex items-center justify-center text-lighttext dark:text-darktext hover:bg-primary hover:text-[var(--color-on-primary)] transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 translate-x-1/2"
                aria-label="Siguiente"
              >
                <IconChevronRight size={20} />
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}







