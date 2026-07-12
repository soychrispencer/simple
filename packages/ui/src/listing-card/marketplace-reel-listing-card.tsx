'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import {
    IconBookmark,
    IconBookmarkFilled,
    IconBuildingStore,
    IconChevronLeft,
    IconChevronRight,
    IconDotsVertical,
    IconMapPin,
    IconPlayerPause,
    IconPlayerPlay,
    IconVolume,
    IconVolumeOff,
} from '@tabler/icons-react';
import { formatListingPrice, LISTING_IMAGE_WIDTHS, optimizeListingImageUrl } from '@simple/utils';
import type { ListingMode, ListingAccent } from './types';
import { joinClasses } from '../shared/join-classes';
import {
    MarketplaceReelShareMenu,
    buildDefaultReelShareMenuItems,
    type MarketplaceReelShareMenuItem,
} from './marketplace-reel-share-menu';
import { LISTING_CARD_COMMERCIAL_ASPECT } from './shared/card-layout';
import { abbreviateListingSpecLabel, reelSpecPlaceholder, shortenListingLocation } from './shared/build-reel-specs';

export type MarketplaceReelSpec = {
    icon?: ReactNode;
    label: string;
};

export type MarketplaceReelChip = {
    label: string;
    tone?: 'neutral' | 'accent';
    icon?: ReactNode;
};

type MediaItem =
    | { type: 'video'; url: string; thumbnail?: string }
    | { type: 'image'; url: string; thumbnail?: string };

export type MarketplaceReelListingCardProps = {
    href: string;
    title: string;
    price: string;
    /** Precio lista; se muestra en el detalle, no en la card. */
    priceOriginal?: string;
    /** Badge de descuento junto al precio oferta. */
    discountPercent?: number;
    location: string;
    mode?: ListingMode;
    accent?: ListingAccent;
    ctaLabel?: string;
    images?: string[];
    videoUrl?: string;
    videoThumbnail?: string;
    specs?: MarketplaceReelSpec[];
    chips?: MarketplaceReelChip[];
    sellerName: string;
    sellerAvatarUrl?: string;
    sellerProfileHref?: string;
    savesCount?: number;
    isSaved?: boolean;
    onSave?: (event: React.MouseEvent) => void;
    onNavigate: () => void;
    onSellerNavigate?: () => void;
    shareText: string;
    shareMenuItems?: MarketplaceReelShareMenuItem[];
    onReport?: () => void;
    emptyMediaIcon?: ReactNode;
    emptyMediaLabel?: string;
    /** Vista previa del wizard: misma apariencia, sin navegación ni menús funcionales. */
    preview?: boolean;
    footerActions?: ReactNode;
    className?: string;
};

function formatCardPrice(price: string): string {
    return formatListingPrice(price);
}

/** YouTube/Vimeo no se reproducen con <video src>; usar solo fotos en la tarjeta. */
function isEmbedOnlyVideoUrl(url: string): boolean {
    try {
        const host = new URL(url.trim()).hostname.replace(/^www\./, '').toLowerCase();
        return host === 'youtube.com'
            || host === 'youtu.be'
            || host === 'm.youtube.com'
            || host === 'vimeo.com'
            || host.endsWith('.vimeo.com');
    } catch {
        return false;
    }
}

function isNativePlayableVideoUrl(url: string | undefined): url is string {
    const trimmed = url?.trim() ?? '';
    if (!trimmed) return false;
    if (isEmbedOnlyVideoUrl(trimmed)) return false;
    return trimmed.startsWith('blob:')
        || trimmed.startsWith('data:')
        || trimmed.startsWith('http');
}

