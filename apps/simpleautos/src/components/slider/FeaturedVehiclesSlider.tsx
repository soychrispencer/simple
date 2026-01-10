"use client";

import React, { useEffect, useMemo, useState } from "react";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { fetchFeaturedVehicles } from "@/lib/fetchFeaturedVehicles";
import { FeaturedVehicleRow } from "@/lib/vehicleUtils";
import { fetchFeaturedBySlot, BoostSlotKey } from "@/lib/fetchFeaturedBySlot";
import { Vehicle } from "@/types/vehicle";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { ensureLegacyFormat } from "@/lib/normalizeVehicleSpecs";
import { logDebug } from "@/lib/logger";

type ListingGroup = "sale" | "rent" | "auction";

const typeLabels: Record<ListingGroup, string> = {
  sale: "Descubre Oportunidades de Venta",
  rent: "Arriendos Flexibles para Ti",
  auction: "¡Participa en Subastas Únicas!",
};

function mapFeaturedToVehicle(row: FeaturedVehicleRow): Vehicle {
  const rawExtra = row.extra_specs || {};
  const estadoCanon =
    rawExtra.estado ??
    rawExtra.condition ??
    rawExtra.state ??
    null;
  const historialSource =
    rawExtra.historial ??
    rawExtra.condition_tags ??
    rawExtra.status_tags ??
    [];
  const historial = Array.isArray(historialSource)
    ? Array.from(new Set(historialSource.filter(Boolean)))
    : [];

  const condicionesBase =
    rawExtra.condiciones ??
    rawExtra.commercial_conditions ??
    { flags: [], notas: null };
  const conditionFlags = Array.isArray(condicionesBase.flags)
    ? condicionesBase.flags.filter(Boolean)
    : [];
  const notasBase =
    typeof condicionesBase.notas === "string"
      ? condicionesBase.notas.trim()
      : "";
  const condiciones = {
    flags: conditionFlags,
    notas:
      notasBase ||
      (typeof rawExtra.conditions_notes === "string"
        ? rawExtra.conditions_notes.trim() || null
        : null),
  };

  const imagePaths = Array.isArray(row.image_urls)
    ? row.image_urls
    : row.image_urls
    ? [row.image_urls].filter(Boolean)
    : [];

  const rentDaily = row.rent_daily_price ?? rawExtra.rent_daily_price ?? null;
  const rentWeekly = row.rent_weekly_price ?? rawExtra.rent_weekly_price ?? null;
  const rentMonthly = row.rent_monthly_price ?? rawExtra.rent_monthly_price ?? null;
  const rentSecurity = row.rent_security_deposit ?? rawExtra.rent_security_deposit ?? null;
  const rentPeriod = (row.rent_price_period ?? rawExtra.rent_price_period) ?? (rentDaily != null
    ? 'daily'
    : rentWeekly != null
    ? 'weekly'
    : rentMonthly != null
    ? 'monthly'
    : null);
  const derivedRentPrice = rentPeriod === 'daily'
    ? rentDaily
    : rentPeriod === 'weekly'
    ? rentWeekly
    : rentPeriod === 'monthly'
    ? rentMonthly
    : null;

  const auctionStartPrice = (row as any).auction_start_price ?? rawExtra.auction_start_price ?? null;
  const auctionStartAt = (row as any).auction_start_at ?? rawExtra.auction_start_at ?? null;
  const auctionEndAt = (row as any).auction_end_at ?? rawExtra.auction_end_at ?? null;
  
  const effectivePrice = derivedRentPrice != null ? derivedRentPrice : row.price;

  const typeId = (row.type_id ?? rawExtra.type_id ?? null) as string | null;
  const allowFinancing = typeof row.allow_financing === "boolean"
    ? row.allow_financing
    : !!rawExtra.allow_financing;
  const allowExchange = typeof row.allow_exchange === "boolean"
    ? row.allow_exchange
    : !!rawExtra.allow_exchange;
  const visibility = (row.visibility as Vehicle["visibility"]) || "featured";

  const vehicle: any = {
    id: row.id,
    owner_id: (row as any).owner_id || rawExtra.owner_id || "featured-owner",
    type_id: typeId ?? `mock-${row.id}`,
    type_key: (row as any).type_key || rawExtra.type_key || null,
    type_label: (row as any).type_label || null,
    title: row.title,
    description: null,
    listing_type: row.listing_type,
  price: effectivePrice == null ? null : Number(effectivePrice),
    year: row.year === null ? null : Number(row.year),
    mileage: row.mileage === null ? null : Number(row.mileage),
    mileage_km: row.mileage === null ? null : Number(row.mileage),
    brand_id: rawExtra.brand_id ?? null,
    model_id: rawExtra.model_id ?? null,
    condition: estadoCanon,
    color: rawExtra.color ?? null,
    region_id: rawExtra.region_id ?? null,
    commune_id: rawExtra.commune_id ?? null,
    image_urls: imagePaths,
    image_paths: imagePaths,
    video_url: rawExtra.video_url ?? null,
    document_urls: Array.isArray(rawExtra.document_urls) ? rawExtra.document_urls : [],
    allow_financing: allowFinancing,
    allow_exchange: allowExchange,
    featured: row.featured || visibility === "featured",
    visibility,
    created_at: row.created_at,
    updated_at: row.created_at,
    published_at: row.created_at,
    expires_at: null,
    rent_daily_price: rentDaily,
    rent_weekly_price: rentWeekly,
    rent_monthly_price: rentMonthly,
    rent_price_period: rentPeriod ?? null,
    rent_security_deposit: rentSecurity,
    auction_start_price: auctionStartPrice,
    auction_start_at: auctionStartAt,
    auction_end_at: auctionEndAt,
    extra_specs: ensureLegacyFormat({
      ...rawExtra,
      estado: estadoCanon,
      condition: estadoCanon,
      state: estadoCanon,
      historial,
      condition_tags: historial,
      status_tags: historial,
      condiciones,
      commercial_conditions: condiciones,
      conditions_notes: condiciones.notas,
      main_image: imagePaths.length ? imagePaths[0] : null,
      rent_daily_price: rentDaily,
      rent_weekly_price: rentWeekly,
      rent_monthly_price: rentMonthly,
      rent_price_period: rentPeriod,
      rent_security_deposit: rentSecurity,
      auction_start_price: auctionStartPrice,
      auction_start_at: auctionStartAt,
      auction_end_at: auctionEndAt,
      legacy: {
        ...(rawExtra.legacy || {}),
        commune_name: (row as any).commune_name || rawExtra.legacy?.commune_name || null,
        region_name: (row as any).region_name || rawExtra.legacy?.region_name || null,
      }
    }),
  };
  
  return vehicle as Vehicle;
}

