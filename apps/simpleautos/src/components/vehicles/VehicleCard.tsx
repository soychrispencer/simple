import React, { useState, useRef, useEffect, useMemo, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { incrementVehicleMetric } from '@/lib/metrics';
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useCompare } from "@/context/CompareContext";
import { UserAvatar, Button, CircleButton, ContactModal, useToast, useDisplayCurrency } from '@simple/ui';
import { Vehicle } from "@/types/vehicle";
import { IconChevronLeft, IconChevronRight, IconMapPin, IconGauge, IconEngine, IconManualGearbox, IconDots, IconBookmark, IconBookmarkFilled, IconShare2, IconScale, IconCar, IconMotorbike, IconTruck, IconBus, IconMail, IconFlag, IconLink, IconExternalLink } from '@tabler/icons-react';
import { toSpanish, conditionMap, capitalize, fuelTypeMap, transmissionMap } from '@/lib/vehicleTranslations';
import { formatPrice } from '@/lib/format';
import { convertFromClp } from '@/lib/displayCurrency';
import { useSupabase } from "@/lib/supabase/useSupabase";
import { getAvatarUrl } from "@/lib/supabaseStorage";


interface Seller {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  email?: string;
  phone?: string;
}

export interface VehicleCardProps {
  vehicle: Vehicle;
  seller?: Seller;
  className?: string;
  layout?: 'vertical' | 'horizontal';
  preview?: boolean;
  onClick?: (id: string) => void;
  onToggleFavorite?: (vehicle: Vehicle, favorite: boolean) => void;
  onShare?: (vehicle: Vehicle) => void;
  onCompare?: (vehicle: Vehicle) => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ 
  vehicle, 
  seller, 
  className = "", 
  layout = 'vertical',
  preview = false,
  onClick, 
  onToggleFavorite, 
  onShare, 
  onCompare 
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = useSupabase();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { toggle: toggleCompare } = useCompare();
  const { addToast } = useToast();
  const [index, setIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const total = vehicle.image_urls?.length || 0;
  const go = (dir: number) => {
    setIndex(i => (i + dir + total) % total);
  };

  const sellerId = seller?.id;
  const sellerAvatar = seller?.avatar;
  const userId = user?.id;
  const userAvatarUrl = (user as any)?.avatar_url as string | undefined;

  const sellerAvatarSrc = useMemo(() => {
    const raw = sellerAvatar || (sellerId === userId ? userAvatarUrl : undefined);
    if (!raw) return undefined;
    if (typeof raw === 'string' && raw.startsWith('http')) return raw;
    if (!supabase) return undefined;
    return getAvatarUrl(supabase as any, String(raw));
  }, [sellerAvatar, sellerId, userId, userAvatarUrl, supabase]);
  
  const navigate = () => { 
    if (preview) return;
    if (!menuOpen && !contactModalOpen && onClick) { 
      incrementVehicleMetric(vehicle.id, 'clicks'); 
      onClick(vehicle.id); 
    } 
  };

  // Cierre al hacer clic fuera
  useEffect(() => {
    if (preview) return;
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen, preview]);

  // Métrica de vista: una sola vez cuando entra al viewport
  useEffect(() => {
    if (preview) return;
    const el = cardRef.current;
    if (!el) return;
    let seen = false;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!seen && entry.isIntersecting) {
          seen = true;
          incrementVehicleMetric(vehicle.id, 'views');
          obs.disconnect();
        }
      });
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => { obs.disconnect(); };
  }, [vehicle.id, preview]);

  const estadoCanon = (
    vehicle.extra_specs?.estado ??
    vehicle.extra_specs?.condition ??
    (vehicle as any).estado ??
    vehicle.condition ??
    (vehicle as any).state ??
    vehicle.extra_specs?.state ??
    null
  );

  const estadoLabel = estadoCanon ? capitalize(toSpanish(conditionMap, estadoCanon) ?? String(estadoCanon)) : '-';

  const favorite = isFavorite(vehicle.id);

  const getShareUrl = () => {
    if (typeof window === 'undefined') return `/vehiculo/${vehicle.id}`;
    return `${window.location.origin}/vehiculo/${vehicle.id}`;
  };

  const defaultShare = async () => {
    const url = getShareUrl();
    const title = vehicle.title || 'Vehículo';
    const text = title;

    // Preferir share sheet nativo si está disponible.
    const navAny = navigator as any;
    if (typeof navAny?.share === 'function') {
      try {
        await navAny.share({ title, text, url });
        return;
      } catch {
        // Si el usuario cancela o falla, seguimos al fallback.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      addToast('Enlace copiado al portapapeles', { type: 'success' });
    } catch {
      addToast('No se pudo copiar el enlace.', { type: 'error' });
    }
  };

  const toggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !favorite;
    if (onToggleFavorite) onToggleFavorite(vehicle, next);
    void toggleFavorite(vehicle.id);
  };

  const toggleMenu = (e: React.MouseEvent) => { e.stopPropagation(); setMenuOpen(o=>!o); };

  const goToVehicle = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    if (preview) return;
    incrementVehicleMetric(vehicle.id, 'clicks');
    router.push(url);
    setMenuOpen(false);
  };

  const actView = (e: React.MouseEvent) => goToVehicle(e, `/vehiculo/${vehicle.id}`);

  const actCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(getShareUrl());
      addToast('Enlace copiado al portapapeles', { type: 'success' });
    } catch {
      addToast('No se pudo copiar el enlace.', { type: 'error' });
    } finally {
      setMenuOpen(false);
    }
  };

  const actReport = (e: React.MouseEvent) => goToVehicle(e, `/vehiculo/${vehicle.id}?report=1`);

  const actShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShare) onShare(vehicle);
    else void defaultShare();
    setMenuOpen(false);
  };
  const actCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCompare) onCompare(vehicle);
    else toggleCompare(vehicle.id);
    setMenuOpen(false);
  };
  const actFavFromMenu = (e: React.MouseEvent) => { toggleFav(e); setMenuOpen(false); };
  
  const { currency: displayCurrency } = useDisplayCurrency();
  const listingType = vehicle.listing_type || vehicle.listing_kind;
  const currencyCode = displayCurrency;

  const formatDisplayPrice = (value: number | null | undefined) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return formatPrice(value, { currency: currencyCode });
    return formatPrice(convertFromClp(value, currencyCode), { currency: currencyCode });
  };

  const discountInfo = (() => {
    const lt = listingType as any;
    const base = (() => {
      if (lt === 'sale') return vehicle.price;
      if (lt === 'auction') return (vehicle as any).auction_start_price ?? vehicle.price;
      if (lt === 'rent') {
        const rentPeriod = (vehicle as any).rent_price_period || vehicle.extra_specs?.rent_price_period;
        const rentDaily = (vehicle as any).rent_daily_price ?? (vehicle.extra_specs as any)?.rent_daily_price;
        const rentWeekly = (vehicle as any).rent_weekly_price ?? (vehicle.extra_specs as any)?.rent_weekly_price;
        const rentMonthly = (vehicle as any).rent_monthly_price ?? (vehicle.extra_specs as any)?.rent_monthly_price;

        if (rentPeriod === 'daily' && typeof rentDaily === 'number') return rentDaily;
        if (rentPeriod === 'weekly' && typeof rentWeekly === 'number') return rentWeekly;
        if (rentPeriod === 'monthly' && typeof rentMonthly === 'number') return rentMonthly;
        if (typeof rentDaily === 'number') return rentDaily;
        if (typeof rentWeekly === 'number') return rentWeekly;
        if (typeof rentMonthly === 'number') return rentMonthly;
      }
      return null;
    })();
    if (typeof base !== 'number') return null;

    const advanced =
      ((vehicle as any)?.metadata?.advanced_conditions ??
        (vehicle.extra_specs as any)?.advanced_conditions ??
        (vehicle.extra_specs as any)?.legacy?.advanced_conditions ??
        null) as any;
    const discountItems = advanced?.discounts && Array.isArray(advanced.discounts) ? (advanced.discounts as any[]) : [];
    if (discountItems.length === 0) return null;

    const percentSum = discountItems
      .filter((d: any) => String(d?.type || '') === 'percentage' && typeof d?.value === 'number')
      .reduce((acc: number, d: any) => acc + Number(d.value), 0);
    const fixedSum = discountItems
      .filter((d: any) => String(d?.type || '') === 'fixed_amount' && typeof d?.value === 'number')
      .reduce((acc: number, d: any) => acc + Number(d.value), 0);

    const clampedPercent = Math.max(0, Math.min(100, percentSum));
    const afterPercent = Math.round(base * (1 - clampedPercent / 100));
    const finalPrice = Math.max(0, afterPercent - fixedSum);
    const savings = base - finalPrice;
    if (!(savings > 0)) return null;

    const badgeText =
      clampedPercent > 0
        ? `-${clampedPercent.toLocaleString('es-CL')}%`
        : fixedSum > 0
        ? `-${formatDisplayPrice(fixedSum)}`
        : 'Oferta';

    return {
      base,
      finalPrice,
      badgeText,
    };
  })();

  const badgeLabel = useMemo(() => {
    if ((listingType as any) === 'sale') return 'Venta';
    if ((listingType as any) === 'rent') return 'Arriendo';
    if ((listingType as any) === 'auction') return 'Subasta';
    return 'Venta'; // fallback
  }, [listingType]);

  const badgeColor = 'bg-[var(--color-primary-a10)] text-[var(--color-primary)]';

  const renderSliderNav = () => {
    if (total <= 1) return null;
    return (
      <>
        <button
          onClick={(e) => { e.stopPropagation(); go(-1); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-lightbg dark:bg-darkbg border border-black/10 dark:border-white/10 shadow-card hover:bg-[var(--field-bg-hover)] transition flex items-center justify-center touch-manipulation"
          aria-label="Anterior"
        >
          <IconChevronLeft size={22} stroke={1.5} className="text-lighttext dark:text-darktext" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); go(1); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-lightbg dark:bg-darkbg border border-black/10 dark:border-white/10 shadow-card hover:bg-[var(--field-bg-hover)] transition flex items-center justify-center touch-manipulation"
          aria-label="Siguiente"
        >
          <IconChevronRight size={22} stroke={1.5} className="text-lighttext dark:text-darktext" />
        </button>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {vehicle.image_urls?.slice(0, 5).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 rounded-full shadow-card transition-all ${i === index ? 'bg-primary-500 w-7' : 'bg-border/80 w-2'}`}
            />
          ))}
        </div>
      </>
    );
  };

  const renderImages = (): ReactNode => {
    if (!vehicle.image_urls || vehicle.image_urls.length === 0) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-lighttext/70 dark:text-darktext/70 card-surface shadow-card">
          Sin imágenes
        </div>
      );
    }
    return vehicle.image_urls.slice(0,5).map((img, i) => (
      <img
        key={i}
        src={img}
        alt={vehicle.title}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i === index ? 'opacity-100' : 'opacity-0'}`}
        loading={i===0?'eager':'lazy'}
      />
    ));
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (preview) return;
    // Navegar al perfil público del vendedor usando username
    const handle = seller?.username || seller?.id;
    if (!handle) return;
    router.push(`/perfil/${handle}`);
  };

  // Layout Horizontal
  if (layout === 'horizontal') {
    return (
      <div
        ref={cardRef}
        className={`group relative card-surface rounded-2xl shadow-card hover:shadow-card transition ${preview ? 'cursor-default' : 'cursor-pointer'} ${className}`}
        onClick={preview ? undefined : navigate}
      >
        <div className="flex items-stretch gap-0">
          {/* Galería de imágenes con navegación */}
          <div className="relative w-64 flex-shrink-0 card-surface/90 shadow-card rounded-l-2xl overflow-hidden">
            <div className="relative w-full h-full aspect-[4/3] overflow-hidden">
              {renderImages()}

              {/* Controles de navegación de imágenes */}
              {total > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); go(-1); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-lightbg dark:bg-darkbg border border-black/10 dark:border-white/10 shadow-card hover:bg-[var(--field-bg-hover)] transition flex items-center justify-center z-20 touch-manipulation"
                    aria-label="Imagen anterior"
                  >
                    <IconChevronLeft size={22} className="text-lighttext dark:text-darktext" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); go(1); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-lightbg dark:bg-darkbg border border-black/10 dark:border-white/10 shadow-card hover:bg-[var(--field-bg-hover)] transition flex items-center justify-center z-20 touch-manipulation"
                    aria-label="Imagen siguiente"
                  >
                    <IconChevronRight size={22} className="text-lighttext dark:text-darktext" />
                  </button>

                  {/* Indicador de posición */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                    {vehicle.image_urls?.slice(0,5).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2.5 rounded-full shadow-card transition-all ${
                          i === index ? 'bg-primary-500 w-7' : 'bg-border/80 w-2'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Badge impulsado - Icono de rayo */}
              {(vehicle.visibility === 'featured' || vehicle.featured) && (
                <span className="absolute top-3 left-3 z-20 text-xl drop-shadow-md select-none text-[var(--color-warn)]">
                  {'\u26A1'}
                </span>
              )}

              {discountInfo ? (
                <span className="absolute top-3 right-3 z-20 text-[11px] font-semibold px-2.5 py-1.5 rounded-md border bg-primary text-black border-[var(--color-primary-a90)] shadow-card select-none">
                  {discountInfo.badgeText}
                </span>
              ) : null}
            </div>
          </div>

          {/* Contenido principal */}
          <div className="flex-1 flex flex-col p-4 min-w-0">
            {/* Header: Título y Precio */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2 text-lighttext dark:text-darktext">
                  {vehicle.title}
                </h3>

                {/* Badges de tipo publicación, condición y ubicación */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>{badgeLabel}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium card-surface shadow-card text-lighttext/80 dark:text-darktext/80">
                    {estadoLabel}
                  </span>
                  <span className="px-2 py-0.5 rounded-full card-surface shadow-card text-lighttext/80 dark:text-darktext/80 text-xs font-medium flex items-center gap-1 min-w-0">
                    <IconMapPin size={14} className="flex-shrink-0" />
                    <span className="truncate max-w-[100px]">
                      {(() => {
                        const commune = vehicle.extra_specs?.legacy?.commune_name || (vehicle as any).commune_name;
                        return commune || 'Sin ubicación';
                      })()}
                    </span>
                  </span>
                </div>
              </div>

              {/* Precio destacado */}
              <div className="text-right flex-shrink-0">
                {(() => {
                  const listingType = vehicle.listing_type || vehicle.listing_kind;

                  // Precio de arriendo
                  if (listingType === 'rent') {
                    const rentPeriod = (vehicle as any).rent_price_period || vehicle.extra_specs?.rent_price_period;
                    const rentDaily = (vehicle as any).rent_daily_price ?? vehicle.extra_specs?.rent_daily_price;
                    const rentWeekly = (vehicle as any).rent_weekly_price ?? vehicle.extra_specs?.rent_weekly_price;
                    const rentMonthly = (vehicle as any).rent_monthly_price ?? vehicle.extra_specs?.rent_monthly_price;

                    const rentInfo = (() => {
                      if (rentPeriod === 'daily') return { amount: rentDaily, label: 'por día' };
                      if (rentPeriod === 'weekly') return { amount: rentWeekly, label: 'por semana' };
                      if (rentPeriod === 'monthly') return { amount: rentMonthly, label: 'por mes' };
                      if (rentDaily != null) return { amount: rentDaily, label: 'por día' };
                      if (rentWeekly != null) return { amount: rentWeekly, label: 'por semana' };
                      if (rentMonthly != null) return { amount: rentMonthly, label: 'por mes' };
                      return null;
                    })();

                    if (rentInfo && rentInfo.amount != null) {
                      const discountedAmount = discountInfo ? discountInfo.finalPrice : rentInfo.amount;
                      return (
                          <div className="flex flex-col leading-tight items-end">
                            <span className="text-2xl font-bold text-lighttext dark:text-darktext whitespace-nowrap">
                              {formatDisplayPrice(discountedAmount)}
                            </span>
                            <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                              {discountInfo ? (
                                <span className="text-xs text-lighttext/70 dark:text-darktext/70 whitespace-nowrap line-through">
                                  {formatDisplayPrice(discountInfo.base)}
                                </span>
                              ) : null}
                              <span className="text-xs text-lighttext/70 dark:text-darktext/70">{rentInfo.label}</span>
                            </div>
                          </div>
                      );
                    }
                    return <span className="text-sm text-lighttext/70 dark:text-darktext/70">Consultar precio</span>;
                  }

                  // Precio de subasta
                  if (listingType === 'auction') {
                    const auctionStart = (vehicle as any).auction_start_price || vehicle.extra_specs?.auction_start_price;
                    if (auctionStart != null) {
                      const discountedAmount = discountInfo ? discountInfo.finalPrice : auctionStart;
                      return (
                        <div className="flex flex-col leading-tight items-end">
                          <span className="text-2xl font-bold text-lighttext dark:text-darktext whitespace-nowrap">
                            {formatDisplayPrice(discountedAmount)}
                          </span>
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            {discountInfo ? (
                              <span className="text-xs text-lighttext/70 dark:text-darktext/70 whitespace-nowrap line-through">
                                {formatDisplayPrice(discountInfo.base)}
                              </span>
                            ) : null}
                            <span className="text-xs text-lighttext/70 dark:text-darktext/70">precio base</span>
                          </div>
                        </div>
                      );
                    }
                  }

                  // Precio de venta normal
                  const base = vehicle.price;
                  if (base == null) return <span className="text-sm text-lighttext/70 dark:text-darktext/70">Consultar precio</span>;

                  if (discountInfo) {
                    return (
                      <div className="flex flex-col leading-tight">
                        <span className="text-2xl font-bold text-lighttext dark:text-darktext">{formatDisplayPrice(discountInfo.finalPrice)}</span>
                        <span className="text-xs text-lighttext/70 dark:text-darktext/70 whitespace-nowrap line-through">
                          {formatDisplayPrice(discountInfo.base)}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col leading-tight">
                      <span className="text-2xl font-bold text-lighttext dark:text-darktext">{formatDisplayPrice(base)}</span>
                      <span className="text-xs text-lighttext/70 dark:text-darktext/70">&nbsp;</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Especificaciones principales */}
              <div className="flex items-center justify-start gap-4 mb-3">
              {/* Tipo de vehículo */}
                <div className="flex items-center gap-2 text-sm text-lighttext/70 dark:text-darktext/70">
                  <div className="w-8 h-8 rounded-full card-surface shadow-card flex items-center justify-center flex-shrink-0">
                  {(() => {
                    const typeKey = vehicle.type_key || 'car';
                    if (typeKey === 'motorcycle') return <IconMotorbike size={16} stroke={1.5} />;
                    if (typeKey === 'truck') return <IconTruck size={16} stroke={1.5} />;
                    if (typeKey === 'bus') return <IconBus size={16} stroke={1.5} />;
                    return <IconCar size={16} stroke={1.5} />;
                  })()}
                </div>
                <span className="truncate">
                  {(() => {
                    const label = (vehicle as any).type_label;
                    if (label) return label;
                    const typeMap: Record<string, string> = {
                      car: 'Auto',
                      motorcycle: 'Moto',
                      truck: 'Camión',
                      bus: 'Bus',
                      machinery: 'Maquinaria',
                      aerial: 'Aéreo',
                      nautical: 'Náutico',
                      // Back-compat (datos antiguos)
                      industrial: 'Maquinaria',
                      commercial: 'Auto',
                    };
                    return typeMap[vehicle.type_key || 'car'] || 'Vehículo';
                  })()}
                </span>
              </div>
              {/* Kilometraje */}
                <div className="flex items-center gap-2 text-sm text-lighttext/70 dark:text-darktext/70">
                  <div className="w-8 h-8 rounded-full card-surface shadow-card flex items-center justify-center flex-shrink-0">
                  <IconGauge size={16} />
                </div>
                <span className="truncate">{((vehicle as any).mileage || vehicle.mileage_km || 0) >= 1000 ? `${Math.round(((vehicle as any).mileage || vehicle.mileage_km || 0) / 1000)}k km` : `${((vehicle as any).mileage || vehicle.mileage_km || 0)} km`}</span>
              </div>
              {/* Combustible */}
                <div className="flex items-center gap-2 text-sm text-lighttext/70 dark:text-darktext/70">
                  <div className="w-8 h-8 rounded-full card-surface shadow-card flex items-center justify-center flex-shrink-0">
                  <IconEngine size={16} />
                </div>
                <span className="truncate">{capitalize(toSpanish(fuelTypeMap, vehicle.extra_specs?.legacy?.fuel_legacy || vehicle.extra_specs?.fuel_type) ?? '-')}</span>
              </div>
              {/* Transmisión */}
                <div className="flex items-center gap-2 text-sm text-lighttext/70 dark:text-darktext/70">
                  <div className="w-8 h-8 rounded-full card-surface shadow-card flex items-center justify-center flex-shrink-0">
                  <IconManualGearbox size={16} />
                </div>
                <span className="truncate">{capitalize(toSpanish(transmissionMap, vehicle.extra_specs?.legacy?.transmission_legacy || vehicle.extra_specs?.transmission) ?? '-')}</span>
              </div>
            </div>
          </div>

          {!preview && (
            <>
              {/* Panel de acciones lateral */}
              <div className="relative flex flex-col items-center justify-center gap-2 p-4 border-l border-border/60 dark:border-darkborder/35 card-surface/80 rounded-r-2xl">
                <CircleButton
                  onClick={handleAvatarClick}
                  aria-label="Ver perfil del vendedor"
                  size={40}
                  variant="default"
                  className="relative z-30 flex-shrink-0"
                >
                  <UserAvatar
                    src={sellerAvatarSrc}
                    alt={seller?.nombre}
                    size={40}
                  />
                </CircleButton>
                <CircleButton
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setContactModalOpen(true); }}
                  aria-label="Contactar al vendedor"
                  size={40}
                  variant="default"
                  className="relative z-30 flex-shrink-0"
                >
                  <IconMail size={18} stroke={1.5} />
                </CircleButton>
                <CircleButton
                  type="button"
                  onClick={toggleMenu}
                  className="relative z-30 flex-shrink-0"
                  aria-label="Más opciones"
                  size={40}
                  variant="default"
                >
                  <IconDots size={18} stroke={1.5} />
                </CircleButton>
              </div>

              {/* Menú desplegable para layout horizontal */}
              {menuOpen && (
                <div className="absolute bottom-16 right-4 z-40 w-44 card-surface shadow-card rounded-xl py-2 animate-fadeIn">
                  <button onClick={actView} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                    <IconExternalLink size={16} stroke={1.5} /> Ver publicación
                  </button>
                  <button onClick={actFavFromMenu} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                    {favorite ? <IconBookmarkFilled size={16} stroke={1.5} /> : <IconBookmark size={16} stroke={1.5} />} {favorite ? 'Quitar de favoritos' : 'Favoritos'}
                  </button>
                  <button onClick={actShare} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                    <IconShare2 size={16} stroke={1.5} /> Compartir
                  </button>
                  <button onClick={actCopyLink} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                    <IconLink size={16} stroke={1.5} /> Copiar enlace
                  </button>
                  <button onClick={actCompare} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                    <IconScale size={16} stroke={1.5} /> Comparar
                  </button>
                  <button onClick={actReport} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                    <IconFlag size={16} stroke={1.5} /> Reportar publicación
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {!preview && (
          <ContactModal
            isOpen={contactModalOpen}
            onClose={() => setContactModalOpen(false)}
            contactName={seller?.nombre || 'Vendedor'}
            contextTitle={vehicle.title || 'Vehículo'}
            email={seller?.email}
            phone={seller?.phone}
            contextType="vehicle"
          />
        )}
      </div>
    );
  }

  return (
    <div 
      ref={cardRef} 
      className={`group relative card-surface rounded-3xl shadow-card hover:shadow-card transition overflow-hidden flex flex-col w-full ${preview ? 'cursor-default' : 'cursor-pointer'} ${className}`}
      onClick={preview ? undefined : navigate}
    >
      {/* Slider de imágenes - más compacto */}
      <div className="relative w-full aspect-[16/10] overflow-hidden card-surface/90 shadow-card">
        {renderImages()}
        {renderSliderNav()}
        <div className="absolute inset-0 bg-[var(--overlay-scrim-8)]" />
        
        {/* Badge impulsado - Icono de rayo */}
        {(vehicle.visibility === 'featured' || vehicle.featured) && (
          <span className="absolute top-2 left-2 z-30 text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" title="Publicación Impulsada">
            {'\u26A1'}
          </span>
        )}

        {discountInfo ? (
          <span className="absolute top-2 right-2 z-30 text-[11px] font-semibold px-2.5 py-1.5 rounded-md border bg-primary text-black border-[var(--color-primary-a90)] shadow-card select-none">
            {discountInfo.badgeText}
          </span>
        ) : null}
      </div>

      {/* Contenido - más compacto */}
      <div className="relative px-4 py-4 flex flex-col gap-2.5">
        {/* Título del vehículo */}
        <h3 className="font-bold text-lg leading-tight line-clamp-2 text-center min-h-[2.5rem]">
          {vehicle.title}
        </h3>

        {/* Precio - más compacto */}
        <div className="text-center min-h-[3rem] flex items-center justify-center">
          {(() => {
            const listingType = vehicle.listing_type || vehicle.listing_kind;

            // Precio de arriendo
            if (listingType === 'rent') {
              const rentPeriod = (vehicle as any).rent_price_period || vehicle.extra_specs?.rent_price_period;
              const rentDaily = (vehicle as any).rent_daily_price ?? vehicle.extra_specs?.rent_daily_price;
              const rentWeekly = (vehicle as any).rent_weekly_price ?? vehicle.extra_specs?.rent_weekly_price;
              const rentMonthly = (vehicle as any).rent_monthly_price ?? vehicle.extra_specs?.rent_monthly_price;

              const rentInfo = (() => {
                if (rentPeriod === 'daily') return { amount: rentDaily, label: 'por día' };
                if (rentPeriod === 'weekly') return { amount: rentWeekly, label: 'por semana' };
                if (rentPeriod === 'monthly') return { amount: rentMonthly, label: 'por mes' };
                      if (rentDaily != null) return { amount: rentDaily, label: 'por día' };
                if (rentWeekly != null) return { amount: rentWeekly, label: 'por semana' };
                if (rentMonthly != null) return { amount: rentMonthly, label: 'por mes' };
                return null;
              })();

              if (rentInfo && rentInfo.amount != null) {
                const discountedAmount = discountInfo ? discountInfo.finalPrice : rentInfo.amount;
                return (
                  <div className="flex flex-col items-center leading-tight">
                    <span className="text-2xl font-bold leading-tight whitespace-nowrap">{formatDisplayPrice(discountedAmount)}</span>
                    <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                      {discountInfo ? (
                        <span className="text-[10px] text-lighttext/60 dark:text-darktext/60 leading-tight whitespace-nowrap line-through">
                          {formatDisplayPrice(discountInfo.base)}
                        </span>
                      ) : null}
                      <span className="text-[10px] text-lighttext/60 dark:text-darktext/60 leading-tight">{rentInfo.label}</span>
                    </div>
                  </div>
                );
              }

              return <span className="text-xl text-lighttext/70 dark:text-darktext/70 leading-tight">Consultar precio</span>;
            }

            // Precio de subasta
            if (listingType === 'auction') {
              const auctionStart = (vehicle as any).auction_start_price || vehicle.extra_specs?.auction_start_price;
              if (auctionStart != null) {
                const discountedAmount = discountInfo ? discountInfo.finalPrice : auctionStart;
                return (
                  <div className="flex flex-col items-center leading-tight">
                    <span className="text-2xl font-bold leading-tight whitespace-nowrap">{formatDisplayPrice(discountedAmount)}</span>
                    <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                      {discountInfo ? (
                        <span className="text-[10px] text-lighttext/60 dark:text-darktext/60 leading-tight whitespace-nowrap line-through">
                          {formatDisplayPrice(discountInfo.base)}
                        </span>
                      ) : null}
                      <span className="text-[10px] text-lighttext/60 dark:text-darktext/60 leading-tight">precio base</span>
                    </div>
                  </div>
                );
              }
            }

            // Precio de venta normal
            const base = vehicle.price;
            if (base == null) return <span className="text-xl text-lighttext/70 dark:text-darktext/70 leading-tight">Consultar precio</span>;

            if (discountInfo) {
              return (
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold leading-tight">{formatDisplayPrice(discountInfo.finalPrice)}</span>
                  <span className="text-[10px] text-lighttext/60 dark:text-darktext/60 leading-tight whitespace-nowrap line-through">
                    {formatDisplayPrice(discountInfo.base)}
                  </span>
                </div>
              );
            }

            return (
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold leading-tight">{formatDisplayPrice(base)}</span>
                <span className="text-[10px] text-lighttext/60 dark:text-darktext/60 leading-tight">&nbsp;</span>
              </div>
            );
          })()}
        </div>

        {/* Badges y Ubicación: Tipo de publicación + Estado + Ubicación - más compactos */}
        <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar w-full">
          {/* Tipo de publicación */}
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${badgeColor}`}>
            {badgeLabel}
          </span>
          {/* Estado del vehículo */}
          <span className="px-2.5 py-1 rounded-full text-xs font-medium card-surface shadow-card text-lighttext/80 dark:text-darktext/80 whitespace-nowrap flex-shrink-0">
            {estadoLabel}
          </span>
          {/* Ubicación */}
          <span className="px-2.5 py-1 rounded-full text-xs font-medium card-surface shadow-card text-lighttext/80 dark:text-darktext/80 flex items-center gap-1 min-w-0 flex-shrink">
            <IconMapPin size={14} stroke={1.5} className="flex-shrink-0" />
            <span className="truncate max-w-[100px]">
                      {(() => {
                        const commune = vehicle.extra_specs?.legacy?.commune_name || (vehicle as any).commune_name;
                        return commune || 'Sin ubicación';
                      })()}
            </span>
          </span>
        </div>

        {/* Especificaciones en fila horizontal */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs border-t border-border/60 dark:border-darkborder/35 pt-2.5">
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full card-surface shadow-card flex items-center justify-center flex-shrink-0">
              {(() => {
                const typeKey = vehicle.type_key || 'car';
                if (typeKey === 'motorcycle') return <IconMotorbike size={16} stroke={1.5} />;
                if (typeKey === 'truck') return <IconTruck size={16} stroke={1.5} />;
                if (typeKey === 'bus') return <IconBus size={16} stroke={1.5} />;
                return <IconCar size={16} stroke={1.5} />;
              })()}
            </div>
                  <span className="text-center leading-tight">
              {(() => {
                const label = (vehicle as any).type_label;
                if (label) return label;
                const typeMap: Record<string, string> = { 
                  car: 'Auto', 
                  motorcycle: 'Moto', 
                  truck: 'Camión', 
                  bus: 'Bus', 
                  machinery: 'Maquinaria',
                  aerial: 'Aéreo',
                  nautical: 'Náutico',
                  // Back-compat (datos antiguos)
                  industrial: 'Maquinaria',
                  commercial: 'Auto',
                };
                return typeMap[vehicle.type_key || 'car'] || 'Vehículo';
              })()}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full card-surface shadow-card flex items-center justify-center flex-shrink-0">
              <IconGauge size={16} stroke={1.5} />
            </div>
            <span className="text-center leading-tight">{((vehicle as any).mileage || vehicle.mileage_km || 0) >= 1000 ? `${Math.round(((vehicle as any).mileage || vehicle.mileage_km || 0) / 1000)}k km` : `${((vehicle as any).mileage || vehicle.mileage_km || 0)} km`}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full card-surface shadow-card flex items-center justify-center flex-shrink-0">
              <IconEngine size={16} stroke={1.5} />
            </div>
            <span className="text-center leading-tight">{capitalize(toSpanish(fuelTypeMap, vehicle.extra_specs?.legacy?.fuel_legacy || vehicle.extra_specs?.fuel_type) || '-')}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full card-surface shadow-card flex items-center justify-center flex-shrink-0">
              <IconManualGearbox size={16} stroke={1.5} />
            </div>
            <span className="text-center leading-tight">{capitalize(toSpanish(transmissionMap, vehicle.extra_specs?.legacy?.transmission_legacy || vehicle.extra_specs?.transmission) || '-')}</span>
          </div>
        </div>

        {!preview && (
          <>
            {/* Botones de acción - usando componentes Button y CircleButton */}
            <div className="flex items-center gap-2 pt-2">
              <CircleButton 
                onClick={handleAvatarClick}
                aria-label="Ver perfil del vendedor" 
                size={40} 
                variant="default" 
                className="relative z-30 flex-shrink-0"
              >
                <UserAvatar
                  src={sellerAvatarSrc}
                  alt={seller?.nombre}
                  size={40}
                />
              </CircleButton>
              <Button 
                type="button" 
                onClick={(e)=>{e.stopPropagation(); setContactModalOpen(true);}} 
                className="relative z-30 flex-1" 
                variant="primary" 
                size="md" 
              >
                Contactar
              </Button>
              <CircleButton 
                type="button" 
                onClick={toggleMenu} 
                className="relative z-30 flex-shrink-0" 
                aria-label="Más opciones" 
                size={40}
                variant="default"
              >
                <IconDots size={18} stroke={1.5} />
              </CircleButton>
            </div>

            {/* Menú desplegable */}
            {menuOpen && (
              <div className="absolute bottom-16 right-4 z-40 w-44 card-surface shadow-card rounded-xl py-2 animate-fadeIn">
                <button onClick={actView} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                  <IconExternalLink size={16} stroke={1.5} /> Ver publicación
                </button>
                <button onClick={actFavFromMenu} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                  {favorite ? <IconBookmarkFilled size={16} stroke={1.5} /> : <IconBookmark size={16} stroke={1.5} />} {favorite ? 'Quitar de favoritos' : 'Favoritos'}
                </button>
                <button onClick={actShare} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                  <IconShare2 size={16} stroke={1.5} /> Compartir
                </button>
                <button onClick={actCopyLink} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                  <IconLink size={16} stroke={1.5} /> Copiar enlace
                </button>
                <button onClick={actCompare} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                  <IconScale size={16} stroke={1.5} /> Comparar
                </button>
                <button onClick={actReport} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                  <IconFlag size={16} stroke={1.5} /> Reportar publicación
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {!preview && (
        <ContactModal
          isOpen={contactModalOpen}
          onClose={() => setContactModalOpen(false)}
          contactName={seller?.nombre || 'Vendedor'}
          contextTitle={vehicle.title || 'Vehículo'}
          email={seller?.email}
          phone={seller?.phone}
          contextType="vehicle"
        />
      )}
    </div>
  );
};

export default VehicleCard;







