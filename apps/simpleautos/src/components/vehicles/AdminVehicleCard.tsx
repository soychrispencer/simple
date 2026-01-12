import React, { useState, useRef, useEffect } from "react";
import { Button, CircleButton, Chip, useDisplayCurrency } from '@simple/ui';
import { IconChevronLeft, IconChevronRight, IconMapPin, IconGauge, IconEngine, IconManualGearbox, IconDots, IconTrash, IconCopy, IconEye, IconCar, IconMotorbike, IconTruck, IconBus, IconPointer, IconPlayerPlay, IconPlayerPause, IconFileText, IconEdit, IconCreditCard, IconGift, IconTag, IconShare2 } from '@tabler/icons-react';
import { conditionMap, toSpanish, capitalize, fuelTypeMap, transmissionMap } from '@/lib/vehicleTranslations';
import { formatPrice } from '@/lib/format';
import { convertFromClp } from '@/lib/displayCurrency';
import { BoostSlotsModal } from '@/components/boost/BoostSlotsModal';

interface AdminVehicleCardProps {
  vehicle: {
    id: string;
    titulo: string;
    precio: number;
    estadoPublicacion: string; // Estado de publicación: Publicado/Pausado/Borrador
    portada?: string;
    vistas?: number;
    clics?: number;
    imagenes?: string[];
    descripcion?: string;
    year?: number;
    mileage?: number;
    fuel?: string;
    transmission?: string;
    commune?: string;
    region?: string;
    listing_type?: string;
    currency?: string;
    featured?: boolean;
    type_key?: string;
    type_label?: string;
    condicionVehiculo?: string; // Condición del vehículo: Nuevo/Usado/Seminuevo
    rent_daily_price?: number | null;
    rent_weekly_price?: number | null;
    rent_monthly_price?: number | null;
    rent_price_period?: 'daily' | 'weekly' | 'monthly' | null;
    auction_start_price?: number | null;
    auction_start_at?: string | null;
    auction_end_at?: string | null;
    extra_specs?: {
      rent_daily_price?: number | null;
      rent_weekly_price?: number | null;
      rent_monthly_price?: number | null;
      rent_price_period?: 'daily' | 'weekly' | 'monthly' | null;
      auction_start_price?: number | null;
      auction_start_at?: string | null;
      auction_end_at?: string | null;
      [key: string]: any;
    } | null;
    commercial_conditions?: {
      financing?: any[];
      bonuses?: any[];
      discounts?: any[];
      additional_conditions?: string;
    } | null;
  };
  layout?: 'vertical' | 'horizontal';
  userId?: string; // ID del usuario autenticado
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onView?: (id: string) => void;
  onChangeStatus?: (id: string, newStatus: 'Publicado' | 'Pausado' | 'Borrador') => void;
  onBoost?: (id: string) => void;
  canPublish?: boolean;
  canDuplicate?: boolean;
  publishDisabledTitle?: string;
  duplicateDisabledTitle?: string;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelected?: () => void;
  className?: string;
}

