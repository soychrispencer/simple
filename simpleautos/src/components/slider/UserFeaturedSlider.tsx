"use client";

import React, { useEffect, useState } from "react";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { getSupabaseClient } from '@/lib/supabase/supabase';
import { Vehicle } from "@/types/vehicle";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { IconChevronLeft, IconChevronRight, IconSparkles } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

interface UserFeaturedSliderProps {
  userId: string;
  title?: string;
  limit?: number;
}

interface FeaturedVehicle {
  vehicle: Vehicle;
  seller?: {
    id: string;
    username: string;
    nombre: string;
    avatar?: string;
    email?: string;
    phone?: string;
  };
}

export default function UserFeaturedSlider({ userId, title = "Vehículos Destacados", limit = 3 }: UserFeaturedSliderProps) {
  const [vehicles, setVehicles] = useState<FeaturedVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();
  const router = useRouter();

  const handleVehicleClick = (id: string) => {
    router.push(`/vehiculo/${id}`);
  };

  useEffect(() => {
    async function loadFeaturedVehicles() {
      try {
        setLoading(true);

        // 1. Obtener el slot de user_page
        const { data: slotInfo } = await supabase
          .from('boost_slots')
          .select('id')
          .eq('key', 'user_page')
          .single();

        if (!slotInfo) {
          console.log('No slot found for user_page');
          setVehicles([]);
          return;
        }

        // 2. Obtener vehículos activos del usuario en este slot
        const { data: slotVehicles } = await supabase
          .from('vehicle_boost_slots')
          .select('vehicle_id, priority')
          .eq('slot_id', slotInfo.id)
          .eq('is_active', true)
          .gt('end_date', new Date().toISOString())
          .order('priority', { ascending: false })
          .limit(limit);

        if (!slotVehicles || slotVehicles.length === 0) {
          console.log(`No featured vehicles found for user ${userId}`);
          setVehicles([]);
          return;
        }

        const vehicleIds = slotVehicles.map(v => v.vehicle_id);

        // 3. Obtener detalles de los vehículos del usuario
        const { data: vehiclesData, error: vehiclesError } = await supabase
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
            vehicle_types!inner(slug, label),
            regions(name),
            communes(name)
          `)
          .in('id', vehicleIds)
          .eq('visibility', 'normal')
          .eq('owner_id', userId); // Solo vehículos del usuario

        if (vehiclesError) {
          console.error('Error fetching vehicles:', vehiclesError);
          setVehicles([]);
          return;
        }

        if (!vehiclesData || vehiclesData.length === 0) {
          setVehicles([]);
          return;
        }

        // 4. Obtener perfil del usuario
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, username, public_name, avatar_url, email, phone')
          .eq('id', userId)
          .single();

        // 5. Mapear vehículos con información del vendedor
        const mappedVehicles: FeaturedVehicle[] = vehiclesData.map((v: any) => {
          const isRent = v.listing_type === 'rent';
          const isAuction = v.listing_type === 'auction';

          const vehicle = {
            id: v.id,
            title: v.title,
            listing_type: v.listing_type as 'sale' | 'rent' | 'auction',
            price: isRent ? null : isAuction ? v.auction_start_price : v.price,
            year: v.year,
            mileage: v.mileage,
            image_urls: Array.isArray(v.image_urls) ? v.image_urls : (v.image_urls ? [v.image_urls] : []),
            type_id: v.type_id,
            owner_id: v.owner_id,
            region_id: v.region_id,
            commune_id: v.commune_id,
            region_name: v.regions?.name,
            commune_name: v.communes?.name,
            rent_daily_price: v.rent_daily_price,
            rent_weekly_price: v.rent_weekly_price,
            rent_monthly_price: v.rent_monthly_price,
            rent_security_deposit: v.rent_security_deposit,
            auction_start_price: v.auction_start_price,
            auction_start_at: v.auction_start_at,
            auction_end_at: v.auction_end_at,
            extra_specs: v.specs || {},
            status: 'active',
            visibility: 'featured' as const, // ← Marcar como featured ya que vienen de boost_slots
          } as any as Vehicle;

          const seller = profileData ? {
            id: profileData.id,
            username: profileData.username || '',
            nombre: profileData.public_name || 'Vendedor',
            avatar: profileData.avatar_url,
            email: profileData.email,
            phone: profileData.phone,
          } : undefined;

          return { vehicle, seller };
        });

        setVehicles(mappedVehicles);
      } catch (error) {
        console.error('Error loading featured vehicles:', error);
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      loadFeaturedVehicles();
    }
  }, [userId, limit, supabase]);

  if (loading) {
    return (
      <div className="w-full py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-lightborder/20 dark:bg-darkborder/20 rounded w-1/3"></div>
          <div className="h-64 bg-lightborder/20 dark:bg-darkborder/20 rounded"></div>
        </div>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return null; // No mostrar nada si no hay vehículos destacados
  }

  return (
    <section className="w-full py-8 px-4">
      <div className="max-w-screen-2xl mx-auto">
        {/* Header con título */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-lighttext dark:text-darktext flex items-center gap-3">
            <IconSparkles className="text-primary" size={28} />
            {title}
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
            slidesPerView={5}
            navigation={{
              prevEl: '.user-featured-prev',
              nextEl: '.user-featured-next',
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
              1280: { slidesPerView: 5, spaceBetween: 20 },
            }}
            className="!pb-4"
          >
            {vehicles.map(({ vehicle, seller }) => (
              <SwiperSlide key={vehicle.id} className="h-auto flex">
                <VehicleCard 
                  vehicle={vehicle} 
                  seller={seller}
                  onClick={handleVehicleClick}
                />
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Botones de navegación */}
          {vehicles.length > 1 && (
            <>
              <button
                className="user-featured-prev absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-darkcard/90 backdrop-blur-sm shadow-lg flex items-center justify-center text-lighttext dark:text-darktext hover:bg-primary hover:text-white transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 -translate-x-1/2"
                aria-label="Anterior"
              >
                <IconChevronLeft size={20} />
              </button>
              <button
                className="user-featured-next absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-darkcard/90 backdrop-blur-sm shadow-lg flex items-center justify-center text-lighttext dark:text-darktext hover:bg-primary hover:text-white transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 translate-x-1/2"
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
