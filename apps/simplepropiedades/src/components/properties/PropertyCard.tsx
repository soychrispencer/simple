'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Property } from '@/types/property';
import { PROPERTY_TYPE_OPTIONS } from '@/types/property';
import { Button, CircleButton, ContactModal, UserAvatar } from '@simple/ui';
import { logDebug } from '@/lib/logger';
import {
  IconBath,
  IconBed,
  IconBookmark,
  IconBuilding,
  IconBuildingOff,
  IconBuildingStore,
  IconBuildingWarehouse,
  IconChevronLeft,
  IconChevronRight,
  IconDots,
  IconHome,
  IconMapPin,
  IconRuler2,
  IconScale,
  IconShare2,
  IconTrees,
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

function formatCurrency(value: number | null | undefined, currency = 'CLP') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Consultar precio';
  try {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${value.toLocaleString('es-CL')}`;
  }
}

function getPropertyTypeIcon(type: Property['property_type']) {
  const iconProps = { size: 16, stroke: 1.5 } as const;
  switch (type) {
    case 'house':
      return <IconHome {...iconProps} />;
    case 'apartment':
      return <IconBuilding {...iconProps} />;
    case 'commercial':
      return <IconBuildingStore {...iconProps} />;
    case 'land':
      return <IconTrees {...iconProps} />;
    case 'office':
      return <IconBuildingOff {...iconProps} />;
    case 'warehouse':
      return <IconBuildingWarehouse {...iconProps} />;
    default:
      return <IconHome {...iconProps} />;
  }
}

function getBadgeInfo(listingType: Property['listing_type']) {
  if (listingType === 'rent') {
    return {
      label: 'Arriendo',
      color: 'bg-[var(--color-warn-subtle-bg)] text-[var(--color-warn)]',
    };
  }
  return {
    label: 'Venta',
    color: 'bg-[var(--color-success-subtle-bg)] text-[var(--color-success)]',
  };
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
  showActions = true,
}: PropertyCardProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const images = property.image_urls?.length
    ? property.image_urls
    : property.thumbnail_url
      ? [property.thumbnail_url]
      : ['/placeholder-property.svg'];
  const totalImages = images.length;
  const imageUrl = images[currentImageIndex] || '/placeholder-property.svg';

  const propertyLabel =
    PROPERTY_TYPE_OPTIONS.find((opt) => opt.value === property.property_type)?.label || 'Propiedad';

  const displayPriceValue =
    property.listing_type === 'rent'
      ? property.rent_price ?? property.price
      : property.price ?? property.auction_current_bid ?? property.auction_start_price ?? null;
  const displayPrice = formatCurrency(displayPriceValue, property.currency || 'CLP');
  const priceSuffix = property.listing_type === 'rent' ? 'por mes' : '';

  const { label: badgeLabel, color: badgeColor } = getBadgeInfo(property.listing_type);

  const goToImage = (direction: number) => {
    if (totalImages <= 1) return;
    setCurrentImageIndex((prev) => (prev + direction + totalImages) % totalImages);
  };

  const navigate = () => {
    if (onClick) {
      onClick();
      return;
    }
    router.push(`/propiedad/${property.id}`);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && process.env.NODE_ENV !== 'production') {
            logDebug(`[PropertyCard] Property ${property.id} viewed`);
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [property.id]);

  const toggleMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setMenuOpen((prev) => !prev);
  };

  const onFavorite = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onFavoriteToggle?.(property.id);
    setMenuOpen(false);
  };

  const onShareClick = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (onShare) {
      onShare(property);
      setMenuOpen(false);
      return;
    }

    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/propiedad/${property.id}` : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: property.title, text: property.title, url: shareUrl });
      } else if (shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // No-op.
    } finally {
      setMenuOpen(false);
    }
  };

  const onCompareClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onCompare?.(property);
    setMenuOpen(false);
  };

  const renderSliderNav = () => {
    if (totalImages <= 1) return null;
    return (
      <>
        <button
          onClick={(event) => {
            event.stopPropagation();
            goToImage(-1);
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-lightbg dark:bg-darkbg border border-black/10 dark:border-white/10 shadow-card hover:bg-[var(--field-bg-hover)] transition flex items-center justify-center z-20 touch-manipulation"
          aria-label="Imagen anterior"
        >
          <IconChevronLeft size={22} />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            goToImage(1);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-lightbg dark:bg-darkbg border border-black/10 dark:border-white/10 shadow-card hover:bg-[var(--field-bg-hover)] transition flex items-center justify-center z-20 touch-manipulation"
          aria-label="Imagen siguiente"
        >
          <IconChevronRight size={22} />
        </button>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {images.slice(0, 5).map((_, index) => (
            <div
              key={index}
              className={`h-2.5 rounded-full shadow-card transition-all ${
                index === currentImageIndex ? 'bg-primary-500 w-7' : 'bg-border/80 w-2'
              }`}
            />
          ))}
        </div>
      </>
    );
  };

  const renderMenu = () =>
    menuOpen ? (
      <div className="absolute bottom-16 right-4 z-40 w-44 card-surface shadow-card rounded-xl py-2 animate-fadeIn">
        <button
          onClick={onFavorite}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--field-bg-hover)] text-left transition"
        >
          <IconBookmark size={16} stroke={1.5} fill={isFavorite ? 'currentColor' : 'none'} />
          {isFavorite ? 'Quitar de favoritos' : 'Favoritos'}
        </button>
        <button
          onClick={onShareClick}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--field-bg-hover)] text-left transition"
        >
          <IconShare2 size={16} stroke={1.5} /> Compartir
        </button>
        <button
          onClick={onCompareClick}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--field-bg-hover)] text-left transition"
        >
          <IconScale size={16} stroke={1.5} /> Comparar
        </button>
      </div>
    ) : null;

  if (layout === 'horizontal') {
    return (
      <div
        ref={cardRef}
        className="group relative card-surface rounded-2xl shadow-card hover:shadow-card transition cursor-pointer"
        onClick={navigate}
      >
        <div className="flex flex-row items-stretch gap-0">
          <div className="relative w-40 sm:w-72 flex-shrink-0 card-surface/90 shadow-card rounded-l-2xl overflow-hidden">
            <div className="relative w-full h-full aspect-[4/3] overflow-hidden">
              <img
                src={imageUrl}
                alt={property.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading={priority ? 'eager' : 'lazy'}
              />
              {renderSliderNav()}
              {property.featured && (
                <span className="absolute top-3 left-3 z-20 text-xl drop-shadow-md select-none text-[var(--color-warn)]">
                  {'\u26A1'}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col p-4 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-2">
              <h3 className="font-bold text-[15px] sm:text-lg leading-tight line-clamp-2 min-w-0">{property.title}</h3>
              <div className="text-left sm:text-right flex-shrink-0">
                <div className="flex flex-col leading-tight items-start sm:items-end">
                  <span className="text-lg sm:text-2xl font-bold whitespace-nowrap">{displayPrice}</span>
                  <span className="text-xs text-lighttext/70 dark:text-darktext/70 whitespace-nowrap">
                    {priceSuffix || '\u00A0'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2 overflow-hidden">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${badgeColor}`}>
                {badgeLabel}
              </span>
              <span className="px-2 py-0.5 rounded-full card-surface shadow-card text-lighttext/80 dark:text-darktext/80 text-xs font-medium flex items-center gap-1 min-w-0 whitespace-nowrap flex-shrink max-w-[220px]">
                <IconMapPin size={14} className="flex-shrink-0" />
                <span className="truncate">{[property.city, property.region].filter(Boolean).join(', ') || 'Sin ubicación'}</span>
              </span>
            </div>

            <div className="flex items-center gap-3 mb-2 overflow-hidden">
              <div className="flex items-center gap-2 min-w-0 text-xs sm:text-sm text-lighttext/70 dark:text-darktext/70">
                <div className="w-7 h-7 rounded-full card-surface shadow-card flex items-center justify-center flex-shrink-0">
                  {getPropertyTypeIcon(property.property_type)}
                </div>
                <span className="truncate">{propertyLabel}</span>
              </div>
              <div className="flex items-center gap-2 min-w-0 text-xs sm:text-sm text-lighttext/70 dark:text-darktext/70">
                <div className="w-7 h-7 rounded-full card-surface shadow-card flex items-center justify-center flex-shrink-0">
                  <IconRuler2 size={16} stroke={1.5} />
                </div>
                <span className="truncate">{property.area_m2 || 0} m²</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 min-w-0 text-xs sm:text-sm text-lighttext/70 dark:text-darktext/70">
                <div className="w-7 h-7 rounded-full card-surface shadow-card flex items-center justify-center flex-shrink-0">
                  <IconBed size={16} stroke={1.5} />
                </div>
                <span className="truncate">{property.bedrooms || 0} hab</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 min-w-0 text-xs sm:text-sm text-lighttext/70 dark:text-darktext/70">
                <div className="w-7 h-7 rounded-full card-surface shadow-card flex items-center justify-center flex-shrink-0">
                  <IconBath size={16} stroke={1.5} />
                </div>
                <span className="truncate">{property.bathrooms || 0} baños</span>
              </div>
            </div>

            {showActions && (
              <>
                <div className="mt-auto pt-2 flex items-center gap-2">
                  <CircleButton
                    onClick={(event) => event.stopPropagation()}
                    aria-label="Ver perfil del propietario"
                    size={36}
                    variant="default"
                    className="relative z-30 flex-shrink-0"
                  >
                    <UserAvatar
                      src={property.owner?.avatar_url}
                      alt={property.owner?.full_name || 'Propietario'}
                      size={36}
                    />
                  </CircleButton>
                  <Button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setContactModalOpen(true);
                    }}
                    className="relative z-30 flex-1"
                    variant="outline"
                    size="md"
                  >
                    Contactar
                  </Button>
                  <CircleButton
                    type="button"
                    onClick={toggleMenu}
                    className="relative z-30 flex-shrink-0"
                    aria-label="Más opciones"
                    size={36}
                    variant="default"
                  >
                    <IconDots size={18} stroke={1.5} />
                  </CircleButton>
                </div>
                {renderMenu()}
              </>
            )}
          </div>
        </div>

        <ContactModal
          isOpen={contactModalOpen}
          onClose={() => setContactModalOpen(false)}
          contactName={property.owner?.full_name || 'Propietario'}
          contextTitle={property.title}
          email={property.owner?.email}
          phone={property.owner?.phone}
          contextType="profile"
        />
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className="group relative card-surface rounded-3xl shadow-card hover:shadow-card transition overflow-hidden flex flex-col w-full cursor-pointer"
      onClick={navigate}
    >
      <div className="relative w-full aspect-[16/10] overflow-hidden card-surface/90 shadow-card">
        <img
          src={imageUrl}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading={priority ? 'eager' : 'lazy'}
        />
        {renderSliderNav()}
        <div className="absolute inset-0 bg-[var(--overlay-scrim-8)]" />

        {property.featured && (
          <span className="absolute top-2 left-2 z-30 text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" title="Publicación Impulsada">
            {'\u26A1'}
          </span>
        )}
      </div>

      <div className="relative px-4 py-4 flex flex-col gap-2.5">
        <h3 className="font-bold text-lg leading-tight line-clamp-2 text-center min-h-[2.5rem]">{property.title}</h3>

        <div className="text-center min-h-[3rem] flex items-center justify-center">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold leading-tight">{displayPrice}</span>
            <span className="text-[10px] text-lighttext/60 dark:text-darktext/60 leading-tight">{priceSuffix || '\u00A0'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar w-full">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${badgeColor}`}>
            {badgeLabel}
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium card-surface shadow-card text-lighttext/80 dark:text-darktext/80 flex items-center gap-1 min-w-0 flex-shrink">
            <IconMapPin size={14} stroke={1.5} className="flex-shrink-0" />
            <span className="truncate max-w-[120px]">
              {[property.city, property.region].filter(Boolean).join(', ') || 'Sin ubicación'}
            </span>
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center text-xs border-t border-border/60 dark:border-darkborder/35 pt-2.5">
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full card-surface shadow-card flex items-center justify-center flex-shrink-0">
              {getPropertyTypeIcon(property.property_type)}
            </div>
            <span className="text-center leading-tight">{propertyLabel}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full card-surface shadow-card flex items-center justify-center flex-shrink-0">
              <IconRuler2 size={16} stroke={1.5} />
            </div>
            <span className="text-center leading-tight">{property.area_m2 || 0}m²</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full card-surface shadow-card flex items-center justify-center flex-shrink-0">
              <IconBed size={16} stroke={1.5} />
            </div>
            <span className="text-center leading-tight">{property.bedrooms || 0}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full card-surface shadow-card flex items-center justify-center flex-shrink-0">
              <IconBath size={16} stroke={1.5} />
            </div>
            <span className="text-center leading-tight">{property.bathrooms || 0}</span>
          </div>
        </div>

        {showActions && (
          <>
            <div className="flex items-center gap-2 pt-2">
              <CircleButton
                onClick={(event) => event.stopPropagation()}
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
                onClick={(event) => {
                  event.stopPropagation();
                  setContactModalOpen(true);
                }}
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
            {renderMenu()}
          </>
        )}
      </div>

      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        contactName={property.owner?.full_name || 'Propietario'}
        contextTitle={property.title}
        email={property.owner?.email}
        phone={property.owner?.phone}
        contextType="profile"
      />
    </div>
  );
}