interface FeaturedVehiclesSliderProps {
  slotKey?: BoostSlotKey; // Si se especifica, usa el sistema de boosts
  userId?: string; // Para slot user_page
  limit?: number;
}

export const FeaturedVehiclesSlider: React.FC<FeaturedVehiclesSliderProps> = ({ slotKey, userId, limit = 45 }) => {
  const [items, setItems] = useState<Array<{ vehicle: Vehicle; seller?: any }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        
        // Usar sistema de boosts si slotKey está especificado
        let data: FeaturedVehicleRow[];
        
        if (slotKey) {
          // Obtener solo de slots (sin fallback)
          data = await fetchFeaturedBySlot(slotKey, limit, userId);
          
          if (data.length === 0) {
            logDebug('[FeaturedVehiclesSlider] No vehicles in slot', { slotKey });
          }
        } else {
          // Método tradicional
          data = await fetchFeaturedVehicles(limit);
        }
          
        if (!cancelled) {
          setItems(data.map(row => {
            const vehicle = mapFeaturedToVehicle(row);
            const seller = (row as any).profiles ? {
              id: (row as any).profiles.username || '',
              username: (row as any).profiles.username,
              nombre: (row as any).profiles.public_name || 'Vendedor',
              avatar: (row as any).profiles.avatar_url || undefined,
              email: (row as any).contact_email || undefined,
              phone: (row as any).contact_phone || (row as any).contact_whatsapp || undefined,
            } : undefined;
            return { vehicle, seller };
          }));
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Error inesperado");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slotKey, userId, limit]);

  const featuredByType = useMemo(() => {
    const groups: Record<string, Array<{ vehicle: Vehicle; seller?: any }>> = {
      sale: [],
      rent: [],
      auction: [],
    };
    items.forEach(item => {
      const tipo = item.vehicle.listing_kind || "sale";
      if (groups[tipo]) groups[tipo].push(item);
    });
    return groups;
  }, [items]);

  if (error) {
    return (
      <section className="w-full max-w-full mx-auto mt-6 px-4 md:px-8 text-center text-sm text-[var(--color-danger)]">
        Error cargando vehículos impulsados: {error}
      </section>
    );
  }

  // No mostrar nada durante la carga ni mensaje si no hay veh�culos (evita intermitencia visual)
  if (loading || items.length === 0) {
    return null;
  }

  return (
    <section className="w-full max-w-full mx-auto mt-6 px-4 md:px-8 flex flex-col gap-10">
      {(Object.keys(typeLabels) as ListingGroup[]).map((tipo) => {
        const group = featuredByType[tipo];
        if (!group.length) return null;
        return (
          <div key={tipo} className="w-full">
            <h2 className="text-xl font-bold mb-3 text-center">{typeLabels[tipo]}</h2>
            <Swiper
              modules={[Autoplay]}
              slidesPerView={5}
              spaceBetween={20}
              pagination={{ clickable: true }}
              autoplay={{ delay: 3500, disableOnInteraction: false }}
              loop={group.length > 5}
              breakpoints={{
                320: { slidesPerView: 1, spaceBetween: 10 },
                640: { slidesPerView: 2, spaceBetween: 15 },
                768: { slidesPerView: 3, spaceBetween: 15 },
                1024: { slidesPerView: 4, spaceBetween: 20 },
                1280: { slidesPerView: 5, spaceBetween: 20 },
              }}
              className="w-full"
            >
              {group.map((item) => (
                <SwiperSlide key={item.vehicle.id} className="h-auto flex">
                  <div className="w-full max-w-[360px] mx-auto">
                    <VehicleCard 
                      vehicle={item.vehicle} 
                      seller={item.seller}
                      onClick={(id) => window.location.href = `/vehiculo/${id}`}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        );
      })}
    </section>
  );
};

export default FeaturedVehiclesSlider;







