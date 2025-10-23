import React, { useState, useRef, useEffect } from "react";
import { Button } from '@/components/ui/Button';
import { CircleButton } from '@/components/ui/CircleButton';
import { Chip } from '@/components/ui/Chip';
import { IconChevronLeft, IconChevronRight, IconMapPin, IconGauge, IconEngine, IconManualGearbox, IconDots, IconTrash, IconCopy, IconEye, IconBolt, IconCar, IconMotorbike, IconTruck, IconBus, IconPointer, IconPlayerPlay, IconPlayerPause, IconFileText, IconEdit, IconX, IconCheck, IconCreditCard, IconGift, IconTag } from '@tabler/icons-react';
import { conditionMap, toSpanish, capitalize, fuelTypeMap, transmissionMap } from '@/lib/vehicleTranslations';
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
    : ['/file.svg'];

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

  const listingTypeClasses = (() => {
    switch(vehicle.listing_type) {
      case 'sale': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'rent': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case 'auction': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    }
  })();

  const extraSpecs = (vehicle.extra_specs ?? {}) as Record<string, any>;
  const rentPeriod = (vehicle as any).rent_price_period ?? extraSpecs.rent_price_period;
  const rentDaily = (vehicle as any).rent_daily_price ?? extraSpecs.rent_daily_price;
  const rentWeekly = (vehicle as any).rent_weekly_price ?? extraSpecs.rent_weekly_price;
  const rentMonthly = (vehicle as any).rent_monthly_price ?? extraSpecs.rent_monthly_price;

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

  // Estado del vehículo (nuevo/usado/etc)
  const conditionCanon = (
    extraSpecs.estado ??
    extraSpecs.condition ??
    vehicle.condicionVehiculo ??
    extraSpecs.state ??
    null
  );
  const conditionLabel = conditionCanon ? capitalize(toSpanish(conditionMap, conditionCanon) ?? String(conditionCanon)) : '—';

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
    setMenuOpen(o => !o);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit(vehicle.id);
    setMenuOpen(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(vehicle.id);
    setMenuOpen(false);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDuplicate) onDuplicate(vehicle.id);
    setMenuOpen(false);
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onView) onView(vehicle.id);
    setMenuOpen(false);
  };

  const handlePublish = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onChangeStatus) onChangeStatus(vehicle.id, 'Publicado');
    setMenuOpen(false);
  };

  const handlePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onChangeStatus) onChangeStatus(vehicle.id, 'Pausado');
    setMenuOpen(false);
  };

  const handleDraft = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onChangeStatus) onChangeStatus(vehicle.id, 'Borrador');
    setMenuOpen(false);
  };

  const handleBoost = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowSlotsModal(true);
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
    if (!menuOpen && onView) {
      onView(vehicle.id);
    }
  };

  // Versión HORIZONTAL
  if (layout === 'horizontal') {
    return (
      <div
        ref={cardRef}
        className={`group relative bg-lightcard dark:bg-darkcard rounded-2xl shadow-card hover:shadow-card-hover transition ring-1 ring-black/5 dark:ring-white/5 cursor-pointer ${className}`}
        onClick={handleCardClick}
      >
        <div className="flex items-stretch gap-0">
          {/* Galería de imágenes con navegación */}
          <div className="relative w-64 flex-shrink-0 bg-lightbg dark:bg-darkbg rounded-l-2xl overflow-hidden">
            <div className="relative w-full h-full aspect-[4/3] overflow-hidden">
              {images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={vehicle.titulo}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                    i === index ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                />
              ))}
              
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
                    {images.map((_, i) => (
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
              
              {/* Badge de Impulsado - emoji ⚡ igual que el ejemplo visual */}
              {vehicle.featured && (
                <span className="absolute top-3 left-3 z-20 text-2xl drop-shadow-lg select-none" style={{color: '#FFB300'}}>
                  {'\u26A1'}
                </span>
              )}
            </div>
            
            {/* Badge de estado de publicación - SOLO 'Publicado', centrado arriba - FUERA del contenedor overflow-hidden */}
            {vehicle.estadoPublicacion === 'Publicado' && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm shadow-lg bg-green-500/95 text-white">
                Publicado
              </div>
            )}
          </div>          {/* Contenido principal */}
          <div className="flex-1 flex flex-col p-4 min-w-0">
            {/* Header: Título y Precio */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2 text-lighttext dark:text-darktext">
                  {vehicle.titulo}
                </h3>

                {/* Badges de tipo publicación, condición y ubicación - debajo del título */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Chip className={`${listingTypeClasses} px-2 py-0.5 rounded-full text-xs font-medium`} size="sm">{listingTypeLabel}</Chip>
                  <Chip className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-0.5 rounded-full text-xs font-medium" size="sm"> {conditionLabel}</Chip>
                  {vehicle.commune && (
                    <Chip variant="subtle" size="sm" className="flex items-center gap-1">
                      <IconMapPin size={14} className="flex-shrink-0" />
                      <span>
                        {vehicle.commune}
                      </span>
                    </Chip>
                  )}
                </div>
              </div>

              {/* Precio destacado */}
              <div className="text-right flex-shrink-0">
                {vehicle.listing_type === 'rent' ? (
                  rentInfo ? (
                    <div className="flex flex-col leading-tight">
                      <span className="text-2xl font-bold text-lighttext dark:text-darktext">${rentInfo.amount.toLocaleString('es-CL')}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{rentInfo.label}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Sin precio</span>
                  )
                ) : vehicle.listing_type === 'auction' ? (
                  auctionStartPrice != null ? (
                    <div className="flex flex-col leading-tight">
                      <span className="text-2xl font-bold text-lighttext dark:text-darktext">${auctionStartPrice.toLocaleString('es-CL')}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">precio base</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Sin precio</span>
                  )
                ) : (
                  <span className="text-2xl font-bold text-lighttext dark:text-darktext">
                    {vehicle.precio != null ? `$${vehicle.precio.toLocaleString('es-CL')}` : 'Sin precio'}
                  </span>
                )}
              </div>
            </div>

            {/* Descripción breve */}
            {vehicle.descripcion && (
              <p className="text-sm text-lighttext/70 dark:text-darktext/70 line-clamp-2 mb-3">
                {vehicle.descripcion}
              </p>
            )}

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
                    const label = vehicle.type_label;
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
                <span className="truncate">{vehicle.mileage != null ? vehicle.mileage.toLocaleString() + ' km' : '0 km'}</span>
              </div>
              {/* Combustible */}
              <div className="flex items-center gap-2 text-sm text-lighttext/70 dark:text-darktext/70">
                <div className="w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg flex items-center justify-center flex-shrink-0">
                  <IconEngine size={16} />
                </div>
                <span className="truncate">{vehicle.fuel ? capitalize(toSpanish(fuelTypeMap, vehicle.fuel) ?? vehicle.fuel) : '—'}</span>
              </div>
              {/* Transmisión */}
              <div className="flex items-center gap-2 text-sm text-lighttext/70 dark:text-darktext/70">
                <div className="w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg flex items-center justify-center flex-shrink-0">
                  <IconManualGearbox size={16} />
                </div>
                <span className="truncate">{vehicle.transmission ? capitalize(toSpanish(transmissionMap, vehicle.transmission) ?? vehicle.transmission) : '—'}</span>
              </div>
            </div>

            {/* Condiciones comerciales */}
            {vehicle.commercial_conditions && (
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {vehicle.commercial_conditions.financing && vehicle.commercial_conditions.financing.length > 0 && (
                  <Chip className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1" size="sm">
                    <IconCreditCard size={12} />
                    Financiamiento
                  </Chip>
                )}
                {vehicle.commercial_conditions.bonuses && vehicle.commercial_conditions.bonuses.length > 0 && (
                  <Chip className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1" size="sm">
                    <IconGift size={12} />
                    Bonos
                  </Chip>
                )}
                {vehicle.commercial_conditions.discounts && vehicle.commercial_conditions.discounts.length > 0 && (
                  <Chip className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1" size="sm">
                    <IconTag size={12} />
                    Descuentos
                  </Chip>
                )}
              </div>
            )}

            {/* Métricas de rendimiento */}
            <div className="flex items-center gap-4 mt-auto pt-3 border-t border-lightborder/10 dark:border-darkborder/10">
              <div className="flex items-center gap-1.5">
                <IconEye size={16} className="text-blue-500" />
                <span className="text-sm font-semibold text-lighttext dark:text-darktext">{vehicle.vistas || 0}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">vistas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <IconPointer size={16} className="text-green-500" />
                <span className="text-sm font-semibold text-lighttext dark:text-darktext">{vehicle.clics || 0}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">clics</span>
              </div>
              {vehicle.vistas && vehicle.vistas > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400">CTR:</span>
                  <span className="text-sm font-semibold text-primary">
                    {((vehicle.clics || 0) / vehicle.vistas * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Panel de acciones lateral */}
          <div className="relative flex flex-col items-center justify-center gap-2 p-4 border-l border-lightborder/10 dark:border-darkborder/10 bg-lightbg/30 dark:bg-darkbg/30 rounded-r-2xl">
            <CircleButton
              type="button"
              onClick={handleBoost}
              className="relative z-30"
              aria-label="Impulsar publicación"
              size={40}
              variant="default"
            >
              <span className={`text-lg drop-shadow-lg select-none ${vehicle.featured ? '' : 'opacity-40 grayscale'}`} style={{color: '#FFB300'}}>
                {'\u26A1'}
              </span>
            </CircleButton>

            <CircleButton
              type="button"
              onClick={handleView}
              className="relative z-30"
              aria-label="Ver publicación"
              size={40}
              variant="default"
            >
              <IconEye size={20} stroke={1.5} />
            </CircleButton>

            <CircleButton
              type="button"
              onClick={handleEdit}
              className="relative z-30"
              aria-label="Editar publicación"
              size={40}
              variant="default"
            >
              <IconEdit size={20} stroke={1.5} />
            </CircleButton>

            <CircleButton
              type="button"
              onClick={toggleMenu}
              className="relative z-30"
              aria-label="Más opciones"
              size={40}
              variant="default"
            >
              <IconDots size={20} stroke={1.5} />
            </CircleButton>
          </div>
        </div>

        {/* Menú desplegable para layout horizontal */}
        {menuOpen && (
          <div className="fixed z-[9999] w-44 bg-lightcard dark:bg-darkcard border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl py-2 animate-fadeIn" style={{top: '50%', right: '1rem', transform: 'translateY(-50%)'}}>
            {/* Opciones de estado - PRIMERO */}
            {vehicle.estadoPublicacion === 'Borrador' && (
              <button onClick={handlePublish} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                <IconPlayerPlay size={16} className="text-green-600 dark:text-green-400"/> Publicar
              </button>
            )}
            {vehicle.estadoPublicacion === 'Publicado' && (
              <button onClick={handlePause} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                <IconPlayerPause size={16} className="text-amber-600 dark:text-amber-400"/> Pausar
              </button>
            )}
            {vehicle.estadoPublicacion === 'Pausado' && (
              <>
                <button onClick={handlePublish} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                  <IconPlayerPlay size={16} className="text-green-600 dark:text-green-400"/> Publicar
                </button>
                <button onClick={handleDraft} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                  <IconFileText size={16} className="text-gray-600 dark:text-gray-400"/> Pasar a borrador
                </button>
              </>
            )}

            {/* Separador */}
            {vehicle.estadoPublicacion && <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>}

            <button onClick={handleView} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
              <IconEye size={16}/> Ver publicación
            </button>

            {/* Separador */}
            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

            <button onClick={handleDuplicate} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
              <IconCopy size={16}/> Duplicar
            </button>
            <button onClick={handleDelete} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-left transition">
              <IconTrash size={16}/> Eliminar
            </button>
          </div>
        )}

        {/* Modal de Slots */}
        {showSlotsModal && userId && (
          <BoostSlotsModal
            userId={userId}
            vehicleId={vehicle.id}
            vehicleTitle={vehicle.titulo}
            listingType={(vehicle.listing_type || 'sale') as 'sale' | 'rent' | 'auction'}
            onClose={handleSlotsModalClose}
            onSuccess={handleSlotsModalSuccess}
          />
        )}
      </div>
    );
  }

  // Versión VERTICAL (grid) - con ancho máximo reducido
  return (
    <div
      ref={cardRef}
      className={`group relative bg-lightcard dark:bg-darkcard rounded-3xl shadow-card hover:shadow-card-hover transition ring-1 ring-black/5 dark:ring-white/5 overflow-hidden flex flex-col w-full max-w-[280px] mx-auto cursor-pointer ${className}`}
      onClick={handleCardClick}
    >
      {/* Slider de imágenes - mismo tamaño que VehicleCard */}
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-lightbg dark:bg-darkbg">
        {images.map((img, i) => (
          <img
            key={i}
            src={img}
            alt={vehicle.titulo}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i === index ? 'opacity-100' : 'opacity-0'}`}
            loading={i===0?'eager':'lazy'}
          />
        ))}

        {/* Badge de Destacado - Solo icono sin círculo */}
        {vehicle.featured && (
          <span className="absolute top-2 left-2 z-20 text-2xl drop-shadow-lg select-none" style={{color: '#FFB300'}}>
            {'\u26A1'}
          </span>
        )}

        {/* Badge de Estado de Publicación - SOLO 'Publicado', centrado arriba */}
        {vehicle.estadoPublicacion === 'Publicado' && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm shadow-lg bg-green-500/95 text-white">
            Publicado
          </div>
        )}

        {/* Controles del slider */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e)=>{e.stopPropagation(); go(-1);}}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-md hover:bg-white dark:hover:bg-gray-700 transition flex items-center justify-center"
              aria-label="Anterior"
            >
              <IconChevronLeft size={20} className="text-gray-700 dark:text-gray-200" />
            </button>
            <button
              type="button"
              onClick={(e)=>{e.stopPropagation(); go(1);}}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-md hover:bg-white dark:hover:bg-gray-700 transition flex items-center justify-center"
              aria-label="Siguiente"
            >
              <IconChevronRight size={20} className="text-gray-700 dark:text-gray-200" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {images.slice(0,5).map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i===index ? 'bg-white w-6' : 'bg-white/60 w-1.5'}`} />
              ))}
            </div>
          </>
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/5" />
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
                    <span className="text-2xl font-bold leading-tight">${rentInfo.amount.toLocaleString('es-CL')}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{rentInfo.label}</span>
                  </div>
                );
              }
              return <span className="text-xl text-gray-400 leading-tight">Sin precio</span>;
            }

            // Precio de subasta
            if (listingType === 'auction') {
              const auctionStart = (vehicle as any).auction_start_price || extraSpecs?.auction_start_price;
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
            return <span className="text-2xl font-bold leading-tight">${vehicle.precio?.toLocaleString('es-CL') || '0'}</span>;
          })()}
        </div>

        {/* Badges y Ubicación: Tipo de publicación + Estado vehículo + Ubicación */}
        <div className="flex justify-between gap-1.5 overflow-x-auto no-scrollbar w-full">
          <Chip className={`${listingTypeClasses} px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0`} size="sm">
            {listingTypeLabel}
          </Chip>
          <Chip className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0" size="sm">
            {conditionLabel}
          </Chip>
          <Chip variant="subtle" size="sm" className="flex items-center gap-1 min-w-0 flex-shrink">
            <IconMapPin size={14} stroke={1.5} className="flex-shrink-0" />
            <span className="truncate max-w-[100px]">{vehicle.commune || 'Sin ubicación'}</span>
          </Chip>
        </div>

        {/* Grid de especificaciones - 4 columnas: Tipo, Kilometraje, Combustible, Transmisión */}
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
                const label = vehicle.type_label;
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
            <span className="text-center leading-tight">{(() => {
              const km = vehicle.mileage ?? 0;
              return km >= 1000 ? `${Math.round(km / 1000)}k km` : `${km} km`;
            })()}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg flex items-center justify-center flex-shrink-0">
              <IconEngine size={16} stroke={1.5} />
            </div>
            <span className="text-center leading-tight">{capitalize(toSpanish(fuelTypeMap, vehicle.fuel || extraSpecs?.fuel_type || extraSpecs?.legacy?.fuel_legacy || extraSpecs?.fuel) || '—')}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg flex items-center justify-center flex-shrink-0">
              <IconManualGearbox size={16} stroke={1.5} />
            </div>
            <span className="text-center leading-tight">{capitalize(toSpanish(transmissionMap, vehicle.transmission || extraSpecs?.transmission || extraSpecs?.transmission_type || extraSpecs?.legacy?.transmission_legacy) || '—')}</span>
          </div>
        </div>

        {/* Condiciones comerciales */}
        {vehicle.commercial_conditions && (
          <div className="flex items-center justify-center gap-1.5 flex-wrap mb-2">
            {vehicle.commercial_conditions.financing && vehicle.commercial_conditions.financing.length > 0 && (
              <Chip className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1" size="sm">
                <IconCreditCard size={12} />
                Financiamiento
              </Chip>
            )}
            {vehicle.commercial_conditions.bonuses && vehicle.commercial_conditions.bonuses.length > 0 && (
              <Chip className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1" size="sm">
                <IconGift size={12} />
                Bonos
              </Chip>
            )}
            {vehicle.commercial_conditions.discounts && vehicle.commercial_conditions.discounts.length > 0 && (
              <Chip className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1" size="sm">
                <IconTag size={12} />
                Descuentos
              </Chip>
            )}
          </div>
        )}

        {/* Botones - mismo espaciado que VehicleCard */}
        <div className="flex items-center gap-2 pt-2">
          <CircleButton
            type="button"
            onClick={handleBoost}
            className="relative z-30"
            aria-label="Impulsar publicación"
            size={40}
            variant="default"
          >
            <span className={`text-lg drop-shadow-lg select-none ${vehicle.featured ? '' : 'opacity-40 grayscale'}`} style={{color: '#FFB300'}}>
              {'\u26A1'}
            </span>
          </CircleButton>
          <Button
            type="button"
            onClick={handleEdit}
            className="relative z-30 flex-1"
            variant="neutral"
            size="md"
            shape="pill"
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
              <div className="absolute bottom-full right-0 mb-1 z-[9999] w-44 bg-lightcard dark:bg-darkcard border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl py-2 animate-fadeIn">
                {/* Opciones de estado - PRIMERO */}
                {vehicle.estadoPublicacion === 'Borrador' && (
                  <button onClick={handlePublish} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                    <IconPlayerPlay size={16} className="text-green-600 dark:text-green-400"/> Publicar
                  </button>
                )}
                {vehicle.estadoPublicacion === 'Publicado' && (
                  <button onClick={handlePause} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                    <IconPlayerPause size={16} className="text-amber-600 dark:text-amber-400"/> Pausar
                  </button>
                )}
                {vehicle.estadoPublicacion === 'Pausado' && (
                  <>
                    <button onClick={handlePublish} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                      <IconPlayerPlay size={16} className="text-green-600 dark:text-green-400"/> Publicar
                    </button>
                    <button onClick={handleDraft} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                      <IconFileText size={16} className="text-gray-600 dark:text-gray-400"/> Pasar a borrador
                    </button>
                  </>
                )}

                {/* Separador */}
                {vehicle.estadoPublicacion && <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>}

                <button onClick={handleView} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                  <IconEye size={16}/> Ver publicación
                </button>

                {/* Separador */}
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

                <button onClick={handleDuplicate} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                  <IconCopy size={16}/> Duplicar
                </button>
                <button onClick={handleDelete} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-left transition">
                  <IconTrash size={16}/> Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de selección de slots */}
      {showSlotsModal && (
        <BoostSlotsModal
          vehicleId={vehicle.id}
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