function ReelSpecs({
    specs,
    list = false,
    accent = 'autos',
}: {
    specs: MarketplaceReelSpec[];
    list?: boolean;
    accent?: ListingAccent;
}) {
    const abbreviated = specs
        .slice(0, 4)
        .map((spec) => ({
            ...spec,
            label: abbreviateListingSpecLabel(spec.label),
        }))
        .filter((spec) => {
            const label = spec.label.trim();
            return Boolean(label) && label !== '—';
        });

    if (abbreviated.length === 0) return null;

    if (list) {
        return (
            <div className="marketplace-reel-card__specs marketplace-reel-card__specs--list">
                {abbreviated.map((spec, index) => (
                    <span key={`${spec.label}-${index}`} className="marketplace-reel-card__spec-pill">
                        {spec.icon ? <span className="marketplace-reel-card__spec-pill-icon">{spec.icon}</span> : null}
                        <span className="marketplace-reel-card__spec-pill-label">{spec.label}</span>
                    </span>
                ))}
            </div>
        );
    }

    // Solo tags con dato real: no rellenar a 4 con "—" (terreno/bodega suelen tener 2–3).
    return (
        <>
            {abbreviated.map((spec, index) => (
                <span
                    key={`${spec.label}-${index}`}
                    className="marketplace-reel-card__spec-stack"
                >
                    {spec.icon ? (
                        <span className="marketplace-reel-card__spec-stack-icon">{spec.icon}</span>
                    ) : (
                        <span className="marketplace-reel-card__spec-stack-icon">
                            {reelSpecPlaceholder(index, accent).icon}
                        </span>
                    )}
                    <span className="marketplace-reel-card__spec-stack-label">{spec.label}</span>
                </span>
            ))}
        </>
    );
}

function OptimizedListingImage({
    src,
    alt,
    width,
    className,
    loading = 'lazy',
    onFatalError,
}: {
    src: string;
    alt: string;
    width: number;
    className?: string;
    loading?: 'lazy' | 'eager';
    onFatalError?: () => void;
}) {
    const edgeOptimized = useMemo(
        () => optimizeListingImageUrl(src, { width }),
        [src, width],
    );
    const [useOriginal, setUseOriginal] = useState(false);
    const usingEdge = !useOriginal && edgeOptimized !== src;
    const displaySrc = usingEdge ? edgeOptimized : src;
    const sizes = width <= 400
        ? '160px'
        : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px';

    useEffect(() => {
        setUseOriginal(false);
    }, [src, edgeOptimized]);

    return (
        <Image
            src={displaySrc}
            alt={alt}
            fill
            sizes={sizes}
            quality={72}
            className={className}
            draggable={false}
            loading={loading}
            // Si Cloudflare Image Resizing ya recortó, no reprocesar en Next.
            unoptimized={usingEdge}
            onError={() => {
                if (!useOriginal && displaySrc !== src) {
                    setUseOriginal(true);
                    return;
                }
                onFatalError?.();
            }}
        />
    );
}

