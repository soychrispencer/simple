'use client';

import { useEffect, useState } from 'react';
import { VehicleCard } from '@/components/vehicles/VehicleCard';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/supabase';
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
  rent_daily_price?: number | null;
  rent_weekly_price?: number | null;
  rent_monthly_price?: number | null;
  rent_price_period?: string | null;
  auction_start_price?: number | null;
  extra_specs?: any;
}

interface CategoryFeaturedSliderProps {
  listingType: 'sale' | 'rent' | 'auction';
  title?: string;
  limit?: number;
  slidesPerView?: number;
}

export default function CategoryFeaturedSlider({ 
  listingType, 
  title,
  limit = 10,
  slidesPerView = 5
}: CategoryFeaturedSliderProps) {
  const [vehicles, setVehicles] = useState<CategoryVehicle[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = getSupabaseClient();

  useEffect(() => {
    loadFeaturedVehicles();
  }, [listingType, limit]);

  async function loadFeaturedVehicles() {
    try {
      setLoading(true);

      // Obtener vehículos destacados filtrados por listing_type
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select(`
          id,
          title,
          listing_type,
          price,
          year,
          mileage,
          type_id,
          owner_id,
          region_id,
          commune_id,
          created_at,
          visibility,
          allow_financing,
          allow_exchange,
          featured,
          rent_daily_price,
          rent_weekly_price,
          rent_monthly_price,
          rent_security_deposit,
          auction_start_price,
          auction_start_at,
          auction_end_at,
          specs,
          vehicle_types(slug, label),
          regions(name),
          communes(name)
        `)
        .eq('status', 'active')
        .eq('featured', true)
        .eq('listing_type', listingType)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (vehiclesError) {
        logError('Error fetching vehicles', vehiclesError, { listingType, limit });
        setVehicles([]);
        return;
      }

      if (!vehiclesData || vehiclesData.length === 0) {
        logInfo(`No featured vehicles found for type ${listingType}`, { listingType, limit });
        setVehicles([]);
        return;
      }

      // 2. Obtener imágenes de los vehículos
      const vehicleIds = vehiclesData.map(v => v.id);
      const { data: mediaData, error: mediaError } = await supabase
        .from('vehicle_media')
        .select('vehicle_id, url, type, position')
        .in('vehicle_id', vehicleIds)
        .eq('type', 'image')
        .order('position', { ascending: true });

      if (mediaError) {
        logError('Error fetching vehicle media', mediaError);
      }

      // Crear mapa de imágenes por vehículo
      const imagesMap: Record<string, string[]> = {};
      if (mediaData) {
        mediaData.forEach(media => {
          if (!imagesMap[media.vehicle_id]) {
            imagesMap[media.vehicle_id] = [];
          }
          imagesMap[media.vehicle_id].push(media.url);
        });
      }

      // 5. Cargar perfiles de propietarios
      const ownerIds = [...new Set(vehiclesData.map(v => v.owner_id))].filter(id => id != null);
      if (ownerIds.length > 0) {
        try {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url, email, phone')
            .in('id', ownerIds);

          if (profilesError) {
            console.warn('[CategoryFeaturedSlider] Error loading profiles:', profilesError);
          } else if (profilesData) {
            const profilesMap: Record<string, any> = {};
            profilesData.forEach(p => {
              profilesMap[p.id] = p;
            });
            setProfiles(profilesMap);
          }
        } catch (error) {
          console.warn('[CategoryFeaturedSlider] Failed to load profiles:', error);
        }
      }

      // 6. Mapear datos
      const mappedVehicles = vehiclesData.map((v: any) => ({
        id: v.id,
        title: v.title,
        listing_type: v.listing_type,
        price: v.price,
        year: v.year,
        mileage: v.mileage,
        image_urls: imagesMap[v.id] || [],
        type_key: v.vehicle_types?.slug || null,
        type_label: (v.vehicle_types as any)?.label || null,
        region_name: v.regions?.name || null,
        commune_name: v.communes?.name || null,
        owner_id: v.owner_id,
        rent_daily_price: v.rent_daily_price,
        rent_weekly_price: v.rent_weekly_price,
        rent_monthly_price: v.rent_monthly_price,
        rent_price_period: v.specs?.rent_price_period,
        auction_start_price: v.auction_start_price,
        extra_specs: v.specs,
      }));

      setVehicles(mappedVehicles);
    } catch (error) {
      logError('Error loading featured vehicles', error, { listingType, limit });
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }

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
              const seller = profiles[vehicle.owner_id] ? {
                id: profiles[vehicle.owner_id].id || '',
                username: `${profiles[vehicle.owner_id].first_name || ''} ${profiles[vehicle.owner_id].last_name || ''}`.trim() || 'Usuario',
                nombre: `${profiles[vehicle.owner_id].first_name || ''} ${profiles[vehicle.owner_id].last_name || ''}`.trim() || 'Vendedor',
                avatar: profiles[vehicle.owner_id].avatar_url || undefined,
                email: profiles[vehicle.owner_id].email || undefined,
                phone: profiles[vehicle.owner_id].phone || undefined,
              } : undefined;

              return (
                <SwiperSlide key={vehicle.id} className="h-auto flex">
                  <VehicleCard
                    vehicle={vehicle as any}
                    seller={seller}
                    onClick={handleVehicleClick}
                  />
                </SwiperSlide>
              );
            })}
          </Swiper>

          {/* Botones de navegación */}
          {vehicles.length > 1 && (
            <>
              <button
                className="category-featured-prev absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-darkcard/90 backdrop-blur-sm shadow-lg flex items-center justify-center text-lighttext dark:text-darktext hover:bg-primary hover:text-white transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 -translate-x-1/2"
                aria-label="Anterior"
              >
                <IconChevronLeft size={20} />
              </button>
              <button
                className="category-featured-next absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-darkcard/90 backdrop-blur-sm shadow-lg flex items-center justify-center text-lighttext dark:text-darktext hover:bg-primary hover:text-white transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 translate-x-1/2"
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
