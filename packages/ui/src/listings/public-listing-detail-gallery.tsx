'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    IconBookmark,
    IconBookmarkFilled,
    IconChevronLeft,
    IconChevronRight,
    IconLayoutGrid,
    IconPhoto,
    IconShare3,
    IconVideo,
    IconX,
} from '@tabler/icons-react';
import { buildListingDetailMediaSlides, LISTING_IMAGE_WIDTHS, optimizeListingImageUrl, type ListingDetailMediaSlide } from '@simple/utils';

export type PublicListingDetailGalleryProps = {
    listingId: string;
    title: string;
    images?: string[];
    videoUrl?: string | null;
    shareText?: string;
    className?: string;
};

const GRID_VISIBLE = 5;

export default function PublicListingDetailGallery({
    listingId,
    title,
    images = [],
    videoUrl,
    shareText,
    className,
}: PublicListingDetailGalleryProps) {
    const slides = useMemo(
        () => buildListingDetailMediaSlides({ images, videoUrl }),
        [images, videoUrl],
    );
    const poster = images[0];
    const hasMultiple = slides.length > 1;
    const gridSlides = slides.slice(0, GRID_VISIBLE);
    const extraCount = Math.max(0, slides.length - GRID_VISIBLE);

    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [isSaved, setIsSaved] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem(`saved-listing-${listingId}`) === 'true';
    });
    const [showCopied, setShowCopied] = useState(false);

    const openLightbox = useCallback((index: number) => {
        setLightboxIndex(((index % slides.length) + slides.length) % slides.length);
    }, [slides.length]);

    const closeLightbox = useCallback(() => {
        setLightboxIndex(null);
    }, []);

    const goLightbox = useCallback((index: number) => {
        if (slides.length <= 0) return;
        setLightboxIndex(((index % slides.length) + slides.length) % slides.length);
    }, [slides.length]);

    const handleSave = useCallback(() => {
        setIsSaved((prev) => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                localStorage.setItem(`saved-listing-${listingId}`, String(next));
            }
            return next;
        });
    }, [listingId]);

    const handleShare = useCallback(async () => {
        const url = typeof window === 'undefined' ? '' : window.location.href;
        const text = shareText ?? title;

        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({ title: text, text, url });
                return;
            } catch {
                // cancelado
            }
        }

        try {
            await navigator.clipboard.writeText(url);
            setShowCopied(true);
            window.setTimeout(() => setShowCopied(false), 2000);
        } catch {
            window.prompt('Copia este enlace:', url);
        }
    }, [shareText, title]);

    useEffect(() => {
        if (lightboxIndex === null) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeLightbox();
            if (event.key === 'ArrowLeft') goLightbox(lightboxIndex - 1);
            if (event.key === 'ArrowRight') goLightbox(lightboxIndex + 1);
        };

        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [closeLightbox, goLightbox, lightboxIndex]);

    const mosaicClass = [
        'public-listing-detail-gallery__mosaic',
        `public-listing-detail-gallery__mosaic--count-${Math.min(Math.max(slides.length, 1), GRID_VISIBLE)}`,
    ].join(' ');

    return (
        <div
            className={[
                'public-listing-detail-gallery',
                hasMultiple ? 'public-listing-detail-gallery--multi' : '',
                className,
            ].filter(Boolean).join(' ')}
        >
            <div className="public-listing-detail-gallery__frame">
                {slides.length === 0 ? (
                    <div className="public-listing-detail-gallery__empty">
                        <IconPhoto size={48} />
                        <span>Sin imagen disponible</span>
                    </div>
                ) : (
                    <div className={mosaicClass}>
                        {gridSlides.map((slide, index) => {
                            const isHero = index === 0;
                            const isLastVisible = index === gridSlides.length - 1 && extraCount > 0;
                            return (
                                <button
                                    key={`${slide.type}-${slide.url}-${index}`}
                                    type="button"
                                    className={[
                                        'public-listing-detail-gallery__tile',
                                        isHero ? 'public-listing-detail-gallery__tile--hero' : '',
                                        `public-listing-detail-gallery__tile--${index + 1}`,
                                    ].filter(Boolean).join(' ')}
                                    onClick={() => openLightbox(index)}
                                    aria-label={
                                        slide.type === 'image'
                                            ? `Ver imagen ${index + 1} en grande`
                                            : 'Ver video en grande'
                                    }
                                >
                                    <TileMedia slide={slide} title={title} poster={poster} priority={isHero} />
                                    {slide.type !== 'image' ? (
                                        <span className="public-listing-detail-gallery__tile-video">
                                            <IconVideo size={isHero ? 28 : 20} />
                                        </span>
                                    ) : null}
                                    {isLastVisible ? (
                                        <span className="public-listing-detail-gallery__tile-more">
                                            +{extraCount}
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="public-listing-detail-gallery__actions">
                    <button
                        type="button"
                        onClick={handleSave}
                        className="public-listing-detail-gallery__icon-btn"
                        aria-label={isSaved ? 'Quitar de guardados' : 'Guardar'}
                    >
                        {isSaved ? <IconBookmarkFilled size={20} /> : <IconBookmark size={20} />}
                    </button>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => void handleShare()}
                            className="public-listing-detail-gallery__icon-btn"
                            aria-label="Compartir"
                        >
                            <IconShare3 size={20} />
                        </button>
                        {showCopied ? (
                            <span className="public-listing-detail-gallery__toast">Copiado</span>
                        ) : null}
                    </div>
                </div>

                {hasMultiple ? (
                    <button
                        type="button"
                        className="public-listing-detail-gallery__show-all"
                        onClick={() => openLightbox(0)}
                    >
                        <IconLayoutGrid size={16} />
                        Ver todas
                    </button>
                ) : null}
            </div>

            {lightboxIndex !== null && slides[lightboxIndex] ? (
                <Lightbox
                    slides={slides}
                    index={lightboxIndex}
                    title={title}
                    poster={poster}
                    onClose={closeLightbox}
                    onSelect={goLightbox}
                    onPrev={() => goLightbox(lightboxIndex - 1)}
                    onNext={() => goLightbox(lightboxIndex + 1)}
                />
            ) : null}
        </div>
    );
}

function TileMedia({
    slide,
    title,
    poster,
    priority,
}: {
    slide: ListingDetailMediaSlide;
    title: string;
    poster?: string;
    priority?: boolean;
}) {
    if (slide.type !== 'image') {
        if (poster) {
            const src = optimizeListingImageUrl(poster, {
                width: priority ? LISTING_IMAGE_WIDTHS.detail : LISTING_IMAGE_WIDTHS.card,
            });
            return (
                <Image
                    src={src}
                    alt=""
                    fill
                    className="public-listing-detail-gallery__tile-img"
                    sizes={priority ? '(max-width: 1024px) 100vw, 60vw' : '(max-width: 1024px) 50vw, 20vw'}
                    quality={priority ? 75 : 65}
                    priority={priority}
                    unoptimized={src !== poster}
                />
            );
        }
        return <span className="public-listing-detail-gallery__tile-fallback" aria-hidden />;
    }

    const src = optimizeListingImageUrl(slide.url, {
        width: priority ? LISTING_IMAGE_WIDTHS.detail : LISTING_IMAGE_WIDTHS.card,
    });
    return (
        <Image
            src={src}
            alt={title}
            fill
            className="public-listing-detail-gallery__tile-img"
            sizes={priority ? '(max-width: 1024px) 100vw, 60vw' : '(max-width: 1024px) 50vw, 20vw'}
            quality={priority ? 75 : 65}
            priority={priority}
            unoptimized={src !== slide.url}
        />
    );
}

function Lightbox({
    slides,
    index,
    title,
    poster,
    onClose,
    onSelect,
    onPrev,
    onNext,
}: {
    slides: ListingDetailMediaSlide[];
    index: number;
    title: string;
    poster?: string;
    onClose: () => void;
    onSelect: (index: number) => void;
    onPrev: () => void;
    onNext: () => void;
}) {
    const slide = slides[index]!;
    const hasMultiple = slides.length > 1;

    return (
        <div
            className="public-listing-detail-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`Galería de ${title}`}
        >
            <button
                type="button"
                className="public-listing-detail-lightbox__backdrop"
                aria-label="Cerrar galería"
                onClick={onClose}
            />

            <div className="public-listing-detail-lightbox__chrome">
                <span className="public-listing-detail-lightbox__counter">
                    {index + 1} / {slides.length}
                </span>
                <button
                    type="button"
                    className="public-listing-detail-lightbox__close"
                    onClick={onClose}
                    aria-label="Cerrar"
                >
                    <IconX size={22} />
                </button>
            </div>

            {hasMultiple ? (
                <>
                    <button
                        type="button"
                        className="public-listing-detail-lightbox__nav public-listing-detail-lightbox__nav--prev"
                        onClick={onPrev}
                        aria-label="Anterior"
                    >
                        <IconChevronLeft size={24} />
                    </button>
                    <button
                        type="button"
                        className="public-listing-detail-lightbox__nav public-listing-detail-lightbox__nav--next"
                        onClick={onNext}
                        aria-label="Siguiente"
                    >
                        <IconChevronRight size={24} />
                    </button>
                </>
            ) : null}

            <div className="public-listing-detail-lightbox__stage">
                <LightboxMedia slide={slide} title={title} poster={poster} />
            </div>

            {hasMultiple ? (
                <div className="public-listing-detail-lightbox__thumbs" aria-label="Miniaturas">
                    {slides.map((entry, thumbIndex) => (
                        <button
                            key={`lb-${entry.type}-${entry.url}-${thumbIndex}`}
                            type="button"
                            className={[
                                'public-listing-detail-lightbox__thumb',
                                thumbIndex === index ? 'public-listing-detail-lightbox__thumb--active' : '',
                            ].filter(Boolean).join(' ')}
                            onClick={() => onSelect(thumbIndex)}
                            aria-label={entry.type === 'image' ? `Ir a imagen ${thumbIndex + 1}` : 'Ir al video'}
                            aria-current={thumbIndex === index}
                        >
                            <LightboxThumb slide={entry} poster={poster} />
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function LightboxThumb({
    slide,
    poster,
}: {
    slide: ListingDetailMediaSlide;
    poster?: string;
}) {
    if (slide.type === 'image') {
        const src = optimizeListingImageUrl(slide.url, { width: LISTING_IMAGE_WIDTHS.thumb });
        return (
            <Image
                src={src}
                alt=""
                width={72}
                height={54}
                className="h-full w-full object-cover"
                loading="lazy"
                quality={60}
                unoptimized={src !== slide.url}
            />
        );
    }
    if (poster) {
        const src = optimizeListingImageUrl(poster, { width: LISTING_IMAGE_WIDTHS.thumb });
        return (
            <span className="public-listing-detail-lightbox__thumb-video">
                <Image
                    src={src}
                    alt=""
                    width={72}
                    height={54}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    quality={60}
                    unoptimized={src !== poster}
                />
                <span className="public-listing-detail-lightbox__thumb-video-icon">
                    <IconVideo size={16} />
                </span>
            </span>
        );
    }
    return (
        <span className="public-listing-detail-lightbox__thumb-video">
            <span className="public-listing-detail-lightbox__thumb-video-icon">
                <IconVideo size={18} />
            </span>
        </span>
    );
}

function LightboxMedia({
    slide,
    title,
    poster,
}: {
    slide: ListingDetailMediaSlide;
    title: string;
    poster?: string;
}) {
    if (slide.type === 'video-native') {
        return (
            <video
                key={slide.url}
                src={slide.url}
                className="public-listing-detail-lightbox__media public-listing-detail-lightbox__media--video"
                controls
                playsInline
                autoPlay
                preload="metadata"
                poster={poster}
            />
        );
    }

    if (slide.type === 'video-embed') {
        return (
            <iframe
                key={slide.url}
                src={slide.url}
                title={`Video de ${title}`}
                className="public-listing-detail-lightbox__media public-listing-detail-lightbox__media--embed"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        );
    }

    const src = optimizeListingImageUrl(slide.url, { width: LISTING_IMAGE_WIDTHS.detail });
    return (
        <Image
            key={slide.url}
            src={src}
            alt={title}
            width={1600}
            height={1200}
            className="public-listing-detail-lightbox__media public-listing-detail-lightbox__media--photo"
            quality={85}
            priority
            unoptimized={src !== slide.url}
        />
    );
}

export function PublicListingDetailSpecGrid({ children }: { children: ReactNode }) {
    return <div className="public-listing-detail-spec-grid">{children}</div>;
}

export function PublicListingDetailSpecItem({
    icon,
    label,
    value,
}: {
    icon: ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="public-listing-detail-spec-item">
            <span className="public-listing-detail-spec-item__icon">{icon}</span>
            <span className="public-listing-detail-spec-item__label">{label}</span>
            <p className="public-listing-detail-spec-item__value">{value}</p>
        </div>
    );
}
