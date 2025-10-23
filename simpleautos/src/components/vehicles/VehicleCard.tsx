import React, { useState, useRef, useEffect, useMemo, ReactNode } from "react";
import { incrementVehicleMetric } from '@/lib/metrics';
import { useAuth } from "@/context/AuthContext";
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/Button';
import { CircleButton } from '@/components/ui/CircleButton';
import { Vehicle } from "@/types/vehicle";
import { IconChevronLeft, IconChevronRight, IconMapPin, IconGauge, IconEngine, IconManualGearbox, IconDots, IconHeart, IconShare2, IconScale, IconBolt, IconCar, IconMotorbike, IconTruck, IconBus, IconMail } from '@tabler/icons-react';
import { toSpanish, conditionMap, capitalize, fuelTypeMap, transmissionMap } from '@/lib/vehicleTranslations';
import ContactModal from '../ui/modal/ContactModal';


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
  onClick, 
  onToggleFavorite, 
  onShare, 
  onCompare 
}) => {
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const total = vehicle.image_urls?.length || 0;
  
  const go = (dir: number) => {
    setIndex(i => (i + dir + total) % total);
  };
  
  const navigate = () => { 
    if (!menuOpen && !contactModalOpen && onClick) { 
      incrementVehicleMetric(vehicle.id, 'clicks'); 
      onClick(vehicle.id); 
    } 
  };

  // Cierre al hacer clic fuera
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Métrica de vista: una sola vez cuando entra al viewport
  useEffect(() => {
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
  }, [vehicle.id]);

  const estadoCanon = (
    vehicle.extra_specs?.estado ??
    vehicle.extra_specs?.condition ??
    (vehicle as any).estado ??
    vehicle.condition ??
    (vehicle as any).state ??
    vehicle.extra_specs?.state ??
    null
  );

  const estadoLabel = estadoCanon ? capitalize(toSpanish(conditionMap, estadoCanon) ?? String(estadoCanon)) : '—';

  const toggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorite(f => { 
      const next = !f; 
      if (onToggleFavorite) {
        onToggleFavorite(vehicle, next);
      }
      return next; 
    });
  };

  const toggleMenu = (e: React.MouseEvent) => { e.stopPropagation(); setMenuOpen(o=>!o); };
  const actShare = (e: React.MouseEvent) => { e.stopPropagation(); if (onShare) onShare(vehicle); setMenuOpen(false); };
  const actCompare = (e: React.MouseEvent) => { e.stopPropagation(); if (onCompare) onCompare(vehicle); setMenuOpen(false); };
  const actFavFromMenu = (e: React.MouseEvent) => { toggleFav(e); setMenuOpen(false); };
  
  const listingType = vehicle.listing_type || vehicle.listing_kind;

  const badgeLabel = useMemo(() => {
    if ((listingType as any) === 'sale') return 'Venta';
    if ((listingType as any) === 'rent') return 'Arriendo';
    if ((listingType as any) === 'auction') return 'Subasta';
    return 'Venta'; // fallback
  }, [listingType]);

  const badgeColor = useMemo(() => {
    switch(listingType as any) {
      case 'sale': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'rent': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case 'auction': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    }
  }, [listingType]);

  const renderSliderNav = (): ReactNode => {
    if (total <= 1) return null;
    return (
      <>
        <button
          type="button"
          onClick={(e)=>{e.stopPropagation(); go(-1);}}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-md hover:bg-white dark:hover:bg-gray-700 transition flex items-center justify-center"
          aria-label="Anterior"
        >
          <IconChevronLeft size={20} stroke={1.5} className="text-gray-700 dark:text-gray-200" />
        </button>
        <button
          type="button"
          onClick={(e)=>{e.stopPropagation(); go(1);}}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-md hover:bg-white dark:hover:bg-gray-700 transition flex items-center justify-center"
          aria-label="Siguiente"
        >
          <IconChevronRight size={20} stroke={1.5} className="text-gray-700 dark:text-gray-200" />
        </button>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
          {vehicle.image_urls?.slice(0,5).map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i===index ? 'bg-white w-6' : 'bg-white/60 w-1.5'}`} />
          ))}
        </div>
      </>
    );
  };

  const renderImages = (): ReactNode => {
    if (!vehicle.image_urls || vehicle.image_urls.length === 0) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-gray-800">
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
    // Navegar al perfil público del vendedor usando username
    if (seller?.username) {
      window.location.href = `/perfil/${seller.username}`;
    } else if (seller?.id) {
      // Fallback a id si no hay username
      window.location.href = `/perfil/${seller.id}`;
    }
  };

  // Layout Horizontal
  if (layout === 'horizontal') {
    return (
      <div
        ref={cardRef}
        className={`group relative bg-lightcard dark:bg-darkcard rounded-2xl shadow-card hover:shadow-card-hover transition ring-1 ring-black/5 dark:ring-white/5 cursor-pointer ${className}`}
        onClick={navigate}
      >
        <div className="flex items-stretch gap-0">
          {/* Galería de imágenes con navegación */}
          <div className="relative w-64 flex-shrink-0 bg-lightbg dark:bg-darkbg rounded-l-2xl overflow-hidden">
            <div className="relative w-full h-full aspect-[4/3] overflow-hidden">
              {renderImages()}

              {/* Controles de navegación de imágenes */}
              {total > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); go(-1); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-md hover:bg-white dark:hover:bg-gray-700 transition flex items-center justify-center z-20"
                    aria-label="Imagen anterior"
                  >
                    <IconChevronLeft size={20} className="text-gray-700 dark:text-gray-200" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); go(1); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-md hover:bg-white dark:hover:bg-gray-700 transition flex items-center justify-center z-20"
                    aria-label="Imagen siguiente"
                  >
                    <IconChevronRight size={20} className="text-gray-700 dark:text-gray-200" />
                  </button>

                  {/* Indicador de posición */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
                    {vehicle.image_urls?.slice(0,5).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full transition ${
                          i === index ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Badge impulsado - Icono de rayo */}
              {(vehicle.visibility === 'featured' || vehicle.featured) && (
                <span className="absolute top-3 left-3 z-20 text-2xl drop-shadow-lg select-none" style={{color: '#FFB300'}}>
                  {'\u26A1'}
                </span>
              )}
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
                  <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs font-medium">
                    {estadoLabel}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-xs font-medium flex items-center gap-1 min-w-0">
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
                      return (
                        <div className="flex flex-col leading-tight">
                          <span className="text-2xl font-bold text-lighttext dark:text-darktext">${rentInfo.amount.toLocaleString('es-CL')}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{rentInfo.label}</span>
                        </div>
                      );
                    }
                    return <span className="text-sm text-gray-400">Consultar precio</span>;
                  }

                  // Precio de subasta
                  if (listingType === 'auction') {
                    const auctionStart = (vehicle as any).auction_start_price || vehicle.extra_specs?.auction_start_price;
                    if (auctionStart != null) {
                      return (
                        <div className="flex flex-col leading-tight">
                          <span className="text-2xl font-bold text-lighttext dark:text-darktext">${auctionStart.toLocaleString('es-CL')}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">precio base</span>
                        </div>
                      );
                    }
                  }

                  // Precio de venta normal
                  const base = vehicle.price;
                  const offer = (vehicle as any).offer_price || vehicle.extra_specs?.offer_price;
                  const discountPercent = (vehicle as any).discount_percent ?? vehicle.extra_specs?.discount_percent;
                  if (offer && base && offer < base) {
                    const pct = discountPercent != null ? Math.floor(discountPercent) : Math.floor(((base - offer) / base) * 100);
                    return (
                      <div className="flex flex-col leading-tight">
                        <span className="text-2xl font-bold text-lighttext dark:text-darktext">${offer.toLocaleString('es-CL')}</span>
                        <span className="text-xs text-red-500">-{pct}%</span>
                      </div>
                    );
                  }
                  return <span className="text-2xl font-bold text-lighttext dark:text-darktext">${base?.toLocaleString('es-CL')}</span>;
                })()}
              </div>
            </div>

            {/* Especificaciones principales */}
            <div className="flex items-center justify-start gap-4 mb-3">
              {/* Tipo de vehículo */}
              <div className="flex items-center gap-2 text-sm text-lighttext/70 dark:text-darktext/70">
                <div className="w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg flex items-center justify-center flex-shrink-0">
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
                      industrial: 'Industrial',
                      commercial: 'Comercial'
                    };
                    return typeMap[vehicle.type_key || 'car'] || 'Vehículo';
                  })()}
                </span>
              </div>
              {/* Kilometraje */}
              <div className="flex items-center gap-2 text-sm text-lighttext/70 dark:text-darktext/70">
                <div className="w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg flex items-center justify-center flex-shrink-0">
                  <IconGauge size={16} />
                </div>
                <span className="truncate">{((vehicle as any).mileage || vehicle.mileage_km || 0) >= 1000 ? `${Math.round(((vehicle as any).mileage || vehicle.mileage_km || 0) / 1000)}k km` : `${((vehicle as any).mileage || vehicle.mileage_km || 0)} km`}</span>
              </div>
              {/* Combustible */}
              <div className="flex items-center gap-2 text-sm text-lighttext/70 dark:text-darktext/70">
                <div className="w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg flex items-center justify-center flex-shrink-0">
                  <IconEngine size={16} />
                </div>
                <span className="truncate">{capitalize(toSpanish(fuelTypeMap, vehicle.extra_specs?.legacy?.fuel_legacy || vehicle.extra_specs?.fuel_type) || '—')}</span>
              </div>
              {/* Transmisión */}
              <div className="flex items-center gap-2 text-sm text-lighttext/70 dark:text-darktext/70">
                <div className="w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg flex items-center justify-center flex-shrink-0">
                  <IconManualGearbox size={16} />
                </div>
                <span className="truncate">{capitalize(toSpanish(transmissionMap, vehicle.extra_specs?.legacy?.transmission_legacy || vehicle.extra_specs?.transmission) || '—')}</span>
              </div>
            </div>
          </div>

          {/* Panel de acciones lateral */}
          <div className="relative flex flex-col items-center justify-center gap-2 p-4 border-l border-lightborder/10 dark:border-darkborder/10 bg-lightbg/30 dark:bg-darkbg/30 rounded-r-2xl">
            <CircleButton
              onClick={handleAvatarClick}
              aria-label="Ver perfil del vendedor"
              size={40}
              variant="default"
              className="relative z-30 flex-shrink-0"
            >
              <UserAvatar
                path={seller?.avatar || (seller?.id === user?.id ? (user as any)?.avatar_url : undefined)}
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
            <div className="absolute bottom-16 right-4 z-40 w-44 bg-lightcard dark:bg-darkcard border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl py-2 animate-fadeIn">
              <button onClick={actFavFromMenu} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                <IconHeart size={16} stroke={1.5} /> {favorite ? 'Quitar de favoritos' : 'Favoritos'}
              </button>
              <button onClick={actShare} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                <IconShare2 size={16} stroke={1.5} /> Compartir
              </button>
              <button onClick={actCompare} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                <IconScale size={16} stroke={1.5} /> Comparar
              </button>
            </div>
          )}
        </div>

        {/* Modal de contacto */}
        <ContactModal
          isOpen={contactModalOpen}
          onClose={() => setContactModalOpen(false)}
          contactName={seller?.nombre || 'Vendedor'}
          contextTitle={vehicle.title || 'Vehículo'}
          email={seller?.email}
          phone={seller?.phone}
          contextType="vehicle"
        />
      </div>
    );
  }

  return (
    <div 
      ref={cardRef} 
      className={`group relative bg-lightcard dark:bg-darkcard rounded-3xl shadow-card hover:shadow-card-hover transition ring-1 ring-black/5 dark:ring-white/5 overflow-hidden flex flex-col w-full cursor-pointer ${className}`}
      onClick={navigate}
    >
      {/* Slider de imágenes - más compacto */}
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-lightbg dark:bg-darkbg">
        {renderImages()}
        {renderSliderNav()}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/5" />
        
        {/* Badge impulsado - Icono de rayo */}
        {(vehicle.visibility === 'featured' || vehicle.featured) && (
          <span className="absolute top-2 left-2 z-30 text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" title="Publicación Impulsada">
            ⚡
          </span>
        )}
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
                return (
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold leading-tight">${rentInfo.amount.toLocaleString('es-CL')}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{rentInfo.label}</span>
                  </div>
                );
              }

              return <span className="text-xl text-gray-400 leading-tight">Consultar precio</span>;
            }

            // Precio de subasta
            if (listingType === 'auction') {
              const auctionStart = (vehicle as any).auction_start_price || vehicle.extra_specs?.auction_start_price;
              if (auctionStart != null) {
                return (
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold leading-tight">${auctionStart.toLocaleString('es-CL')}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">precio base</span>
                  </div>
                );
              }
            }

            // Precio de venta normal
            const base = vehicle.price;
            const offer = (vehicle as any).offer_price || vehicle.extra_specs?.offer_price;
            const discountPercent = (vehicle as any).discount_percent ?? vehicle.extra_specs?.discount_percent;
            if (offer && base && offer < base) {
              const pct = discountPercent != null ? Math.floor(discountPercent) : Math.floor(((base - offer) / base) * 100);
              return (
                <div className="flex flex-col items-center gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xl font-bold leading-tight">${offer.toLocaleString('es-CL')}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 leading-tight">-{pct}%</span>
                  </div>
                  <span className="line-through text-xs text-gray-400 leading-tight">${base.toLocaleString('es-CL')}</span>
                </div>
              );
            }
            return <span className="text-2xl font-bold leading-tight">${base?.toLocaleString('es-CL')}</span>;
          })()}
        </div>

        {/* Badges y Ubicación: Tipo de publicación + Estado + Ubicación - más compactos */}
        <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar w-full">
          {/* Tipo de publicación */}
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${badgeColor}`}>
            {badgeLabel}
          </span>
          {/* Estado del vehículo */}
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 whitespace-nowrap flex-shrink-0">
            {estadoLabel}
          </span>
          {/* Ubicación */}
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 flex items-center gap-1 min-w-0 flex-shrink">
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
        <div className="grid grid-cols-4 gap-2 text-center text-xs border-t border-gray-200 dark:border-gray-700 pt-2.5">
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg flex items-center justify-center flex-shrink-0">
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
                  industrial: 'Industrial', 
                  commercial: 'Comercial' 
                };
                return typeMap[vehicle.type_key || 'car'] || 'Vehículo';
              })()}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg flex items-center justify-center flex-shrink-0">
              <IconGauge size={16} stroke={1.5} />
            </div>
            <span className="text-center leading-tight">{((vehicle as any).mileage || vehicle.mileage_km || 0) >= 1000 ? `${Math.round(((vehicle as any).mileage || vehicle.mileage_km || 0) / 1000)}k km` : `${((vehicle as any).mileage || vehicle.mileage_km || 0)} km`}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg flex items-center justify-center flex-shrink-0">
              <IconEngine size={16} stroke={1.5} />
            </div>
            <span className="text-center leading-tight">{capitalize(toSpanish(fuelTypeMap, vehicle.extra_specs?.legacy?.fuel_legacy || vehicle.extra_specs?.fuel_type) || '—')}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg flex items-center justify-center flex-shrink-0">
              <IconManualGearbox size={16} stroke={1.5} />
            </div>
            <span className="text-center leading-tight">{capitalize(toSpanish(transmissionMap, vehicle.extra_specs?.legacy?.transmission_legacy || vehicle.extra_specs?.transmission) || '—')}</span>
          </div>
        </div>

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
              path={seller?.avatar || (seller?.id === user?.id ? (user as any)?.avatar_url : undefined)}
              alt={seller?.nombre}
              size={40}
            />
          </CircleButton>
          <Button 
            type="button" 
            onClick={(e)=>{e.stopPropagation(); setContactModalOpen(true);}} 
            className="relative z-30 flex-1" 
            variant="neutral" 
            size="md" 
            shape="pill"
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
          <div className="absolute bottom-16 right-4 z-40 w-44 bg-lightcard dark:bg-darkcard border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl py-2 animate-fadeIn">
            <button onClick={actFavFromMenu} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
              <IconHeart size={16} stroke={1.5} /> {favorite ? 'Quitar de favoritos' : 'Favoritos'}
            </button>
            <button onClick={actShare} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
              <IconShare2 size={16} stroke={1.5} /> Compartir
            </button>
            <button onClick={actCompare} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
              <IconScale size={16} stroke={1.5} /> Comparar
            </button>
          </div>
        )}
      </div>

      {/* Modal de contacto */}
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        contactName={seller?.nombre || 'Vendedor'}
        contextTitle={vehicle.title || 'Vehículo'}
        email={seller?.email}
        phone={seller?.phone}
        contextType="vehicle"
      />
    </div>
  );
};

export default VehicleCard;
