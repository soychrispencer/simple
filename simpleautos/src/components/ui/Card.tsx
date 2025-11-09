import React, { useState, useRef, useEffect, useMemo, ReactNode } from "react";
import { incrementVehicleMetric } from '@/lib/metrics';
import { useAuth } from "@/context/AuthContext";
import { UserAvatar } from './UserAvatar';
import { Button } from '@/components/ui/Button';
import { CircleButton } from '@/components/ui/CircleButton';
import { Vehicle } from "@/types/vehicle";
import { IconChevronLeft, IconChevronRight, IconMapPin, IconGauge, IconEngine, IconManualGearbox, IconDots, IconHeart, IconShare2, IconScale } from '@tabler/icons-react';
import { toSpanish, conditionMap } from '@/lib/vehicleTranslations';

interface Seller {
  id: string;
  nombre: string;
  avatar?: string;
}

interface CardProps {
  vehicle: Vehicle;
  seller?: Seller; // datos mínimos del vendedor
  className?: string;
  onNavigate?: (id: string) => void;
  onContact?: (vehicle: Vehicle) => void;
  onToggleFavorite?: (vehicle: Vehicle, favorite: boolean) => void;
  onShare?: (vehicle: Vehicle) => void;
  onCompare?: (vehicle: Vehicle) => void;
}