export const AdminVehicleCard: React.FC<AdminVehicleCardProps> = ({
  vehicle,
  layout = 'vertical',
  userId,
  onEdit,
  onDelete,
  onDuplicate,
  onView,
  onChangeStatus,
  onBoost,
  canPublish = true,
  canDuplicate = true,
  publishDisabledTitle,
  duplicateDisabledTitle,
  selectionMode = false,
  selected = false,
  onToggleSelected,
  className = ""
}) => {
  const [index, setIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const images = vehicle.imagenes && vehicle.imagenes.length > 0
    ? vehicle.imagenes
    : vehicle.portada
    ? [vehicle.portada]
    : [];

  const total = images.length;

  // Determinar la etiqueta del tipo de publicación
  const listingTypeLabel = (() => {
    switch(vehicle.listing_type) {
      case 'sale': return 'Venta';
      case 'rent': return 'Arriendo';
      case 'auction': return 'Subasta';
      default: return 'Venta';
    }
  })();

  const listingTypeClasses = 'bg-[var(--color-primary-a10)] text-[var(--color-primary)]';

  const extraSpecs = (vehicle.extra_specs ?? {}) as Record<string, any>;
  const rentPeriod = (vehicle as any).rent_price_period ?? extraSpecs.rent_price_period;
  const rentDaily = (vehicle as any).rent_daily_price ?? extraSpecs.rent_daily_price;
  const rentWeekly = (vehicle as any).rent_weekly_price ?? extraSpecs.rent_weekly_price;
  const rentMonthly = (vehicle as any).rent_monthly_price ?? extraSpecs.rent_monthly_price;

  const { currency: displayCurrency } = useDisplayCurrency();
  const currencyCode = displayCurrency;

  const formatDisplayPrice = (value: number | null | undefined) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return formatPrice(value, { currency: currencyCode });
    return formatPrice(convertFromClp(value, currencyCode), { currency: currencyCode });
  };

  const auctionStartPrice = (vehicle as any).auction_start_price ?? extraSpecs.auction_start_price;

  const rentInfo = vehicle.listing_type === 'rent'
    ? (() => {
        if (rentPeriod === 'daily' && rentDaily != null) return { amount: rentDaily, label: 'por día' } as const;
        if (rentPeriod === 'weekly' && rentWeekly != null) return { amount: rentWeekly, label: 'por semana' } as const;
        if (rentPeriod === 'monthly' && rentMonthly != null) return { amount: rentMonthly, label: 'por mes' } as const;
        if (rentDaily != null) return { amount: rentDaily, label: 'por día' } as const;
        if (rentWeekly != null) return { amount: rentWeekly, label: 'por semana' } as const;
        if (rentMonthly != null) return { amount: rentMonthly, label: 'por mes' } as const;
        if (vehicle.precio != null) return { amount: vehicle.precio, label: 'por mes' } as const;
        return null;
      })()
    : null;

  const discountInfo = (() => {
    const lt = vehicle.listing_type as any;
    const base = (() => {
      if (lt === 'sale') return vehicle.precio;
      if (lt === 'auction') return auctionStartPrice ?? vehicle.precio;
      if (lt === 'rent') return rentInfo?.amount ?? null;
      return null;
    })();
    if (typeof base !== 'number') return null;

    const discountItems = (() => {
      const fromCommercial = vehicle.commercial_conditions?.discounts;
      if (Array.isArray(fromCommercial)) return fromCommercial as any[];

      const advanced =
        ((vehicle as any)?.metadata?.advanced_conditions ??
          (extraSpecs as any)?.advanced_conditions ??
          (extraSpecs as any)?.legacy?.advanced_conditions ??
          null) as any;
      if (advanced?.discounts && Array.isArray(advanced.discounts)) return advanced.discounts as any[];
      return [] as any[];
    })();
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

  const hasStatusBadge = vehicle.estadoPublicacion === 'Publicado' || vehicle.estadoPublicacion === 'Borrador' || vehicle.estadoPublicacion === 'Pausado';

  // Estado del vehículo (nuevo/usado/etc)
  const conditionCanon = (
    extraSpecs.estado ??
    extraSpecs.condition ??
    vehicle.condicionVehiculo ??
    extraSpecs.state ??
    null
  );
  const conditionLabel = conditionCanon ? capitalize(toSpanish(conditionMap, conditionCanon) ?? String(conditionCanon)) : '-';

  const go = (dir: number) => {
    setIndex(i => (i + dir + total) % total);
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

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectionMode) return;
    setMenuOpen(o => !o);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectionMode) return;
    if (onEdit) onEdit(vehicle.id);
    setMenuOpen(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectionMode) return;
    if (onDelete) onDelete(vehicle.id);
    setMenuOpen(false);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectionMode) return;
    if (!canDuplicate) return;
    if (onDuplicate) onDuplicate(vehicle.id);
    setMenuOpen(false);
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectionMode) return;
    if (onView) onView(vehicle.id);
    setMenuOpen(false);
  };

  const handlePublish = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectionMode) return;
    if (!canPublish) return;
    if (onChangeStatus) onChangeStatus(vehicle.id, 'Publicado');
    setMenuOpen(false);
  };

  const handlePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectionMode) return;
    if (onChangeStatus) onChangeStatus(vehicle.id, 'Pausado');
    setMenuOpen(false);
  };

  const handleDraft = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectionMode) return;
    if (onChangeStatus) onChangeStatus(vehicle.id, 'Borrador');
    setMenuOpen(false);
  };

  const handleBoost = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (selectionMode) return;
    setShowSlotsModal(true);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const url = typeof window !== 'undefined' ? `${window.location.origin}/vehiculo/${vehicle.id}` : `/vehiculo/${vehicle.id}`;
      const title = vehicle.titulo || 'Vehículo';
      const navAny = navigator as any;
      if (typeof navAny?.share === 'function') {
        await navAny.share({ title, text: title, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // silencioso
    } finally {
      setMenuOpen(false);
    }
  };

  const handleSlotsModalClose = () => {
    setShowSlotsModal(false);
  };

  const handleSlotsModalSuccess = () => {
    setShowSlotsModal(false);
    // Recargar datos si es necesario
    if (onBoost) onBoost(vehicle.id);
  };

  const handleCardClick = () => {
    if (selectionMode) return;
    if (!menuOpen && onView) {
      onView(vehicle.id);
    }
  };

  const renderSelectionCheckbox = (size: 'sm' | 'md' = 'md') => {
    if (!selectionMode) return null;
    const baseLabel = selected ? 'Deseleccionar publicación' : 'Seleccionar publicación';
    const dims = size === 'sm' ? 'w-7 h-7' : 'w-7 h-7';
    return (
      <label
        className="absolute top-2 left-2 z-40 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          className="sr-only peer"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelected?.();
          }}
          aria-label={baseLabel}
        />
        <div
          className={`${dims} rounded-md flex items-center justify-center transition-all card-surface shadow-card ring-1 ring-border/60 peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-checked:bg-primary peer-checked:text-[var(--color-on-primary)] peer-checked:ring-2 peer-checked:ring-primary peer-checked:[&_.check]:opacity-100`}
        >
          <svg className="check w-4.5 h-4.5 opacity-0 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </label>
    );
  };

  // Versión HORIZONTAL
  if (layout === 'horizontal') {
    return (
      <div
        ref={cardRef}
        className={`group relative w-full max-w-full overflow-hidden card-surface rounded-2xl shadow-card hover:shadow-card transition cursor-pointer ${className}`}
        onClick={handleCardClick}
      >
        <div className="flex w-full min-w-0 overflow-hidden flex-row items-stretch gap-0">
          {/* Galería de imágenes con navegación */}
          <div className="relative w-40 sm:w-72 flex-shrink-0 card-surface/90 shadow-card rounded-l-2xl overflow-hidden">
            <div className="relative w-full h-full aspect-[4/3] overflow-hidden">
              {images.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-lighttext/70 dark:text-darktext/70 card-surface shadow-card">
                  Sin imágenes
                </div>
              ) : (
                images.slice(0, 5).map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={vehicle.titulo}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                      i === index ? 'opacity-100' : 'opacity-0'
                    }`}
                    loading={i === 0 ? 'eager' : 'lazy'}
                  />
                ))
              )}

              {renderSelectionCheckbox('md')}
              
              {/* Controles de navegación de imágenes */}
              {total > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); go(-1); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-lightbg dark:bg-darkbg border border-black/10 dark:border-white/10 shadow-card hover:bg-[var(--field-bg-hover)] transition flex items-center justify-center z-20 touch-manipulation"
                    aria-label="Imagen anterior"
                  >
                    <IconChevronLeft size={22} stroke={1.5} className="text-lighttext dark:text-darktext" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); go(1); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-lightbg dark:bg-darkbg border border-black/10 dark:border-white/10 shadow-card hover:bg-[var(--field-bg-hover)] transition flex items-center justify-center z-20 touch-manipulation"
                    aria-label="Imagen siguiente"
                  >
                    <IconChevronRight size={22} stroke={1.5} className="text-lighttext dark:text-darktext" />
                  </button>
                  
                  {/* Indicador de posición */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                    {images.slice(0, 5).map((_, i) => (
                      <span
                        key={i}
                        className={`h-2.5 rounded-full shadow-card transition-all ${i === index ? 'bg-primary-500 w-7' : 'bg-border/80 w-2'}`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Badges superiores: destacado (izq), estado (centro), descuento (der) */}
              {vehicle.featured && (
                <span
                  className={`absolute top-2 ${selectionMode ? 'left-10' : 'left-2'} z-30 text-xl drop-shadow-md select-none text-[var(--color-warn)] pointer-events-none`}
                >
                  {'\u26A1'}
                </span>
              )}

              {vehicle.estadoPublicacion === 'Publicado' ? (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-2.5 py-0.5 rounded-full text-[11px] font-semibold backdrop-blur-sm shadow-card bg-[var(--color-success)] text-[var(--color-on-primary)] pointer-events-none">
                  Publicado
                </div>
              ) : vehicle.estadoPublicacion === 'Borrador' || vehicle.estadoPublicacion === 'Pausado' ? (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-2.5 py-0.5 rounded-full text-[11px] font-semibold backdrop-blur-sm shadow-card card-surface text-lighttext/80 dark:text-darktext/80 border border-border/60 pointer-events-none">
                  No publicado
                </div>
              ) : null}

              {discountInfo ? (
                <span className="absolute top-2 right-2 z-30 text-[11px] font-semibold px-2.5 py-1.5 rounded-md border bg-primary text-black border-[var(--color-primary-a90)] shadow-card select-none pointer-events-none">
                  {discountInfo.badgeText}
                </span>
              ) : null}
            </div>
          </div>          {/* Contenido principal */}
          <div className="flex-1 flex flex-col p-4 min-w-0">
            {/* Header: Título y Precio */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg leading-tight mb-1 line-clamp-2 text-lighttext dark:text-darktext">
                  {vehicle.titulo}
                </h3>

                {/* Precio destacado (debajo del título en móvil) */}
                <div className="text-left sm:text-right flex-shrink-0 mb-2 sm:hidden">
                  {vehicle.listing_type === 'rent' ? (
                    rentInfo ? (
                      <div className="flex flex-col leading-tight items-start">
                        <span className="text-xl font-bold text-lighttext dark:text-darktext whitespace-nowrap">{formatDisplayPrice(discountInfo ? discountInfo.finalPrice : rentInfo.amount)}</span>
                        <span className="text-xs text-lighttext/70 dark:text-darktext/70 whitespace-nowrap">
                          {discountInfo ? (
                            <>
                              <span className="line-through">{formatDisplayPrice(discountInfo.base)}</span>
                              <span className="ml-1">{rentInfo.label}</span>
                            </>
                          ) : (
                            rentInfo.label
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-lighttext/70 dark:text-darktext/70">Sin precio</span>
                    )
                  ) : vehicle.listing_type === 'auction' ? (
                    auctionStartPrice != null ? (
                      <div className="flex flex-col leading-tight items-start">
                        <span className="text-xl font-bold text-lighttext dark:text-darktext whitespace-nowrap">{formatDisplayPrice(discountInfo ? discountInfo.finalPrice : auctionStartPrice)}</span>
                        <span className="text-xs text-lighttext/70 dark:text-darktext/70 whitespace-nowrap">
                          {discountInfo ? (
                            <>
                              <span className="line-through">{formatDisplayPrice(discountInfo.base)}</span>
                              <span className="ml-1">precio base</span>
                            </>
                          ) : (
                            'precio base'
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-lighttext/70 dark:text-darktext/70">Sin precio</span>
                    )
                  ) : (
                    vehicle.precio != null ? (
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-xl font-bold text-lighttext dark:text-darktext whitespace-nowrap">{formatDisplayPrice(discountInfo ? discountInfo.finalPrice : vehicle.precio)}</span>
                        <span className="text-xs text-lighttext/70 dark:text-darktext/70 whitespace-nowrap">
                          {discountInfo ? (
                            <>
                              <span className="line-through">{formatDisplayPrice(discountInfo.base)}</span>
                              <span className="ml-1">precio base</span>
                            </>
                          ) : (
                            <>&nbsp;</>
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-lighttext/70 dark:text-darktext/70">Sin precio</span>
                    )
                  )}
                </div>

                {/* Badges de tipo publicación, condición y ubicación - una sola línea */}
                <div className="flex items-center gap-2 mb-2 max-w-full overflow-hidden">
                  <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-medium whitespace-nowrap min-w-0 max-w-[86px] sm:max-w-none truncate ${listingTypeClasses}`}>
                    {listingTypeLabel}
                  </span>
                  <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-medium card-surface shadow-card text-lighttext/80 dark:text-darktext/80 whitespace-nowrap min-w-0 max-w-[86px] sm:max-w-none truncate">
                    {conditionLabel}
                  </span>
                  <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-medium card-surface shadow-card text-lighttext/80 dark:text-darktext/80 flex items-center gap-1 min-w-0 whitespace-nowrap flex-shrink max-w-[160px] sm:max-w-[260px]">
                    <IconMapPin size={14} stroke={1.5} className="flex-shrink-0" />
                    <span className="truncate">{vehicle.commune || 'Sin ubicación'}</span>
                  </span>
                </div>
              </div>

              {/* Precio destacado (lado derecho en >= sm) */}
              <div className="hidden sm:block text-right flex-shrink-0">
                {vehicle.listing_type === 'rent' ? (
                  rentInfo ? (
                    <div className="flex flex-col leading-tight">
                      <span className="text-2xl font-bold text-lighttext dark:text-darktext">{formatDisplayPrice(discountInfo ? discountInfo.finalPrice : rentInfo.amount)}</span>
                      <span className="text-xs text-lighttext/70 dark:text-darktext/70">
                        {discountInfo ? (
                          <>
                            <span className="line-through">{formatDisplayPrice(discountInfo.base)}</span>
                            <span className="ml-1">{rentInfo.label}</span>
                          </>
                        ) : (
                          rentInfo.label
                        )}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-lighttext/70 dark:text-darktext/70">Sin precio</span>
                  )
                ) : vehicle.listing_type === 'auction' ? (
                  auctionStartPrice != null ? (
                    <div className="flex flex-col leading-tight">
                      <span className="text-2xl font-bold text-lighttext dark:text-darktext">{formatDisplayPrice(discountInfo ? discountInfo.finalPrice : auctionStartPrice)}</span>
                      <span className="text-xs text-lighttext/70 dark:text-darktext/70">
                        {discountInfo ? (
                          <>
                            <span className="line-through">{formatDisplayPrice(discountInfo.base)}</span>
                            <span className="ml-1">precio base</span>
                          </>
                        ) : (
                          'precio base'
                        )}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-lighttext/70 dark:text-darktext/70">Sin precio</span>
                  )
                ) : (
                  vehicle.precio != null ? (
                    <div className="flex flex-col items-end leading-tight">
                      <span className="text-2xl font-bold text-lighttext dark:text-darktext">{formatDisplayPrice(discountInfo ? discountInfo.finalPrice : vehicle.precio)}</span>
                      <span className="text-xs text-lighttext/70 dark:text-darktext/70">
                        {discountInfo ? (
                          <>
                            <span className="line-through">{formatDisplayPrice(discountInfo.base)}</span>
                            <span className="ml-1">precio base</span>
                          </>
                        ) : (
                          <>&nbsp;</>
                        )}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-lighttext/70 dark:text-darktext/70">Sin precio</span>
                  )
                )}
              </div>
            </div>

            {/* Descripción breve */}
            {vehicle.descripcion && (
              <p className="text-sm text-lighttext/70 dark:text-darktext/70 line-clamp-2 mb-3">
                {vehicle.descripcion}
              </p>
            )}

            {/* Especificaciones principales (solo 2 en móvil) */}
            <div className="flex items-center justify-start gap-4 mb-3 overflow-hidden">
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
                    const label = vehicle.type_label;
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
                  <IconGauge size={16} stroke={1.5} />
                </div>
                <span className="truncate">{vehicle.mileage != null ? vehicle.mileage.toLocaleString() + ' km' : '0 km'}</span>
              </div>
              {/* Combustible */}
              <div className="hidden sm:flex items-center gap-2 text-sm text-lighttext/70 dark:text-darktext/70">
                <div className="w-8 h-8 rounded-full card-surface shadow-card flex items-center justify-center flex-shrink-0">
                  <IconEngine size={16} stroke={1.5} />
                </div>
                <span className="truncate">{vehicle.fuel ? capitalize(toSpanish(fuelTypeMap, vehicle.fuel) ?? vehicle.fuel) : '-'}</span>
              </div>
              {/* Transmisión */}
              <div className="hidden sm:flex items-center gap-2 text-sm text-lighttext/70 dark:text-darktext/70">
                <div className="w-8 h-8 rounded-full card-surface shadow-card flex items-center justify-center flex-shrink-0">
                  <IconManualGearbox size={16} stroke={1.5} />
                </div>
                <span className="truncate">{vehicle.transmission ? capitalize(toSpanish(transmissionMap, vehicle.transmission) ?? vehicle.transmission) : '-'}</span>
              </div>
            </div>

            {/* Condiciones comerciales */}
            {vehicle.commercial_conditions && (
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {vehicle.commercial_conditions.financing && vehicle.commercial_conditions.financing.length > 0 && (
                  <Chip className="bg-[var(--color-primary-a10)] text-[var(--color-primary)] border border-[var(--color-primary-a20)] px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1" size="sm">
                    <IconCreditCard size={12} />
                    Financiamiento
                  </Chip>
                )}
                {vehicle.commercial_conditions.bonuses && vehicle.commercial_conditions.bonuses.length > 0 && (
                  <Chip className="bg-[var(--color-success-subtle-bg)] text-[var(--color-success)] border border-[var(--color-success-subtle-border)] px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1" size="sm">
                    <IconGift size={12} />
                    Bonos
                  </Chip>
                )}
                {vehicle.commercial_conditions.discounts && vehicle.commercial_conditions.discounts.length > 0 && (
                  <Chip className="bg-[var(--color-danger-subtle-bg)] text-[var(--color-danger)] border border-[var(--color-danger-subtle-border)] px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1" size="sm">
                    <IconTag size={12} />
                    Descuentos
                  </Chip>
                )}
              </div>
            )}

            {/* Métricas de rendimiento */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-auto pt-3 border-t border-border/60 dark:border-darkborder/35">
              <div className="flex items-center gap-1.5">
                <IconEye size={16} className="text-primary" />
                <span className="text-sm font-semibold text-lighttext dark:text-darktext">{vehicle.vistas || 0}</span>
                <span className="text-xs text-lighttext/70 dark:text-darktext/70">vistas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <IconPointer size={16} className="text-[var(--color-success)]" />
                <span className="text-sm font-semibold text-lighttext dark:text-darktext">{vehicle.clics || 0}</span>
                <span className="text-xs text-lighttext/70 dark:text-darktext/70">clics</span>
              </div>
              {vehicle.vistas && vehicle.vistas > 0 && (
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="text-xs text-lighttext/70 dark:text-darktext/70">CTR:</span>
                  <span className="text-sm font-semibold text-primary">
                    {((vehicle.clics || 0) / vehicle.vistas * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>

            {/* Barra de acciones (tipo Facebook Marketplace) */}
            {!selectionMode ? (
              <div className="mt-3 flex items-center gap-2">
                <CircleButton
                  type="button"
                  onClick={handleBoost}
                  aria-label="Impulsar publicación"
                  size={40}
                  variant="default"
                >
                  <span className={`text-lg drop-shadow-md select-none text-[var(--color-warn)] ${vehicle.featured ? '' : 'opacity-40 grayscale'}`}>
                    {'\u26A1'}
                  </span>
                </CircleButton>

                <Button
                  type="button"
                  onClick={handleEdit}
                  className="flex-1"
                  variant="outline"
                  size="md"
                  shape="rounded"
                >
                  <span className="inline-flex items-center gap-2">
                    <IconEdit size={18} stroke={1.5} />
                    Editar
                  </span>
                </Button>

                <CircleButton
                  type="button"
                  onClick={toggleMenu}
                  aria-label="Más opciones"
                  size={40}
                  variant="default"
                >
                  <IconDots size={20} stroke={1.5} />
                </CircleButton>
              </div>
            ) : null}
          </div>
        </div>

        {/* Menú desplegable para layout horizontal */}
        {!selectionMode && menuOpen && (
          <div className="fixed z-[9999] w-44 card-surface shadow-card rounded-xl py-2 animate-fadeIn" style={{top: '50%', right: '1rem', transform: 'translateY(-50%)'}}>
            {/* Opciones de estado - PRIMERO */}
            {vehicle.estadoPublicacion === 'Borrador' && (
              <button
                onClick={handlePublish}
                disabled={!canPublish}
                title={!canPublish ? (publishDisabledTitle || 'Acción no disponible') : undefined}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition ${
                  canPublish ? 'hover:bg-[var(--field-bg-hover)]' : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <IconPlayerPlay size={16} className="text-[var(--color-success)]"/> Publicar
              </button>
            )}
            {vehicle.estadoPublicacion === 'Publicado' && (
              <button onClick={handlePause} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--field-bg-hover)] text-left transition">
                <IconPlayerPause size={16} className="text-[var(--color-warn)]"/> Pausar
              </button>
            )}
            {vehicle.estadoPublicacion === 'Pausado' && (
              <>
                <button
                  onClick={handlePublish}
                  disabled={!canPublish}
                  title={!canPublish ? (publishDisabledTitle || 'Acción no disponible') : undefined}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition ${
                    canPublish ? 'hover:bg-[var(--field-bg-hover)]' : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <IconPlayerPlay size={16} className="text-[var(--color-success)]"/> Publicar
                </button>
                <button onClick={handleDraft} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--field-bg-hover)] text-left transition">
                  <IconFileText size={16} className="text-lighttext/80 dark:text-darktext/80"/> Pasar a borrador
                </button>
              </>
            )}

            {/* Separador */}
            {vehicle.estadoPublicacion && <div className="border-t border-border/60 dark:border-darkborder/35 my-1"></div>}

            <button onClick={handleView} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--field-bg-hover)] text-left transition">
              <IconEye size={16}/> Ver publicación
            </button>

            <button onClick={handleShare} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--field-bg-hover)] text-left transition">
              <IconShare2 size={16}/> Compartir
            </button>

            {/* Separador */}
            <div className="border-t border-border/60 dark:border-darkborder/35 my-1"></div>

            <button
              onClick={handleDuplicate}
              disabled={!canDuplicate}
              title={!canDuplicate ? (duplicateDisabledTitle || 'Acción no disponible') : undefined}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition ${
                canDuplicate ? 'hover:bg-[var(--field-bg-hover)]' : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <IconCopy size={16}/> Duplicar
            </button>
            <button onClick={handleDelete} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--color-danger-subtle-bg)] text-[var(--color-danger)] text-left transition">
              <IconTrash size={16}/> Eliminar
            </button>
          </div>
        )}

        {/* Modal de Slots */}
        {!selectionMode && showSlotsModal && userId && (
          <BoostSlotsModal
            userId={userId}
            listingId={vehicle.id}
            vehicleTitle={vehicle.titulo}
            listingType={(vehicle.listing_type || 'sale') as 'sale' | 'rent' | 'auction'}
            onClose={handleSlotsModalClose}
            onSuccess={handleSlotsModalSuccess}
          />
        )}
      </div>
    );
  }

  // Versión VERTICAL (grid)
  return (
    <div
      ref={cardRef}
      className={`group relative card-surface rounded-3xl shadow-card hover:shadow-card transition overflow-hidden flex flex-col w-full cursor-pointer ${className}`}
      onClick={handleCardClick}
    >
      {/* Slider de imágenes - mismo tamaño que VehicleCard */}
      <div className="relative w-full aspect-[16/10] overflow-hidden card-surface/90 shadow-card">
        {images.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-lighttext/70 dark:text-darktext/70 card-surface shadow-card">
            Sin imágenes
          </div>
        ) : (
          images.slice(0, 5).map((img, i) => (
            <img
              key={i}
              src={img}
              alt={vehicle.titulo}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i === index ? 'opacity-100' : 'opacity-0'}`}
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          ))
        )}

        {renderSelectionCheckbox('md')}

        {/* Badge de Destacado - Solo icono sin círculo */}
        {vehicle.featured && (
          <span className={`absolute top-2 ${selectionMode ? 'left-10' : 'left-2'} z-20 text-xl drop-shadow-md select-none text-[var(--color-warn)]`}>
            {'\u26A1'}
          </span>
        )}

        {discountInfo ? (
          <span className="absolute top-2 right-2 z-20 text-[11px] font-semibold px-2.5 py-1.5 rounded-md border bg-primary text-black border-[var(--color-primary-a90)] shadow-card select-none">
            {discountInfo.badgeText}
          </span>
        ) : null}

        {/* Badge de Estado de Publicación - centrado arriba */}
        {vehicle.estadoPublicacion === 'Publicado' ? (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-2.5 py-0.5 rounded-full text-[11px] font-semibold backdrop-blur-sm shadow-card bg-[var(--color-success)] text-[var(--color-on-primary)]">
            Publicado
          </div>
        ) : vehicle.estadoPublicacion === 'Borrador' || vehicle.estadoPublicacion === 'Pausado' ? (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-2.5 py-0.5 rounded-full text-[11px] font-semibold backdrop-blur-sm shadow-card card-surface text-lighttext/80 dark:text-darktext/80 border border-border/60">
            No publicado
          </div>
        ) : null}

        {/* Controles del slider */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e)=>{e.stopPropagation(); go(-1);}}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-lightbg dark:bg-darkbg border border-black/10 dark:border-white/10 shadow-card hover:bg-[var(--field-bg-hover)] transition flex items-center justify-center touch-manipulation"
              aria-label="Anterior"
            >
              <IconChevronLeft size={22} stroke={1.5} className="text-lighttext dark:text-darktext" />
            </button>
            <button
              type="button"
              onClick={(e)=>{e.stopPropagation(); go(1);}}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-lightbg dark:bg-darkbg border border-black/10 dark:border-white/10 shadow-card hover:bg-[var(--field-bg-hover)] transition flex items-center justify-center touch-manipulation"
              aria-label="Siguiente"
            >
              <IconChevronRight size={22} stroke={1.5} className="text-lighttext dark:text-darktext" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {images.slice(0,5).map((_, i) => (
                <span key={i} className={`h-2.5 rounded-full shadow-card transition-all ${i===index ? 'bg-primary-500 w-7' : 'bg-border/80 w-2'}`} />
              ))}
            </div>
          </>
        )}

        <div className="absolute inset-0 bg-[var(--overlay-scrim-8)]" />
      </div>

      {/* Contenido - EXACTAMENTE igual que VehicleCard */}
      <div className="relative z-20 px-4 py-4 flex flex-col gap-2.5">
        {/* Título - mismo tamaño que VehicleCard */}
        <h3 className="font-bold text-lg leading-tight line-clamp-2 text-center min-h-[2.5rem]">
          {vehicle.titulo}
        </h3>

        {/* Precio - mismo tamaño */}
        <div className="text-center min-h-[3rem] flex items-center justify-center">
          {(() => {
            const listingType = vehicle.listing_type;

            // Precio de arriendo
            if (listingType === 'rent') {
              if (rentInfo) {
                return (
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold leading-tight">{formatDisplayPrice(discountInfo ? discountInfo.finalPrice : rentInfo.amount)}</span>
                    <span className="text-xs text-lighttext/70 dark:text-darktext/70 leading-tight">
                      {discountInfo ? (
                        <>
                          <span className="line-through">{formatDisplayPrice(discountInfo.base)}</span>
                          <span className="ml-1">{rentInfo.label}</span>
                        </>
                      ) : (
                        rentInfo.label
                      )}
                    </span>
                  </div>
                );
              }
              return <span className="text-xl text-lighttext/70 dark:text-darktext/70 leading-tight">Sin precio</span>;
            }

            // Precio de subasta
            if (listingType === 'auction') {
              const auctionStart = auctionStartPrice;
              if (auctionStart != null) {
                return (
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold leading-tight">{formatDisplayPrice(discountInfo ? discountInfo.finalPrice : auctionStart)}</span>
                    <span className="text-xs text-lighttext/70 dark:text-darktext/70 leading-tight">
                      {discountInfo ? (
                        <>
                          <span className="line-through">{formatDisplayPrice(discountInfo.base)}</span>
                          <span className="ml-1">precio base</span>
                        </>
                      ) : (
                        'precio base'
                      )}
                    </span>
                  </div>
                );
              }
            }

            // Precio de venta normal
            if (vehicle.precio != null) {
              return (
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold leading-tight">{formatDisplayPrice(discountInfo ? discountInfo.finalPrice : vehicle.precio)}</span>
                  <span className="text-xs text-lighttext/70 dark:text-darktext/70 leading-tight">
                    {discountInfo ? (
                      <>
                        <span className="line-through">{formatDisplayPrice(discountInfo.base)}</span>
                        <span className="ml-1">precio base</span>
                      </>
                    ) : (
                      <>&nbsp;</>
                    )}
                  </span>
                </div>
              );
            }
            return <span className="text-xl text-lighttext/70 dark:text-darktext/70 leading-tight">Sin precio</span>;
          })()}
        </div>

        {/* Badges y Ubicación: Tipo de publicación + Estado vehículo + Ubicación */}
        <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar w-full">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${listingTypeClasses}`}>
            {listingTypeLabel}
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium card-surface shadow-card text-lighttext/80 dark:text-darktext/80 whitespace-nowrap flex-shrink-0">
            {conditionLabel}
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium card-surface shadow-card text-lighttext/80 dark:text-darktext/80 flex items-center gap-1 min-w-0 flex-shrink">
            <IconMapPin size={14} stroke={1.5} className="flex-shrink-0" />
            <span className="truncate max-w-[100px]">{vehicle.commune || 'Sin ubicación'}</span>
          </span>
        </div>

        {/* Grid de especificaciones - 4 columnas: Tipo, Kilometraje, Combustible, Transmisión */}
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
                const label = vehicle.type_label;
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
            <span className="text-center leading-tight">{(() => {
              const km = vehicle.mileage ?? 0;
              return km >= 1000 ? `${Math.round(km / 1000)}k km` : `${km} km`;
            })()}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full card-surface shadow-card flex items-center justify-center flex-shrink-0">
              <IconEngine size={16} stroke={1.5} />
            </div>
            <span className="text-center leading-tight">{capitalize(toSpanish(fuelTypeMap, vehicle.fuel || extraSpecs?.fuel_type || extraSpecs?.legacy?.fuel_legacy || extraSpecs?.fuel) || '-')}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full card-surface shadow-card flex items-center justify-center flex-shrink-0">
              <IconManualGearbox size={16} stroke={1.5} />
            </div>
            <span className="text-center leading-tight">{capitalize(toSpanish(transmissionMap, vehicle.transmission || extraSpecs?.transmission || extraSpecs?.transmission_type || extraSpecs?.legacy?.transmission_legacy) || '-')}</span>
          </div>
        </div>

        {/* Condiciones comerciales */}
        {vehicle.commercial_conditions && (
          <div className="flex items-center justify-center gap-1.5 flex-wrap mb-2">
            {vehicle.commercial_conditions.financing && vehicle.commercial_conditions.financing.length > 0 && (
              <Chip className="bg-[var(--color-primary-a10)] text-[var(--color-primary)] border border-[var(--color-primary-a20)] px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1" size="sm">
                <IconCreditCard size={12} />
                Financiamiento
              </Chip>
            )}
            {vehicle.commercial_conditions.bonuses && vehicle.commercial_conditions.bonuses.length > 0 && (
              <Chip className="bg-[var(--color-success-subtle-bg)] text-[var(--color-success)] border border-[var(--color-success-subtle-border)] px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1" size="sm">
                <IconGift size={12} />
                Bonos
              </Chip>
            )}
            {vehicle.commercial_conditions.discounts && vehicle.commercial_conditions.discounts.length > 0 && (
              <Chip className="bg-[var(--color-danger-subtle-bg)] text-[var(--color-danger)] border border-[var(--color-danger-subtle-border)] px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1" size="sm">
                <IconTag size={12} />
                Descuentos
              </Chip>
            )}
          </div>
        )}

        {/* Botones - mismo espaciado que VehicleCard */}
        {!selectionMode && (
          <div className="flex items-center gap-2 pt-2">
            <CircleButton
              type="button"
              onClick={handleBoost}
              className="relative z-30"
              aria-label="Impulsar publicación"
              size={40}
              variant="default"
            >
              <span className={`text-lg drop-shadow-md select-none text-[var(--color-warn)] ${vehicle.featured ? '' : 'opacity-40 grayscale'}`}>
                {'\u26A1'}
              </span>
            </CircleButton>
            <Button
              type="button"
              onClick={handleEdit}
              className="relative z-30 flex-1"
              variant="primary"
              size="md"
              shape="rounded"
            >
              Editar
            </Button>
            <div className="relative flex-shrink-0">
              <CircleButton
                type="button"
                onClick={toggleMenu}
                className="relative z-30"
                aria-label="Más opciones"
                size={40}
                variant="default"
              >
                <IconDots size={18} />
              </CircleButton>

              {/* Menú desplegable */}
              {menuOpen && (
                <div className="absolute bottom-full right-0 mb-1 z-[9999] w-44 card-surface shadow-card rounded-xl py-2 animate-fadeIn">
                {/* Opciones de estado - PRIMERO */}
                {vehicle.estadoPublicacion === 'Borrador' && (
                  <button
                    onClick={handlePublish}
                    disabled={!canPublish}
                    title={!canPublish ? (publishDisabledTitle || 'Acción no disponible') : undefined}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition ${
                      canPublish ? 'hover:bg-[var(--field-bg-hover)]' : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <IconPlayerPlay size={16} className="text-[var(--color-success)]"/> Publicar
                  </button>
                )}
                {vehicle.estadoPublicacion === 'Publicado' && (
                  <button onClick={handlePause} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--field-bg-hover)] text-left transition">
                    <IconPlayerPause size={16} className="text-[var(--color-warn)]"/> Pausar
                  </button>
                )}
                {vehicle.estadoPublicacion === 'Pausado' && (
                  <>
                    <button
                      onClick={handlePublish}
                      disabled={!canPublish}
                      title={!canPublish ? (publishDisabledTitle || 'Acción no disponible') : undefined}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition ${
                        canPublish ? 'hover:bg-[var(--field-bg-hover)]' : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <IconPlayerPlay size={16} className="text-[var(--color-success)]"/> Publicar
                    </button>
                    <button onClick={handleDraft} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--field-bg-hover)] text-left transition">
                      <IconFileText size={16} className="text-lighttext/80 dark:text-darktext/80"/> Pasar a borrador
                    </button>
                  </>
                )}

                {/* Separador */}
                {vehicle.estadoPublicacion && <div className="border-t border-border/60 dark:border-darkborder/35 my-1"></div>}

                <button onClick={handleView} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--field-bg-hover)] text-left transition">
                  <IconEye size={16}/> Ver publicación
                </button>

                {/* Separador */}
                <div className="border-t border-border/60 dark:border-darkborder/35 my-1"></div>

                <button
                  onClick={handleDuplicate}
                  disabled={!canDuplicate}
                  title={!canDuplicate ? (duplicateDisabledTitle || 'Acción no disponible') : undefined}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition ${
                    canDuplicate ? 'hover:bg-[var(--field-bg-hover)]' : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <IconCopy size={16}/> Duplicar
                </button>
                <button onClick={handleDelete} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--color-danger-subtle-bg)] text-[var(--color-danger)] text-left transition">
                  <IconTrash size={16}/> Eliminar
                </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de selección de slots */}
      {!selectionMode && showSlotsModal && (
        <BoostSlotsModal
          listingId={vehicle.id}
          vehicleTitle={vehicle.titulo}
          listingType={(vehicle.listing_type as 'sale' | 'rent' | 'auction') || 'sale'}
          userId={userId}
          onClose={handleSlotsModalClose}
          onSuccess={handleSlotsModalSuccess}
        />
      )}

    </div>
  );
};

export default AdminVehicleCard;