export default function MarketplaceReelListingCard({
    href,
    title,
    price,
    priceOriginal: _priceOriginal,
    discountPercent,
    location,
    mode = 'grid',
    accent = 'autos',
    ctaLabel: _ctaLabel = 'Ver detalle',
    images = [],
    videoUrl,
    videoThumbnail,
    specs = [],
    chips = [],
    sellerName,
    sellerAvatarUrl,
    sellerProfileHref,
    isSaved = false,
    onSave,
    onNavigate,
    onSellerNavigate,
    shareText,
    shareMenuItems,
    onReport,
    emptyMediaIcon,
    emptyMediaLabel = 'Sin fotos',
    preview = false,
    footerActions,
    className,
}: MarketplaceReelListingCardProps) {
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [manualPlay, setManualPlay] = useState(false);
    const [suppressHoverPlay, setSuppressHoverPlay] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isHovering, setIsHovering] = useState(false);
    const [showShareToast, setShowShareToast] = useState(false);
    const [shareToastMessage, setShareToastMessage] = useState('Link copiado');
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const menuAnchorRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);

    const isList = mode === 'list';

    const nativeVideoUrl = isNativePlayableVideoUrl(videoUrl) ? videoUrl : undefined;
    const fallbackThumbnail = videoThumbnail || images[0];

    const media: MediaItem[] = useMemo(() => {
        const photoItems = images.map((url) => ({ type: 'image' as const, url }));
        if (nativeVideoUrl) {
            return [
                { type: 'video' as const, url: nativeVideoUrl, thumbnail: fallbackThumbnail },
                ...photoItems,
            ];
        }
        return photoItems;
    }, [fallbackThumbnail, images, nativeVideoUrl]);

    const advanceMediaOnError = useCallback(() => {
        setCurrentMediaIndex((prev) => (prev < media.length - 1 ? prev + 1 : prev));
    }, [media.length]);

    const goToMedia = useCallback((direction: number, event: React.MouseEvent) => {
        event.stopPropagation();
        setCurrentMediaIndex((prev) => {
            const next = prev + direction;
            if (next < 0) return media.length - 1;
            if (next >= media.length) return 0;
            return next;
        });
    }, [media.length]);

    const shareUrl = useCallback(() => {
        if (typeof window === 'undefined') return href;
        return href.startsWith('http') ? href : `${window.location.origin}${href}`;
    }, [href]);

    const menuItems = useMemo(
        () =>
            shareMenuItems ??
            buildDefaultReelShareMenuItems({
                shareUrl: shareUrl(),
                shareText,
                onClose: () => setShowMoreMenu(false),
                onCopied: (message) => {
                    setShareToastMessage(message || 'Link copiado');
                    setShowShareToast(true);
                    setTimeout(() => setShowShareToast(false), 2000);
                },
                onReport,
                onOpenListing: preview
                    ? undefined
                    : () => {
                        if (typeof window === 'undefined') return;
                        window.open(shareUrl(), '_blank', 'noopener,noreferrer');
                    },
            }),
        [onReport, preview, shareMenuItems, shareText, shareUrl],
    );

    const currentMedia = media[currentMediaIndex];
    const imageWidth = isList ? LISTING_IMAGE_WIDTHS.list : LISTING_IMAGE_WIDTHS.card;
    const videoPosterSource = currentMedia?.type === 'video'
        ? (currentMedia.thumbnail || images[0])
        : undefined;
    const videoPoster = videoPosterSource
        ? optimizeListingImageUrl(videoPosterSource, { width: imageWidth })
        : undefined;
    const isVideoPlaying = currentMedia?.type === 'video'
        && (manualPlay || (isHovering && !suppressHoverPlay));

    useEffect(() => {
        if (currentMediaIndex >= media.length) {
            setCurrentMediaIndex(0);
        }
    }, [currentMediaIndex, media.length]);

    useEffect(() => {
        setCurrentMediaIndex(0);
        setManualPlay(false);
        setSuppressHoverPlay(false);
    }, [nativeVideoUrl, images]);

    useEffect(() => {
        if (currentMedia?.type !== 'video') {
            setManualPlay(false);
            setSuppressHoverPlay(false);
        }
    }, [currentMedia?.type]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isVideoPlaying) {
            void video.play().catch(() => undefined);
        } else {
            video.pause();
        }
    }, [isVideoPlaying, currentMediaIndex]);

    const handleCardMouseEnter = () => {
        setIsHovering(true);
        setSuppressHoverPlay(false);
    };
    const handleCardMouseLeave = () => {
        setIsHovering(false);
    };
    const toggleVideoPlayback = (event: React.MouseEvent) => {
        event.stopPropagation();
        if (isVideoPlaying) {
            setManualPlay(false);
            setSuppressHoverPlay(true);
        } else {
            setManualPlay(true);
            setSuppressHoverPlay(false);
        }
    };

    const handleTouchStart = (event: React.TouchEvent) => {
        touchStartX.current = event.touches[0].clientX;
        touchStartY.current = event.touches[0].clientY;
    };

    const handleTouchEnd = (event: React.TouchEvent) => {
        if (media.length <= 1) return;
        const deltaX = event.changedTouches[0].clientX - touchStartX.current;
        const deltaY = event.changedTouches[0].clientY - touchStartY.current;
        if (Math.abs(deltaX) < 40 || Math.abs(deltaY) > Math.abs(deltaX)) return;
        if (deltaX < 0 && currentMediaIndex < media.length - 1) {
            setCurrentMediaIndex((prev) => prev + 1);
        } else if (deltaX > 0 && currentMediaIndex > 0) {
            setCurrentMediaIndex((prev) => prev - 1);
        }
    };

    const handleWheel = (event: React.WheelEvent) => {
        if (media.length <= 1) return;
        if (Math.abs(event.deltaX) > Math.abs(event.deltaY) && Math.abs(event.deltaX) > 30) {
            event.preventDefault();
            if (event.deltaX > 0 && currentMediaIndex < media.length - 1) {
                setCurrentMediaIndex((prev) => prev + 1);
            } else if (event.deltaX < 0 && currentMediaIndex > 0) {
                setCurrentMediaIndex((prev) => prev - 1);
            }
        }
    };

    const moreMenuControl = preview ? (
        <span className="marketplace-reel-card__menu-btn pointer-events-none shrink-0" aria-hidden>
            <IconDotsVertical size={18} />
        </span>
    ) : (
        <div className="relative shrink-0" ref={menuAnchorRef}>
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    setShowMoreMenu((prev) => !prev);
                }}
                className="marketplace-reel-card__menu-btn"
                aria-label="Más opciones"
                aria-expanded={showMoreMenu}
            >
                <IconDotsVertical size={18} />
            </button>
            <MarketplaceReelShareMenu
                open={showMoreMenu}
                anchorRef={menuAnchorRef}
                onClose={() => setShowMoreMenu(false)}
                items={menuItems}
            />
        </div>
    );

    const sellerAvatarFallback = (
        <span className="marketplace-reel-card__avatar-fallback" aria-hidden>
            <IconBuildingStore size={16} stroke={1.75} />
        </span>
    );

    const sellerAvatarInner = sellerAvatarUrl ? (
        <img src={sellerAvatarUrl} alt="" className="h-full w-full object-cover" />
    ) : (
        sellerAvatarFallback
    );

    const sellerAvatarControl = sellerName.trim() ? (
        preview ? (
            <span className="marketplace-reel-card__avatar shrink-0" aria-hidden>
                {sellerAvatarInner}
            </span>
        ) : (
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    if (sellerProfileHref && onSellerNavigate) onSellerNavigate();
                }}
                className="shrink-0 transition-transform active:scale-95"
                aria-label={`Perfil de ${sellerName}`}
                disabled={!sellerProfileHref || !onSellerNavigate}
            >
                <span className="marketplace-reel-card__avatar">
                    {sellerAvatarInner}
                </span>
            </button>
        )
    ) : null;

    const listFooterActions = (
        <>
            {sellerAvatarControl}
            <span className="min-w-0 flex-1" aria-hidden />
            {moreMenuControl}
        </>
    );

    const mediaLayer = currentMedia ? (
        currentMedia.type === 'video' ? (
            <>
                {videoPoster ? (
                    <img
                        src={videoPoster}
                        alt=""
                        aria-hidden
                        className="absolute inset-0 h-full w-full object-cover"
                        draggable={false}
                        decoding="async"
                    />
                ) : null}
                <video
                    ref={videoRef}
                    src={currentMedia.url}
                    poster={videoPoster}
                    className="absolute inset-0 z-[1] h-full w-full object-cover"
                    autoPlay={false}
                    muted={isMuted}
                    loop
                    playsInline
                    preload="metadata"
                    controls={false}
                    onError={advanceMediaOnError}
                />
            </>
        ) : (
            <OptimizedListingImage
                src={currentMedia.url}
                alt={title}
                width={imageWidth}
                className="object-cover"
                loading="lazy"
                onFatalError={advanceMediaOnError}
            />
        )
    ) : (
        <div className="marketplace-reel-card__empty">
            {emptyMediaIcon}
            <span>{emptyMediaLabel}</span>
        </div>
    );

    const chipStack = chips.length > 0 ? (
        <div className="absolute top-2 left-2 z-10 flex max-w-[calc(100%-0.75rem)] flex-col items-start gap-1">
            {chips.map((chip) => (
                <span
                    key={chip.label}
                    className={
                        chip.tone === 'accent'
                            ? 'marketplace-reel-card__chip marketplace-reel-card__chip--accent'
                            : 'marketplace-reel-card__chip'
                    }
                >
                    {chip.icon ? <span className="marketplace-reel-card__chip-icon">{chip.icon}</span> : null}
                    {chip.label}
                </span>
            ))}
        </div>
    ) : null;

    const mediaNav = media.length > 1 ? (
        <>
            <button
                type="button"
                aria-label="Imagen anterior"
                onClick={(event) => goToMedia(-1, event)}
                className="absolute top-1/2 left-1.5 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-md transition hover:bg-black/65"
            >
                <IconChevronLeft size={16} />
            </button>
            <button
                type="button"
                aria-label="Imagen siguiente"
                onClick={(event) => goToMedia(1, event)}
                className="absolute top-1/2 right-1.5 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-md transition hover:bg-black/65"
            >
                <IconChevronRight size={16} />
            </button>
        </>
    ) : null;

    const mediaDots = (
        <div
            className="marketplace-reel-card__dots"
            aria-hidden={media.length <= 1 ? true : undefined}
        >
            {media.length > 1
                ? media.map((_, index) => (
                    <button
                        key={index}
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            setCurrentMediaIndex(index);
                        }}
                        className={`marketplace-reel-card__dot ${index === currentMediaIndex ? 'marketplace-reel-card__dot--active' : ''}`}
                        aria-label={`Foto ${index + 1}`}
                    />
                ))
                : null}
        </div>
    );

    const saveControlList = onSave ? (
        <button
            type="button"
            onClick={(event) => {
                event.stopPropagation();
                onSave(event);
            }}
            className="marketplace-reel-card__save-btn--list"
            aria-label={isSaved ? 'Quitar de guardados' : 'Guardar'}
        >
            {isSaved ? <IconBookmarkFilled size={16} className="text-amber-500" /> : <IconBookmark size={16} />}
        </button>
    ) : preview ? (
        <span className="marketplace-reel-card__save-btn--list pointer-events-none" aria-hidden>
            <IconBookmark size={16} />
        </span>
    ) : null;

    const saveControl = onSave ? (
        <button
            type="button"
            onClick={(event) => {
                event.stopPropagation();
                onSave(event);
            }}
            className="marketplace-reel-card__icon-btn h-8 w-8 sm:h-9 sm:w-9"
            aria-label={isSaved ? 'Quitar de guardados' : 'Guardar'}
        >
            {isSaved ? <IconBookmarkFilled size={16} className="text-amber-300" /> : <IconBookmark size={16} className="text-white" />}
        </button>
    ) : preview ? (
        <span className="marketplace-reel-card__icon-btn pointer-events-none h-8 w-8 sm:h-9 sm:w-9" aria-hidden>
            <IconBookmark size={16} className="text-white" />
        </span>
    ) : null;

    if (isList) {
        return (
            <div
                ref={cardRef}
                role={preview ? 'img' : 'link'}
                aria-label={preview ? `Vista previa: ${title}` : undefined}
                tabIndex={preview ? -1 : 0}
                onClick={() => {
                    if (preview || showMoreMenu) return;
                    onNavigate();
                }}
                onKeyDown={(event) => {
                    if (preview) return;
                    if (event.key === 'Enter') onNavigate();
                }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
                onMouseEnter={handleCardMouseEnter}
                onMouseLeave={handleCardMouseLeave}
                className={joinClasses(
                    'marketplace-reel-card marketplace-reel-card--list group/card relative flex w-full min-h-[9.5rem] overflow-visible rounded-2xl border shadow-md select-none transition-all duration-200 hover:-translate-y-[1px] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:ring-offset-2 sm:min-h-[11rem]',
                    (onSave || preview) && 'marketplace-reel-card--has-save',
                    preview ? 'cursor-default' : 'cursor-pointer',
                    className,
                )}
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
                <div className="marketplace-reel-card__list-media relative w-[7.25rem] shrink-0 self-stretch overflow-hidden rounded-l-2xl bg-[#0a0a0a] sm:w-[8.75rem] md:w-[10rem]">
                    <div className="absolute inset-0">{mediaLayer}</div>
                    <div className="marketplace-reel-card__scrim pointer-events-none absolute inset-0 opacity-80" aria-hidden />
                    {chipStack}
                    {mediaNav}
                    {currentMedia?.type === 'video' ? (
                        <div className="absolute bottom-10 right-2 z-10 flex flex-col gap-1.5">
                            <button
                                type="button"
                                onClick={toggleVideoPlayback}
                                className="marketplace-reel-card__icon-btn h-8 w-8"
                                aria-label={isVideoPlaying ? 'Pausar' : 'Reproducir'}
                            >
                                {isVideoPlaying ? <IconPlayerPause size={14} /> : <IconPlayerPlay size={14} />}
                            </button>
                        </div>
                    ) : null}
                </div>

                {saveControlList ? (
                    <div className="absolute top-2.5 right-2.5 z-20">{saveControlList}</div>
                ) : null}

                <div className="marketplace-reel-card__list-content flex min-w-0 flex-1 flex-col rounded-r-2xl p-3 sm:p-3.5">
                    <div className="marketplace-reel-card__list-body min-w-0 flex-1">
                        <div className={joinClasses(
                            'marketplace-reel-card__price-row marketplace-reel-card__price-row--list',
                            discountPercent && discountPercent > 0 ? 'marketplace-reel-card__price-row--offer' : null,
                        )}>
                            <p className="marketplace-reel-card__price marketplace-reel-card__price--list">{formatCardPrice(price)}</p>
                            {discountPercent && discountPercent > 0 ? (
                                <span className="marketplace-reel-card__discount marketplace-reel-card__discount--list">-{discountPercent}%</span>
                            ) : null}
                        </div>
                        <h3 className="marketplace-reel-card__title marketplace-reel-card__title--list">{title}</h3>
                        <ReelSpecs specs={specs} list accent={accent} />
                        {location ? (
                            <div className="marketplace-reel-card__location marketplace-reel-card__location--list">
                                <IconMapPin size={12} className="shrink-0" />
                                <span className="truncate">{shortenListingLocation(location)}</span>
                            </div>
                        ) : null}
                    </div>

                    <div className="marketplace-reel-card__actions marketplace-reel-card__actions--list">
                        {footerActions ?? listFooterActions}
                    </div>
                </div>

                {showShareToast ? (
                    <div className="marketplace-reel-toast absolute top-3 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium shadow-lg">
                        {shareToastMessage}
                    </div>
                ) : null}
            </div>
        );
    }

    return (
        <div
            ref={cardRef}
            role={preview ? 'img' : 'link'}
            aria-label={preview ? `Vista previa: ${title}` : undefined}
            tabIndex={preview ? -1 : 0}
            onClick={() => {
                if (preview || showMoreMenu) return;
                onNavigate();
            }}
            onKeyDown={(event) => {
                if (preview) return;
                if (event.key === 'Enter') onNavigate();
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
            className={joinClasses(
                'marketplace-reel-card marketplace-reel-card--grid group/card relative w-full overflow-hidden rounded-[1.35rem] shadow-lg select-none transition-all duration-200 hover:-translate-y-[2px] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:ring-offset-2',
                preview ? 'cursor-default' : 'cursor-pointer',
                LISTING_CARD_COMMERCIAL_ASPECT,
                className,
            )}
        >
            <div className="absolute inset-0 bg-[#0a0a0a]">
                {mediaLayer}
            </div>

            <div className="marketplace-reel-card__scrim pointer-events-none absolute inset-0" aria-hidden />

            {chipStack}
            {mediaNav}

            <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
                {saveControl}
                {currentMedia?.type === 'video' ? (
                    <>
                        <button
                            type="button"
                            onClick={toggleVideoPlayback}
                            className="marketplace-reel-card__icon-btn h-9 w-9"
                            aria-label={isVideoPlaying ? 'Pausar' : 'Reproducir'}
                        >
                            {isVideoPlaying ? <IconPlayerPause size={14} /> : <IconPlayerPlay size={14} />}
                        </button>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                if (videoRef.current) {
                                    videoRef.current.muted = !isMuted;
                                    setIsMuted(!isMuted);
                                }
                            }}
                            className="marketplace-reel-card__icon-btn h-9 w-9"
                            aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
                        >
                            {isMuted ? <IconVolumeOff size={14} /> : <IconVolume size={14} />}
                        </button>
                    </>
                ) : null}
            </div>

            {showShareToast ? (
                <div className="marketplace-reel-toast absolute top-3 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium shadow-lg">
                    {shareToastMessage}
                </div>
            ) : null}

            <div className="marketplace-reel-card__panel absolute inset-x-0 bottom-0 z-10 px-3 pb-2.5 pt-10 sm:px-3.5 sm:pb-3 sm:pt-12">
                <div className="marketplace-reel-card__head">
                    <div className="marketplace-reel-card__identity">
                        {sellerAvatarControl}
                        <div className="marketplace-reel-card__head-text">
                            <div className={joinClasses(
                                'marketplace-reel-card__price-row',
                                discountPercent && discountPercent > 0 ? 'marketplace-reel-card__price-row--offer' : null,
                            )}>
                                <p className="marketplace-reel-card__price">{formatCardPrice(price)}</p>
                                {discountPercent && discountPercent > 0 ? (
                                    <span className="marketplace-reel-card__discount">-{discountPercent}%</span>
                                ) : null}
                            </div>
                            <div className="marketplace-reel-card__title-row">
                                <h3 className="marketplace-reel-card__title">{title}</h3>
                                {location ? (
                                    <span className="marketplace-reel-card__location marketplace-reel-card__location--tag">
                                        <IconMapPin size={10} className="shrink-0" />
                                        <span>{shortenListingLocation(location)}</span>
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="marketplace-reel-card__meta-row">
                    <div className="marketplace-reel-card__specs marketplace-reel-card__specs--stack">
                        <ReelSpecs specs={specs} accent={accent} />
                    </div>
                    {footerActions ? null : (
                        <span className="marketplace-reel-card__meta-menu">{moreMenuControl}</span>
                    )}
                </div>
                {footerActions ? (
                    <div className="marketplace-reel-card__actions marketplace-reel-card__actions--owner">
                        {footerActions}
                    </div>
                ) : null}
                {mediaDots}
            </div>
        </div>
    );
}