export const Card = ({ vehicle, seller, className = "", onNavigate, onContact, onToggleFavorite, onShare, onCompare }: CardProps) => {
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const total = vehicle.image_urls.length;
  const go = (dir: number) => {
    setIndex(i => (i + dir + total) % total);
  };
  const navigate = () => { if (!menuOpen && onNavigate) { incrementVehicleMetric(vehicle.id, 'clicks'); onNavigate(vehicle.id); } };
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

  const estadoLabel = estadoCanon ? (toSpanish(conditionMap, estadoCanon) ?? String(estadoCanon)) : '—';

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
  
  const badgeLabel = useMemo(() => {
    if (vehicle.listing_kind === 'sale') return 'Venta';
    if (vehicle.listing_kind === 'rent') return 'Arriendo';
    return 'Subasta';
  }, [vehicle.listing_kind]);

  const renderSliderNav = (): ReactNode => {
    if (total <= 1) return null;
    return (
      <>
        <CircleButton
          type="button"
          onClick={(e)=>{e.stopPropagation(); go(-1);}}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 backdrop-blur bg-lightcard/80 dark:bg-darkcard/70 transform-none"
          aria-label="Anterior"
        >
          <IconChevronLeft size={18} />
        </CircleButton>
        <CircleButton
          type="button"
          onClick={(e)=>{e.stopPropagation(); go(1);}}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 backdrop-blur bg-lightcard/80 dark:bg-darkcard/70 transform-none"
          aria-label="Siguiente"
        >
          <IconChevronRight size={18} />
        </CircleButton>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
          {vehicle.image_urls.slice(0,5).map((_, i) => (
            <span key={i} className={`w-2 h-2 rounded-full ${i===index ? 'bg-primary' : 'bg-lightcard/60 dark:bg-darkcard/30'}`} />
          ))}
        </div>
      </>
    );
  };

  const renderImages = (): ReactNode => {
    if (!vehicle.image_urls || vehicle.image_urls.length === 0) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-gray-500 dark:text-gray-300 z-0">
          Sin imágenes
          <pre className="text-xs text-left max-w-xs whitespace-pre-wrap break-all mt-2 bg-lightcard/80 dark:bg-darkcard/80 p-2 rounded">
            {JSON.stringify(vehicle.image_urls)}
          </pre>
        </div>
      );
    }
    return vehicle.image_urls.slice(0,5).map((img, i) => (
      <img
        key={i}
        src={img}
        alt={vehicle.title}
        className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500 ${i === index ? 'opacity-100' : 'opacity-0'} ${i===index ? 'animate-[fadeIn_0.5s_ease] scale-100 group-hover:scale-[1.04] transition-transform duration-[900ms]' : ''}`}
        loading={i===0?'eager':'lazy'}
      />
    ));
  };
  // (Sin expresiones aisladas que requieran desactivar reglas)
  return (
    <div ref={cardRef} className={`group relative bg-white dark:bg-darkcard rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col w-full max-w-[400px] ${className}`}>
      {/* Área clicable superpuesta (excepto zonas interactivas) */}
      <button onClick={navigate} className="absolute inset-0 z-10 cursor-pointer bg-transparent appearance-none border-0 p-0 m-0 focus:outline-none" aria-label="Ver detalle" />
      
      {/* Slider de imágenes */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-darkcard">
        {renderImages()}
        {renderSliderNav()}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/10" />
      </div>

      {/* Contenido */}
      <div className="relative z-20 px-6 py-6 flex flex-col gap-4">
        {/* Título del vehículo */}
        <h3 className="font-bold text-2xl leading-tight line-clamp-2 text-center">
          {vehicle.title}
        </h3>

        {/* Precio */}
        <div className="text-center">
          {(() => {
            const listingType = vehicle.listing_type || vehicle.listing_kind;

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
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-4xl font-bold">${rentInfo.amount.toLocaleString('es-CL')}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{rentInfo.label}</span>
                  </div>
                );
              }

              return <span className="text-lg text-gray-400">Consultar precio</span>;
            }

            const base = vehicle.price;
            const offer = (vehicle as any).offer_price || vehicle.extra_specs?.offer_price;
            const discountPercent = (vehicle as any).discount_percent ?? vehicle.extra_specs?.discount_percent;
            if (offer && base && offer < base) {
              const pct = discountPercent != null ? Math.floor(discountPercent) : Math.floor(((base - offer) / base) * 100);
              return (
                <div className="flex flex-col items-center gap-1">
                  <span className="line-through text-lg text-gray-400">${base.toLocaleString('es-CL')}</span>
                  <span className="text-4xl font-bold">${offer.toLocaleString('es-CL')}</span>
                  <span className="text-sm px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">-{pct}%</span>
                </div>
              );
            }
            return <span className="text-4xl font-bold">${base?.toLocaleString('es-CL')}</span>;
          })()}
        </div>

        {/* Badges: Tipo y Condición */}
        <div className="flex items-center justify-center gap-3">
          <span className="px-4 py-2 rounded-full text-sm font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
            {badgeLabel}
          </span>
          <span className="px-4 py-2 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
            {estadoLabel}
          </span>
        </div>

        {/* Ubicación */}
        <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300">
          <IconMapPin size={20} />
          <span className="text-base">{vehicle.extra_specs?.legacy?.commune_name || 'Sin ubicación'}</span>
        </div>

        {/* Grid de especificaciones - 4 columnas */}
        <div className="grid grid-cols-4 gap-3 text-center text-sm border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <IconManualGearbox size={24} />
            </div>
            <span className="text-xs truncate max-w-full">Station...</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <IconGauge size={24} />
            </div>
            <span className="text-xs truncate max-w-full">{((vehicle as any).mileage || vehicle.mileage_km)?.toLocaleString('es-CL') || '0'}...</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <IconEngine size={24} />
            </div>
            <span className="text-xs truncate max-w-full">{vehicle.extra_specs?.legacy?.fuel_legacy || 'Híbrido'}</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <IconManualGearbox size={24} />
            </div>
            <span className="text-xs truncate max-w-full">{vehicle.extra_specs?.legacy?.transmission_legacy || 'Manual'}</span>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3 pt-2">
          <CircleButton onClick={(e)=>{e.stopPropagation();}} aria-label="Vendedor" size={48} variant="default" className="relative z-30">
            <UserAvatar
              path={seller?.avatar || (seller?.id === user?.id ? user?.avatarUrl : undefined)}
              alt={seller?.nombre}
              size={48}
            />
          </CircleButton>
          <Button 
            type="button" 
            onClick={(e)=>{e.stopPropagation(); if (onContact) onContact(vehicle);}} 
            className="relative z-30 flex-1 text-lg py-4" 
            variant="primary" 
            size="lg" 
            shape="rounded"
          >
            Contactar
          </Button>
          <CircleButton type="button" onClick={toggleMenu} className="relative z-30" aria-label="Más opciones" size={48}>
            <IconDots size={20} />
          </CircleButton>
        </div>

        {/* Menú desplegable */}
        {menuOpen ? (
          <div className="absolute bottom-20 right-6 z-40 w-48 bg-white dark:bg-darkcard border border-gray-200 dark:border-gray-700 shadow-xl rounded-2xl py-2 animate-fadeIn">
            <button onClick={actFavFromMenu} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 text-left">
              <IconHeart size={18}/> {favorite ? 'Quitar de favoritos' : 'Favoritos'}
            </button>
            <button onClick={actShare} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 text-left">
              <IconShare2 size={18}/> Compartir
            </button>
            <button onClick={actCompare} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 text-left">
              <IconScale size={18}/> Comparar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Card;
