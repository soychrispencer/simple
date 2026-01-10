'use client';

import { useCallback, useEffect, useState } from 'react';
import PropertyCard from '@/components/properties/PropertyCard';
import { useRouter } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/autoplay';
import { IconChevronLeft, IconChevronRight, IconSparkles } from "@tabler/icons-react";
import { fetchFeaturedProperties } from '@/app/actions/fetchFeaturedProperties';
import type { Property } from '@/types/property';
import { logError } from '@/lib/logger';

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
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadFeaturedProperties = useCallback(async () => {
    try {
      setLoading(true);

      // Usar Server Action para obtener los datos
      const data = await fetchFeaturedProperties(listingType, limit);

      setProperties(data);
    } catch (error) {
      logError('Error loading featured properties:', error);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [limit, listingType]);

  useEffect(() => {
    loadFeaturedProperties();
  }, [loadFeaturedProperties]);

  const handlePropertyClick = (id: string) => {
    router.push(`/propiedad/${id}`);
  };

  // No mostrar nada durante la carga o si no hay propiedades
  if (loading || properties.length === 0) {
    return null;
  }

  const titleText = title || `Propiedades Impulsadas en ${
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
            {properties.length} propiedad{properties.length !== 1 ? 'es' : ''}
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
            {properties.map((property) => {
              return (
                <SwiperSlide key={property.id} className="h-auto flex">
                  <div onClick={() => handlePropertyClick(property.id)} className="cursor-pointer">
                    <PropertyCard
                      property={property}
                    />
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>

          {/* Botones de navegación */}
          {properties.length > 1 && (
            <>
              <button
                className="category-featured-prev absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full card-surface ring-1 ring-border/60 shadow-card flex items-center justify-center text-lighttext dark:text-darktext hover:bg-primary hover:text-[var(--color-on-primary)] transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 -translate-x-1/2"
                aria-label="Anterior"
              >
                <IconChevronLeft size={20} />
              </button>
              <button
                className="category-featured-next absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full card-surface ring-1 ring-border/60 shadow-card flex items-center justify-center text-lighttext dark:text-darktext hover:bg-primary hover:text-[var(--color-on-primary)] transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 translate-x-1/2"
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