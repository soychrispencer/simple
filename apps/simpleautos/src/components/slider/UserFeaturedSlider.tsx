"use client";

import React, { useEffect, useState } from "react";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { Vehicle } from "@/types/vehicle";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { IconChevronLeft, IconChevronRight, IconSparkles } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { fetchFeaturedBySlot } from "@/lib/fetchFeaturedBySlot";
import { logError } from "@/lib/logger";

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
  const router = useRouter();

  const handleVehicleClick = (id: string) => {
    router.push(`/vehiculo/${id}`);
  };

  useEffect(() => {
    async function loadFeaturedVehicles() {
      try {
        setLoading(true);
        const rows = await fetchFeaturedBySlot('user_page', limit, userId);
        if (!rows.length) {
          setVehicles([]);
          return;
        }

        const mapped: FeaturedVehicle[] = rows.map((row) => {
          const isRent = row.listing_type === 'rent';
          const isAuction = row.listing_type === 'auction';
          const price = isRent ? null : isAuction ? row.auction_start_price : row.price;
          const imageUrls = Array.isArray(row.image_urls) ? row.image_urls : [];

          const vehicle = {
            id: row.id,
            title: row.title,
            listing_type: row.listing_type,
            price,
            year: row.year,
            mileage: row.mileage,
            owner_id: row.owner_id ?? '',
            type_id: row.type_id ?? '',
            description: row.extra_specs?.description ?? null,
            image_urls: imageUrls,
            image_paths: imageUrls,
            allow_financing: row.allow_financing,
            allow_exchange: row.allow_exchange,
            featured: row.featured,
            visibility: (row.visibility as Vehicle['visibility']) ?? 'normal',
            created_at: row.created_at,
            updated_at: row.created_at,
            published_at: row.created_at,
            expires_at: null,
            region_name: row.region_name ?? undefined,
            commune_name: row.commune_name ?? undefined,
            rent_daily_price: row.rent_daily_price ?? undefined,
            rent_weekly_price: row.rent_weekly_price ?? undefined,
            rent_monthly_price: row.rent_monthly_price ?? undefined,
            rent_price_period: row.rent_price_period ?? undefined,
            rent_security_deposit: row.rent_security_deposit ?? undefined,
            auction_start_price: row.auction_start_price ?? undefined,
            auction_start_at: row.auction_start_at ?? undefined,
            auction_end_at: row.auction_end_at ?? undefined,
            extra_specs: row.extra_specs ?? undefined,
          } as Vehicle;

          const seller = row.profiles?.id
            ? {
                id: row.profiles.id,
                username: row.profiles.username || '',
                nombre: row.profiles.public_name || 'Vendedor',
                avatar: row.profiles.avatar_url,
                  email: row.contact_email || undefined,
                  phone: row.contact_phone || row.contact_whatsapp || undefined,
              }
            : undefined;

          return { vehicle, seller };
        });

        setVehicles(mapped);
      } catch (error) {
        logError('Error loading featured vehicles', error);
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      loadFeaturedVehicles();
    }
  }, [userId, limit]);

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
                <div className="w-full max-w-[360px] mx-auto">
                  <VehicleCard 
                    vehicle={vehicle} 
                    seller={seller}
                    onClick={handleVehicleClick}
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Botones de navegación */}
          {vehicles.length > 1 && (
            <>
              <button
                className="user-featured-prev absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full card-surface shadow-card flex items-center justify-center text-lighttext dark:text-darktext hover:bg-primary hover:text-[var(--color-on-primary)] transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 -translate-x-1/2"
                aria-label="Anterior"
              >
                <IconChevronLeft size={20} />
              </button>
              <button
                className="user-featured-next absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full card-surface shadow-card flex items-center justify-center text-lighttext dark:text-darktext hover:bg-primary hover:text-[var(--color-on-primary)] transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 translate-x-1/2"
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







