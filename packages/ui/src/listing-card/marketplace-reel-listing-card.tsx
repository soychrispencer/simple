'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
    IconBookmark,
    IconBookmarkFilled,
    IconChevronLeft,
    IconChevronRight,
    IconDotsVertical,
    IconMapPin,
    IconPlayerPause,
    IconPlayerPlay,
    IconVolume,
    IconVolumeOff,
} from '@tabler/icons-react';
import type { ListingMode } from './types';
import { joinClasses } from '../shared/join-classes';
import {
    MarketplaceReelShareMenu,
    buildDefaultReelShareMenuItems,
    type MarketplaceReelShareMenuItem,
} from './marketplace-reel-share-menu';

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
    priceOriginal?: string;
    location: string;
    mode?: ListingMode;
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

function formatPriceCLP(price: string): string {
    const numericValue = price.replace(/[^0-9]/g, '');
    const num = parseInt(numericValue, 10);
    if (isNaN(num)) return price;
    return '$' + num.toLocaleString('es-CL');
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

function ReelSpecs({ specs, list = false }: { specs: MarketplaceReelSpec[]; list?: boolean }) {
    const visible = specs.slice(0, 4);
    if (visible.length === 0) return null;

    if (list) {
        return (
            <div className="marketplace-reel-card__specs marketplace-reel-card__specs--list">
                {visible.map((spec) => (
                    <span key={spec.label} className="marketplace-reel-card__spec-pill">
                        {spec.icon ? <span className="marketplace-reel-card__spec-pill-icon">{spec.icon}</span> : null}
                        <span className="marketplace-reel-card__spec-pill-label">{spec.label}</span>
                    </span>
                ))}
            </div>
        );
    }

    return (
        <div className="marketplace-reel-card__specs">
            {visible.map((spec) => (
                <span key={spec.label} className="marketplace-reel-card__spec">
                    {spec.icon ? <span className="marketplace-reel-card__spec-icon">{spec.icon}</span> : null}
                    <span className="marketplace-reel-card__spec-label">{spec.label}</span>
                </span>
            ))}
        </div>
    );
}

export default function MarketplaceReelListingCard({
    href,
    title,
    price,
    priceOriginal,
    location,
    mode = 'grid',
    ctaLabel = 'Ver detalle',
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
    const [isVideoPaused, setIsVideoPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isInViewport, setIsInViewport] = useState(false);
    const [showShareToast, setShowShareToast] = useState(false);
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
                ...photoItems,
                { type: 'video', url: nativeVideoUrl, thumbnail: fallbackThumbnail },
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
                onCopied: () => {
                    setShowShareToast(true);
                    setTimeout(() => setShowShareToast(false), 2000);
                },
                onReport,
            }),
        [onReport, shareMenuItems, shareText, shareUrl],
    );

    const currentMedia = media[currentMediaIndex];
    const videoPoster = currentMedia?.type === 'video'
        ? (currentMedia.thumbnail || images[0])
        : undefined;

    useEffect(() => {
        if (currentMediaIndex >= media.length) {
            setCurrentMediaIndex(0);
        }
    }, [currentMediaIndex, media.length]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => setIsInViewport(entry.isIntersecting),
            { threshold: 0.15 },
        );
        if (cardRef.current) observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!videoRef.current) return;
        if (!isInViewport || isVideoPaused) {
            videoRef.current.pause();
        } else {
            void videoRef.current.play().catch(() => undefined);
        }
    }, [isInViewport, isVideoPaused, currentMediaIndex]);

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

    const defaultFooterActions = (
        <>
            {sellerName.trim() ? (
                preview ? (
                    <span className="marketplace-reel-card__avatar shrink-0" aria-hidden>
                        {sellerAvatarUrl ? (
                            <img src={sellerAvatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                            sellerName.charAt(0).toUpperCase()
                        )}
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
                            {sellerAvatarUrl ? (
                                <img src={sellerAvatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                                sellerName.charAt(0).toUpperCase()
                            )}
                        </span>
                    </button>
                )
            ) : null}

            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    if (!preview) onNavigate();
                }}
                className={joinClasses('marketplace-reel-cta min-w-0', preview ? 'pointer-events-none' : '')}
                tabIndex={preview ? -1 : 0}
            >
                {ctaLabel}
            </button>

            {preview ? (
                <span className="marketplace-reel-card__icon-btn pointer-events-none shrink-0" aria-hidden>
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
                        className="marketplace-reel-card__icon-btn"
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
            )}
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
                    />
                ) : null}
                <video
                    ref={videoRef}
                    src={currentMedia.url}
                    poster={videoPoster}
                    className="absolute inset-0 z-[1] h-full w-full object-cover"
                    autoPlay={isInViewport}
                    muted={isMuted}
                    loop
                    playsInline
                    controls={false}
                    onError={advanceMediaOnError}
                />
            </>
        ) : (
            <img
                src={currentMedia.url}
                alt={title}
                className="h-full w-full object-cover"
                draggable={false}
                loading="lazy"
                onError={advanceMediaOnError}
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
                className="absolute top-1/2 left-1 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-md transition hover:bg-black/75 sm:h-8 sm:w-8"
            >
                <IconChevronLeft size={16} />
            </button>
            <button
                type="button"
                aria-label="Imagen siguiente"
                onClick={(event) => goToMedia(1, event)}
                className="absolute top-1/2 right-1 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-md transition hover:bg-black/75 sm:h-8 sm:w-8"
            >
                <IconChevronRight size={16} />
            </button>
            <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
                {media.map((_, index) => (
                    <button
                        key={index}
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            setCurrentMediaIndex(index);
                        }}
                        className={`h-1 rounded-full transition-all ${index === currentMediaIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/45'}`}
                        aria-label={`Foto ${index + 1}`}
                    />
                ))}
            </div>
        </>
    ) : null;

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
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setIsVideoPaused((prev) => !prev);
                                }}
                                className="marketplace-reel-card__icon-btn h-8 w-8"
                                aria-label={isVideoPaused ? 'Reproducir' : 'Pausar'}
                            >
                                {isVideoPaused ? <IconPlayerPlay size={14} /> : <IconPlayerPause size={14} />}
                            </button>
                        </div>
                    ) : null}
                </div>

                {saveControlList ? (
                    <div className="absolute top-2.5 right-2.5 z-20">{saveControlList}</div>
                ) : null}

                <div className="marketplace-reel-card__list-content flex min-w-0 flex-1 flex-col rounded-r-2xl p-3 sm:p-3.5">
                    <div className="marketplace-reel-card__list-body min-w-0 flex-1">
                        <p className="marketplace-reel-card__price marketplace-reel-card__price--list">{formatPriceCLP(price)}</p>
                        {priceOriginal ? (
                            <p className="marketplace-reel-card__price-original marketplace-reel-card__price-original--list">
                                {formatPriceCLP(priceOriginal)}
                            </p>
                        ) : null}
                        <h3 className="marketplace-reel-card__title marketplace-reel-card__title--list">{title}</h3>
                        <div className="marketplace-reel-card__location marketplace-reel-card__location--list">
                            <IconMapPin size={13} className="shrink-0" />
                            <span className="truncate">{location}</span>
                        </div>
                        <ReelSpecs specs={specs} list />
                    </div>

                    <div className="marketplace-reel-card__actions marketplace-reel-card__actions--list">
                        {footerActions ?? defaultFooterActions}
                    </div>
                </div>

                {showShareToast ? (
                    <div className="marketplace-reel-toast absolute top-3 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium shadow-lg">
                        Link copiado
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
            className={joinClasses(
                'marketplace-reel-card group/card relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-md select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:ring-offset-2',
                preview ? 'cursor-default' : 'cursor-pointer',
                'w-full max-w-none aspect-[3/4] sm:aspect-[9/16] sm:mx-auto sm:max-w-[360px]',
                className,
            )}
        >
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
                {mediaLayer}
            </div>

            {media.length > 1 ? (
                <>
                    <button
                        type="button"
                        aria-label="Imagen anterior"
                        onClick={(event) => goToMedia(-1, event)}
                        className="absolute top-1/2 left-2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-md transition hover:bg-black/75"
                    >
                        <IconChevronLeft size={18} />
                    </button>
                    <button
                        type="button"
                        aria-label="Imagen siguiente"
                        onClick={(event) => goToMedia(1, event)}
                        className="absolute top-1/2 right-2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-md transition hover:bg-black/75"
                    >
                        <IconChevronRight size={18} />
                    </button>
                </>
            ) : null}

            <div className="marketplace-reel-card__scrim pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden />

            {media.length > 1 ? (
                <div className="absolute top-3 left-1/2 z-10 flex -translate-x-1/2 gap-1">
                    {media.map((_, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                setCurrentMediaIndex(index);
                            }}
                            className={`h-1 rounded-full transition-all ${index === currentMediaIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/45'}`}
                            aria-label={`Foto ${index + 1}`}
                        />
                    ))}
                </div>
            ) : null}

            {chips.length > 0 ? (
                <div className="absolute top-3 left-3 z-10 flex max-w-[46%] flex-col items-start gap-1">
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
            ) : null}

            <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
                {onSave ? (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onSave(event);
                        }}
                        className="marketplace-reel-card__icon-btn"
                        aria-label={isSaved ? 'Quitar de guardados' : 'Guardar'}
                    >
                        {isSaved ? <IconBookmarkFilled size={18} className="text-amber-300" /> : <IconBookmark size={18} className="text-white" />}
                    </button>
                ) : preview ? (
                    <span className="marketplace-reel-card__icon-btn pointer-events-none" aria-hidden>
                        <IconBookmark size={18} className="text-white" />
                    </span>
                ) : null}
                {currentMedia?.type === 'video' ? (
                    <>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                setIsVideoPaused((prev) => !prev);
                            }}
                            className="marketplace-reel-card__icon-btn"
                            aria-label={isVideoPaused ? 'Reproducir' : 'Pausar'}
                        >
                            {isVideoPaused ? <IconPlayerPlay size={14} /> : <IconPlayerPause size={14} />}
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
                            className="marketplace-reel-card__icon-btn"
                            aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
                        >
                            {isMuted ? <IconVolumeOff size={14} /> : <IconVolume size={14} />}
                        </button>
                    </>
                ) : null}
            </div>

            {showShareToast ? (
                <div className="marketplace-reel-toast absolute top-3 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium shadow-lg">
                    Link copiado
                </div>
            ) : null}

            <div className="marketplace-reel-card__panel absolute right-0 bottom-0 left-0 z-10 rounded-b-2xl p-3 pt-8">
                <p className="marketplace-reel-card__price">{formatPriceCLP(price)}</p>
                {priceOriginal ? (
                    <p className="marketplace-reel-card__price-original">{formatPriceCLP(priceOriginal)}</p>
                ) : null}
                <h3 className="marketplace-reel-card__title">{title}</h3>

                <div className="marketplace-reel-card__location">
                    <IconMapPin size={14} className="shrink-0" />
                    <span className="truncate">{location}</span>
                </div>

                <ReelSpecs specs={specs} />

                <div className="marketplace-reel-card__actions">
                    {footerActions ?? defaultFooterActions}
                </div>
            </div>
        </div>
    );
}
