'use client';

import Image from 'next/image';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
    IconBookmark,
    IconBookmarkFilled,
    IconChevronLeft,
    IconChevronRight,
    IconPhoto,
    IconShare3,
    IconVideo,
} from '@tabler/icons-react';
import { buildListingDetailMediaSlides, type ListingDetailMediaSlide } from '@simple/utils';

export type PublicListingDetailGalleryProps = {
    listingId: string;
    title: string;
    images?: string[];
    videoUrl?: string | null;
    shareText?: string;
    className?: string;
};

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

    const [activeIndex, setActiveIndex] = useState(0);
    const [isSaved, setIsSaved] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem(`saved-listing-${listingId}`) === 'true';
    });
    const [showCopied, setShowCopied] = useState(false);
    const touchStartX = useRef<number | null>(null);

    const currentSlide = slides[activeIndex] ?? null;
    const stageClass = currentSlide?.type === 'video-embed'
        ? 'public-listing-detail-gallery__stage--embed'
        : currentSlide?.type === 'video-native'
            ? 'public-listing-detail-gallery__stage--video'
            : 'public-listing-detail-gallery__stage--photo';

    const goTo = useCallback((index: number) => {
        if (slides.length <= 1) return;
        setActiveIndex((index + slides.length) % slides.length);
    }, [slides.length]);

    const handlePrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);
    const handleNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);

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

    const handleTouchStart = (event: React.TouchEvent) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
    };

    const handleTouchEnd = (event: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
        const diff = touchStartX.current - endX;
        if (Math.abs(diff) > 48) {
            if (diff > 0) handleNext();
            else handlePrev();
        }
        touchStartX.current = null;
    };

    return (
        <div
            className={[
                'public-listing-detail-gallery',
                hasMultiple ? 'public-listing-detail-gallery--multi' : '',
                className,
            ].filter(Boolean).join(' ')}
        >
            <div
                className={[
                    'public-listing-detail-gallery__showcase',
                    hasMultiple ? 'public-listing-detail-gallery__showcase--multi' : '',
                ].join(' ')}
            >
                <div
                    className={`public-listing-detail-gallery__stage ${stageClass}`}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    {currentSlide ? (
                        <>
                            <SlideMedia slide={currentSlide} title={title} poster={poster} priority={activeIndex === 0} />

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
                                <>
                                    <button
                                        type="button"
                                        onClick={handlePrev}
                                        className="public-listing-detail-gallery__nav public-listing-detail-gallery__nav--prev"
                                        aria-label="Anterior"
                                    >
                                        <IconChevronLeft size={20} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleNext}
                                        className="public-listing-detail-gallery__nav public-listing-detail-gallery__nav--next"
                                        aria-label="Siguiente"
                                    >
                                        <IconChevronRight size={20} />
                                    </button>
                                    <div className="public-listing-detail-gallery__counter">
                                        {activeIndex + 1} / {slides.length}
                                    </div>
                                </>
                            ) : null}
                        </>
                    ) : (
                        <div className="public-listing-detail-gallery__empty">
                            <IconPhoto size={48} />
                            <span>Sin imagen disponible</span>
                        </div>
                    )}
                </div>

                {hasMultiple ? (
                    <div className="public-listing-detail-gallery__thumb-rail" aria-label="Miniaturas">
                        {slides.map((slide, index) => (
                            <button
                                key={`${slide.type}-${slide.url}-${index}`}
                                type="button"
                                onClick={() => setActiveIndex(index)}
                                aria-label={slide.type === 'image' ? `Ver imagen ${index + 1}` : 'Ver video'}
                                aria-current={index === activeIndex}
                                className={`public-listing-detail-gallery__thumb ${index === activeIndex ? 'public-listing-detail-gallery__thumb--active' : ''}`}
                            >
                                {slide.type === 'image' ? (
                                    <Image
                                        src={slide.url}
                                        alt=""
                                        width={88}
                                        height={88}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <span className="public-listing-detail-gallery__thumb-video">
                                        <IconVideo size={22} />
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function SlideMedia({
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
    if (slide.type === 'video-native') {
        return (
            <video
                src={slide.url}
                className="public-listing-detail-gallery__media public-listing-detail-gallery__media--video"
                controls
                playsInline
                preload="metadata"
                poster={poster}
            />
        );
    }

    if (slide.type === 'video-embed') {
        return (
            <iframe
                src={slide.url}
                title={`Video de ${title}`}
                className="public-listing-detail-gallery__media public-listing-detail-gallery__media--embed"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        );
    }

    return (
        <Image
            src={slide.url}
            alt={title}
            fill
            className="public-listing-detail-gallery__media public-listing-detail-gallery__media--photo"
            priority={priority}
            sizes="(max-width: 1024px) 100vw, 70vw"
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
