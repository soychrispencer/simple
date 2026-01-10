'use client';
import { useState, useRef, useEffect } from 'react';
import type { Property } from '@/types/property';
import { PROPERTY_TYPE_OPTIONS } from '@/types/property';
import { CircleButton, UserAvatar, Button } from '@simple/ui';
import { LeadContactModal } from '@simple/ui';
import { AuctionBidding } from './AuctionBidding';
import { getSupabaseClient } from '@/lib/supabase/supabase';
import { logDebug } from '@/lib/logger';
import {
  IconBookmark,
  IconShare2,
  IconScale,
  IconDots,
  IconMapPin,
  IconBed,
  IconBath,
  IconRuler2,
  IconHome,
  IconBuilding,
  IconBuildingStore,
  IconTrees,
  IconBuildingOff,
  IconBuildingWarehouse,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';

interface PropertyCardProps {
  property: Property;
  priority?: boolean;
  layout?: 'vertical' | 'horizontal';
  onClick?: () => void;
  onFavoriteToggle?: (propertyId: string) => void;
  onShare?: (property: Property) => void;
  onCompare?: (property: Property) => void;
  isFavorite?: boolean;
  showActions?: boolean;
}

export default function PropertyCard({ 
  property, 
  priority = false,
  layout = 'vertical',
  onClick,
  onFavoriteToggle,
  onShare,
  onCompare,
  isFavorite = false,
  showActions = true
}: PropertyCardProps) {
  const {
    id,
    title,
    property_type,
    listing_type,
    price,
    rent_price,
    city,
    region,
    bedrooms,
    bathrooms,
    area_m2,
    image_urls,
    thumbnail_url,
    featured,
    auction_current_bid,
    auction_start_price,
    auction_end_at,
    auction_bid_count,
  } = property;

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const totalImages = image_urls?.length || 0;

  // Sistema de métricas con IntersectionObserver
  useEffect(() => {
    if (!cardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Track view event
            if (process.env.NODE_ENV !== 'production') {
              logDebug(`[PropertyCard] Property ${id} viewed`);
            }
            // TODO: Send view event to analytics/metrics service
          }
        });
      },
      {
        threshold: 0.5, // Consider viewed when 50% visible
        rootMargin: '0px 0px -100px 0px' // Trigger slightly before fully visible
      }
    );

    observer.observe(cardRef.current);

    return () => {
      observer.disconnect();
    };
  }, [id]);

  // Obtener el ícono del tipo de propiedad
  const propertyTypeInfo = PROPERTY_TYPE_OPTIONS.find((opt: { value: string; label: string; icon: string }) => opt.value === property_type);
  const propertyLabel = propertyTypeInfo?.label || 'Propiedad';

  // Formatear precio
  const formatPrice = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const displayPrice = listing_type === 'rent' && rent_price 
    ? formatPrice(rent_price) 
    : listing_type === 'auction' && auction_current_bid
    ? formatPrice(auction_current_bid)
    : formatPrice(price);

  const priceLabel = listing_type === 'rent' ? '/mes' : listing_type === 'auction' ? ' (oferta actual)' : '';

  // URL de la imagen

  // Badge de tipo de listado
  const getBadgeInfo = () => {
    switch (listing_type) {
      case 'sale':
        return { label: 'Venta', color: 'bg-[var(--color-success-subtle-bg)] text-[var(--color-success)]' };
      case 'rent':
        return { label: 'Arriendo', color: 'bg-[var(--color-warn-subtle-bg)] text-[var(--color-warn)]' };
      case 'auction':
        return { label: 'Subasta', color: 'bg-[var(--color-primary-a10)] text-[var(--color-primary)]' };
      default:
        return { label: 'Propiedad', color: 'card-surface ring-1 ring-border/60 text-lighttext/80 dark:text-darktext/80' };
    }
  };

  const { label: badgeLabel, color: badgeColor } = getBadgeInfo();

  // Navegación de imágenes
  const goToImage = (direction: number) => {
    setCurrentImageIndex(i => (i + direction + totalImages) % totalImages);
  };

  // Funciones de acciones
  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  const actFavFromMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFavoriteToggle?.(id);
    setMenuOpen(false);
  };

  const actShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onShare?.(property);
    setMenuOpen(false);
  };

  const actCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCompare?.(property);
    setMenuOpen(false);
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Navegar al perfil del propietario
    // TODO: Implementar navegación al perfil
  };

  const navigate = () => {
    if (onClick) {
      onClick();
    } else {
      // Default navigation to property page
      window.location.href = `/propiedad/${id}`;
    }
  };

  // Función para calcular tiempo restante de subasta
  const getAuctionTimeRemaining = () => {
    if (!auction_end_at) return null;
    const endTime = new Date(auction_end_at).getTime();
    const now = new Date().getTime();
    const remaining = endTime - now;
    
    if (remaining <= 0) return 'Finalizada';
    
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const auctionTimeRemaining = getAuctionTimeRemaining();

  // Función para renderizar imágenes
  const renderImages = () => {
    const imageUrl = image_urls[currentImageIndex] || thumbnail_url || '/placeholder-property.svg';
    return (
      <img
        src={imageUrl}
        alt={title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        loading={priority ? 'eager' : 'lazy'}
      />
    );
  };

  // Función para renderizar navegación del slider
  const renderSliderNav = () => {
    if (totalImages <= 1) return null;

    return (
      <>
        <button
          onClick={(e) => { e.stopPropagation(); goToImage(-1); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-lightcard/90 dark:bg-darkcard/90 backdrop-blur-sm shadow-md hover:bg-lightcard dark:hover:bg-darkbg transition flex items-center justify-center z-20"
          aria-label="Imagen anterior"
        >
          <IconChevronLeft size={20} className="text-lighttext dark:text-darktext" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); goToImage(1); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-lightcard/90 dark:bg-darkcard/90 backdrop-blur-sm shadow-md hover:bg-lightcard dark:hover:bg-darkbg transition flex items-center justify-center z-20"
          aria-label="Imagen siguiente"
        >
          <IconChevronRight size={20} className="text-lighttext dark:text-darktext" />
        </button>

        {/* Indicador de posición */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
          {image_urls?.slice(0,5).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition ${
                i === currentImageIndex ? 'bg-[var(--overlay-highlight-90)]' : 'bg-[var(--overlay-highlight-60)]'
              }`}
            />
          ))}
        </div>
      </>
    );
  };

  // Layout horizontal (condicional)
  if (layout === 'horizontal') {
    return (
      <div 
        ref={cardRef}
        className="group relative bg-lightcard dark:bg-darkcard rounded-3xl shadow-card hover:shadow-card-hover transition ring-1 ring-border/60 overflow-hidden flex flex-col w-full cursor-pointer"
        onClick={navigate}
      >
        <div className="flex items-stretch gap-0">
          {/* Galería de imágenes con navegación */}
          <div className="relative w-64 flex-shrink-0 bg-lightbg dark:bg-darkbg rounded-l-2xl overflow-hidden">
            <div className="relative w-full h-full aspect-[4/3] overflow-hidden">
              {renderImages()}

              {/* Controles de navegación de imágenes */}
              {renderSliderNav()}

              {/* Badge impulsado - Icono de rayo */}
              {featured && (
                <span className="absolute top-3 left-3 z-20 text-2xl drop-shadow-lg select-none text-[var(--color-warn)]">
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
                  {title}
                </h3>

                {/* Badges de tipo publicación, estado y ubicación */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>{badgeLabel}</span>
                  <span className="px-2 py-0.5 rounded-full card-surface ring-1 ring-border/60 text-xs font-medium flex items-center gap-1 min-w-0 text-lighttext/80 dark:text-darktext/80">
                    <IconMapPin size={14} className="flex-shrink-0" />
                    <span className="truncate max-w-[100px]">
                      {city}, {region}
                    </span>
                  </span>
                </div>
              </div>

              {/* Precio destacado */}
              <div className="text-right flex-shrink-0">
                <div className="flex flex-col leading-tight">
                  <span className="text-2xl font-bold text-lighttext dark:text-darktext">{displayPrice}{priceLabel}</span>
                  {listing_type === 'auction' && auctionTimeRemaining && (
                    <span className="text-xs text-primary font-medium">
                      ⏰ {auctionTimeRemaining} restantes
                    </span>
                  )}
                  {listing_type === 'auction' && auction_bid_count && auction_bid_count > 0 && (
                    <span className="text-xs text-lighttext/70 dark:text-darktext/70">
                      {auction_bid_count} ofertas
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Especificaciones principales */}
            <div className="flex items-center justify-start gap-4 mb-3">
              {/* Tipo de propiedad */}
              <div className="flex items-center gap-2 text-sm text-lighttext/70 dark:text-darktext/70">
                <div className="w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg flex items-center justify-center flex-shrink-0">
                  {(() => {
                    switch (property_type) {
                      case 'house': return <IconHome size={16} stroke={1.5} />;
                      case 'apartment': return <IconBuilding size={16} stroke={1.5} />;
                      case 'commercial': return <IconBuildingStore size={16} stroke={1.5} />;
                      case 'land': return <IconTrees size={16} stroke={1.5} />;
                      case 'office': return <IconBuildingOff size={16} stroke={1.5} />;
                      case 'warehouse': return <IconBuildingWarehouse size={16} stroke={1.5} />;
                      default: return <IconHome size={16} stroke={1.5} />;
                    }
                  })()}
                </div>
                <span className="truncate">
                  {propertyLabel}
                </span>
              </div>
              {/* Superficie */}
              <div className="flex items-center gap-2 text-sm text-lighttext/70 dark:text-darktext/70">
                <div className="w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg flex items-center justify-center flex-shrink-0">
                  <IconRuler2 size={16} />
                </div>
                <span className="truncate">{area_m2}m²</span>
              </div>
              {/* Habitaciones */}
              {bedrooms > 0 && (
                <div className="flex items-center gap-2 text-sm text-lighttext/70 dark:text-darktext/70">
                  <div className="w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg flex items-center justify-center flex-shrink-0">
                    <IconBed size={16} />
                  </div>
                  <span className="truncate">{bedrooms} hab</span>
                </div>
              )}
              {/* Baños */}
              {bathrooms > 0 && (
                <div className="flex items-center gap-2 text-sm text-lighttext/70 dark:text-darktext/70">
                  <div className="w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg flex items-center justify-center flex-shrink-0">
                    <IconBath size={16} />
                  </div>
                  <span className="truncate">{bathrooms} baños</span>
                </div>
              )}
            </div>
          </div>

          {/* Panel de acciones lateral */}
          {showActions && (
            <div className="relative flex flex-col items-center justify-center gap-2 p-4 border-l border-lightborder/10 dark:border-darkborder/10 bg-lightbg/30 dark:bg-darkbg/30 rounded-r-2xl">
              <CircleButton
                onClick={handleAvatarClick}
                aria-label="Ver perfil del propietario"
                size={40}
                variant="default"
                className="relative z-30 flex-shrink-0"
              >
                <UserAvatar
                  src={property.owner?.avatar_url}
                  alt={property.owner?.full_name || 'Propietario'}
                  size={40}
                />
              </CircleButton>
              <CircleButton
                type="button"
                onClick={(e) => { e.stopPropagation(); setContactModalOpen(true); }}
                aria-label={listing_type === 'auction' ? "Participar en subasta" : "Contactar al propietario"}
                size={40}
                variant="default"
                className="relative z-30 flex-shrink-0"
              >
                <IconDots size={18} stroke={1.5} />
              </CircleButton>
            </div>
          )}

          {/* Menú desplegable para layout horizontal */}
          {menuOpen && (
            <div className="absolute bottom-16 right-4 z-40 w-44 bg-lightcard dark:bg-darkcard border border-border/60 shadow-xl rounded-xl py-2 animate-fadeIn">
              <button onClick={actFavFromMenu} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
                <IconBookmark size={16} stroke={1.5} fill={isFavorite ? "currentColor" : "none"} /> {isFavorite ? 'Quitar de favoritos' : 'Favoritos'}
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
        <LeadContactModal
          isOpen={contactModalOpen}
          onClose={() => setContactModalOpen(false)}
          contactName={property.owner?.full_name || 'Propietario'}
          contextTitle={title}
          email={property.owner?.email}
          phone={property.owner?.phone}
          contextType="property"
          isAuction={listing_type === 'auction'}
          auctionComponent={
            listing_type === 'auction' ? (
              <AuctionBidding
                propertyId={id}
                currentBid={auction_current_bid || auction_start_price || 0}
                minBid={auction_current_bid ? auction_current_bid + 1000000 : auction_start_price || 0}
                endTime={auction_end_at || undefined}
                onBidPlaced={(bid) => {
                  // Aquí se podría actualizar el estado local o recargar datos
                  if (process.env.NODE_ENV !== 'production') {
                    logDebug('[PropertyCard] Nueva oferta', bid);
                  }
                }}
              />
            ) : undefined
          }
          supabaseClient={getSupabaseClient()}
        />
      </div>
    );
  }

  // Layout vertical (por defecto - página principal)
  return (
    <div 
      ref={cardRef}
      className="group relative bg-lightcard dark:bg-darkcard rounded-3xl shadow-card hover:shadow-card-hover transition ring-1 ring-border/60 overflow-hidden flex flex-col w-full cursor-pointer"
      onClick={navigate}
    >
      {/* Slider de imágenes - más compacto */}
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-lightbg dark:bg-darkbg">
        {renderImages()}
        {renderSliderNav()}
        <div className="absolute inset-0 bg-[var(--overlay-scrim-10)]" />
        
        {/* Badge impulsado - Icono de rayo */}
        {featured && (
          <span className="absolute top-2 left-2 z-30 text-2xl drop-shadow-[0_2px_4px_var(--overlay-scrim-50)]">
            ⚡
          </span>
        )}
      </div>

      {/* Contenido - más compacto */}
      <div className="relative px-4 py-4 flex flex-col gap-2.5">
        {/* Título de la propiedad */}
        <h3 className="font-bold text-lg leading-tight line-clamp-2 text-center min-h-[2.5rem]">
          {title}
        </h3>

        {/* Precio - más compacto */}
        <div className="text-center min-h-[3rem] flex items-center justify-center">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold leading-tight">${price.toLocaleString('es-CL')}</span>
            {listing_type === 'rent' && <span className="text-xs text-lighttext/70 dark:text-darktext/70 leading-tight">por mes</span>}
          </div>
        </div>

        {/* Badges y Ubicación: Tipo de publicación + Ubicación - más compactos */}
        <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar w-full">
          {/* Tipo de publicación */}
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${badgeColor}`}>
            {badgeLabel}
          </span>
          {/* Ubicación */}
          <span className="px-2.5 py-1 rounded-full text-xs font-medium card-surface ring-1 ring-border/60 flex items-center gap-1 min-w-0 flex-shrink text-lighttext/80 dark:text-darktext/80">
            <IconMapPin size={14} stroke={1.5} className="flex-shrink-0" />
            <span className="truncate max-w-[100px]">
              {city}, {region}
            </span>
          </span>
        </div>

        {/* Especificaciones en fila horizontal */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs border-t border-border/60 pt-2.5">
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg flex items-center justify-center flex-shrink-0">
              {(() => {
                switch (property_type) {
                  case 'house': return <IconHome size={16} stroke={1.5} />;
                  case 'apartment': return <IconBuilding size={16} stroke={1.5} />;
                  case 'commercial': return <IconBuildingStore size={16} stroke={1.5} />;
                  case 'land': return <IconTrees size={16} stroke={1.5} />;
                  case 'office': return <IconBuildingOff size={16} stroke={1.5} />;
                  case 'warehouse': return <IconBuildingWarehouse size={16} stroke={1.5} />;
                  default: return <IconHome size={16} stroke={1.5} />;
                }
              })()}
            </div>
            <span className="text-center leading-tight">
              {propertyLabel}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg flex items-center justify-center flex-shrink-0">
              <IconRuler2 size={16} stroke={1.5} />
            </div>
            <span className="text-center leading-tight">{area_m2}m²</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg flex items-center justify-center flex-shrink-0">
              <IconBed size={16} stroke={1.5} />
            </div>
            <span className="text-center leading-tight">{bedrooms || 0}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-lightbg dark:bg-darkbg flex items-center justify-center flex-shrink-0">
              <IconBath size={16} stroke={1.5} />
            </div>
            <span className="text-center leading-tight">{bathrooms || 0}</span>
          </div>
        </div>

        {/* Botones de acción - usando componentes Button y CircleButton */}
        {showActions && (
          <div className="flex items-center gap-2 pt-2">
            <CircleButton 
              onClick={handleAvatarClick}
              aria-label="Ver perfil del propietario" 
              size={40} 
              variant="default" 
              className="relative z-30 flex-shrink-0"
            >
              <UserAvatar
                src={property.owner?.avatar_url}
                alt={property.owner?.full_name || 'Propietario'}
                size={40}
              />
            </CircleButton>
            <Button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); setContactModalOpen(true); }} 
              className="relative z-30 flex-1" 
              variant="neutral" 
              size="md" 
              shape="pill"
            >
              {listing_type === 'auction' ? 'Ofertar' : 'Contactar'}
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
        )}

        {/* Menú desplegable */}
        {menuOpen && (
          <div className="absolute bottom-16 right-4 z-40 w-44 bg-lightcard dark:bg-darkcard border border-border/60 shadow-xl rounded-xl py-2 animate-fadeIn">
            <button onClick={actFavFromMenu} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-lightbg dark:hover:bg-darkbg text-left transition">
              <IconBookmark size={16} stroke={1.5} fill={isFavorite ? "currentColor" : "none"} /> {isFavorite ? 'Quitar de favoritos' : 'Favoritos'}
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
      <LeadContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        contactName={property.owner?.full_name || 'Propietario'}
        contextTitle={title}
        email={property.owner?.email}
        phone={property.owner?.phone}
        contextType="property"
        isAuction={listing_type === 'auction'}
        auctionComponent={
          listing_type === 'auction' ? (
            <AuctionBidding
              propertyId={id}
              currentBid={auction_current_bid || auction_start_price || 0}
              minBid={auction_current_bid ? auction_current_bid + 1000000 : auction_start_price || 0}
              endTime={auction_end_at || undefined}
              onBidPlaced={(bid) => {
                // Aquí se podría actualizar el estado local o recargar datos
                if (process.env.NODE_ENV !== 'production') {
                    logDebug('[PropertyCard] Nueva oferta', bid);
                }
              }}
            />
          ) : undefined
        }
        supabaseClient={getSupabaseClient()}
      />
    </div>
  );
}
