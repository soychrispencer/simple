'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { IconCamera, IconChevronLeft, IconChevronRight, IconMapPin } from '@tabler/icons-react';
import { joinClasses } from '../shared/join-classes';

export type SimplePublishPreviewSpec = {
    icon: ReactNode;
    label: string;
};

export type SimplePublishPreviewSlide = {
    type: 'video' | 'image';
    url: string;
};

export type SimplePublishPreviewCardProps = {
    badge: string;
    price: string;
    title: string;
    location: string;
    /** Fotos en orden de publicación (portada = primera). */
    photoUrls?: string[];
    /** Clip subido; se muestra primero como en la tarjeta real. */
    videoUrl?: string | null;
    /** @deprecated Usa `photoUrls` */
    coverUrl?: string | null;
    /** @deprecated Usa `videoUrl` */
    coverVideoUrl?: string | null;
    /** @deprecated Se calcula desde `photoUrls` y `videoUrl` */
    photoCount?: number;
    specs?: SimplePublishPreviewSpec[];
    brandLabel?: string;
    footerHint?: string;
    className?: string;
};

const SWIPE_THRESHOLD_PX = 44;

export function SimplePublishPreviewCard({
    badge,
    price,
    title,
    location,
    photoUrls,
    videoUrl,
    coverUrl,
    coverVideoUrl,
    specs = [],
    brandLabel = 'Simple',
    footerHint = 'Así se verá en el marketplace',
    className,
}: SimplePublishPreviewCardProps) {
    const resolvedPhotos = photoUrls ?? (coverUrl ? [coverUrl] : []);
    const resolvedVideo = videoUrl ?? coverVideoUrl ?? null;

    const slides = useMemo<SimplePublishPreviewSlide[]>(() => {
        const items: SimplePublishPreviewSlide[] = [];
        if (resolvedVideo) items.push({ type: 'video', url: resolvedVideo });
        for (const url of resolvedPhotos) {
            if (url.trim()) items.push({ type: 'image', url });
        }
        return items;
    }, [resolvedPhotos, resolvedVideo]);

    const [activeIndex, setActiveIndex] = useState(0);
    const touchStartX = useRef<number | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        setActiveIndex(0);
    }, [slides.length, slides[0]?.url]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const current = slides[activeIndex];
        if (current?.type === 'video') {
            void video.play().catch(() => undefined);
        } else {
            video.pause();
        }
    }, [activeIndex, slides]);

    const hasSlides = slides.length > 0;
    const canNavigate = slides.length > 1;
    const currentSlide = slides[activeIndex];

    const goTo = useCallback((index: number) => {
        if (slides.length === 0) return;
        const next = (index + slides.length) % slides.length;
        setActiveIndex(next);
    }, [slides.length]);

    const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);
    const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);

    const onTouchStart = (event: React.TouchEvent) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
    };

    const onTouchEnd = (event: React.TouchEvent) => {
        if (touchStartX.current == null || !canNavigate) return;
        const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
        const delta = endX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
        if (delta < 0) goNext();
        else goPrev();
    };

    return (
        <div
            className={joinClasses(
                'overflow-hidden rounded-2xl border border-(--border) bg-(--bg) shadow-md',
                className,
            )}
        >
            <div
                className="relative aspect-[9/14] overflow-hidden bg-[#09090b] touch-pan-y"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
            >
                {hasSlides ? (
                    <div className="absolute inset-0">
                        {slides.map((slide, index) => (
                            <div
                                key={`${slide.type}-${slide.url}-${index}`}
                                className={joinClasses(
                                    'absolute inset-0 transition-opacity duration-200',
                                    index === activeIndex ? 'opacity-100' : 'pointer-events-none opacity-0',
                                )}
                            >
                                {slide.type === 'video' ? (
                                    <video
                                        ref={index === activeIndex ? videoRef : undefined}
                                        src={slide.url}
                                        className="h-full w-full object-cover"
                                        muted
                                        playsInline
                                        loop
                                    />
                                ) : (
                                    <img src={slide.url} alt="" className="h-full w-full object-cover" />
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div
                        className="flex h-full w-full flex-col items-center justify-center gap-2 text-center"
                        style={{
                            background:
                                'radial-gradient(circle at 50% 18%, color-mix(in oklab, var(--accent) 18%, transparent), transparent 44%), #111827',
                        }}
                    >
                        <IconCamera size={26} className="text-white/55" />
                        <span className="text-xs font-medium text-white/75">Agrega la portada</span>
                    </div>
                )}

                <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/82 via-black/18 to-transparent" />

                <div className="absolute top-3 left-3 z-10">
                    <span className="inline-flex items-center rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
                        {badge}
                    </span>
                </div>

                {canNavigate ? (
                    <div className="absolute top-3 right-3 z-10">
                        <span className="inline-flex items-center rounded-full bg-black/40 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
                            {activeIndex + 1} / {slides.length}
                        </span>
                    </div>
                ) : null}

                {canNavigate ? (
                    <>
                        <button
                            type="button"
                            onClick={goPrev}
                            className="absolute top-1/2 left-2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur transition hover:bg-black/60"
                            aria-label="Foto anterior"
                        >
                            <IconChevronLeft size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={goNext}
                            className="absolute top-1/2 right-2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur transition hover:bg-black/60"
                            aria-label="Foto siguiente"
                        >
                            <IconChevronRight size={16} />
                        </button>
                    </>
                ) : null}

                <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-10 p-3">
                    {canNavigate ? (
                        <div className="mb-2 flex items-center justify-center gap-1.5">
                            {slides.map((slide, index) => (
                                <span
                                    key={`dot-${slide.type}-${index}`}
                                    className={joinClasses(
                                        'h-1.5 rounded-full transition-all',
                                        index === activeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/45',
                                    )}
                                />
                            ))}
                        </div>
                    ) : null}
                    <p className="text-center text-lg font-bold text-white drop-shadow-sm">{price}</p>
                    <h3 className="mt-0.5 line-clamp-2 text-center text-sm leading-tight font-semibold text-white">
                        {title}
                    </h3>
                    {specs.length > 0 ? (
                        <div className="mt-2 flex items-center justify-center gap-3">
                            {specs.map((spec, index) => (
                                <div key={index} className="flex flex-col items-center gap-0.5">
                                    <span className="text-white/45">{spec.icon}</span>
                                    <span className="text-[10px] text-white/80">{spec.label}</span>
                                </div>
                            ))}
                        </div>
                    ) : null}
                    <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-white/60">
                        <IconMapPin size={10} />
                        <span className="truncate">{location}</span>
                    </div>
                </div>

                {!hasSlides ? (
                    <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/5" />
                ) : null}
            </div>

            <div className="flex items-center justify-between border-t border-(--border) px-3 py-2">
                <p className="text-[10px] text-(--fg-muted)">
                    {canNavigate ? 'Desliza o usa las flechas para revisar fotos' : footerHint}
                </p>
                <span className="rounded-full bg-(--accent) px-2 py-0.5 text-[10px] font-semibold text-(--accent-contrast)">
                    {brandLabel}
                </span>
            </div>
        </div>
    );
}
