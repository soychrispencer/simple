'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Keyboard, Navigation, Pagination } from 'swiper/modules';
import type { Swiper as SwiperInstance } from 'swiper';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import 'swiper/css';
import 'swiper/css/pagination';
import { makeSeededGradients } from './utils';
import type { ListingAccent, ListingImage } from '../types';

type Props = {
    images: ListingImage[];
    title: string;
    seed: string;
    accent: ListingAccent;
    aspectClassName?: string;
    sizes?: string;
    rounded?: string;
    showArrows?: boolean;
    showDots?: boolean;
    onSlideClick?: () => void;
};

export default function ListingImageCarousel({
    images,
    title,
    seed,
    accent,
    aspectClassName = 'aspect-[4/3]',
    rounded = 'rounded-t-2xl',
    showArrows = true,
    showDots = true,
    onSlideClick,
}: Props) {
    const prevRef = useRef<HTMLButtonElement | null>(null);
    const nextRef = useRef<HTMLButtonElement | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [swiperInstance, setSwiperInstance] = useState<SwiperInstance | null>(null);

    const slides = useMemo(() => {
        if (images.length > 0) return images.map((img, i) => ({ kind: 'img' as const, src: img.src, alt: img.alt ?? `${title} — imagen ${i + 1}` }));
        return makeSeededGradients(seed, accent).map((gradient) => ({ kind: 'gradient' as const, gradient }));
    }, [images, seed, accent, title]);

    const total = slides.length;
    const multi = total > 1;

    useEffect(() => {
        if (!swiperInstance) return;
        // Rebind navigation after refs exist
        const navParams = swiperInstance.params.navigation;
        if (navParams && typeof navParams === 'object') {
            (navParams as { prevEl: HTMLElement | null; nextEl: HTMLElement | null }).prevEl = prevRef.current;
            (navParams as { prevEl: HTMLElement | null; nextEl: HTMLElement | null }).nextEl = nextRef.current;
        }
        swiperInstance.navigation?.destroy?.();
        swiperInstance.navigation?.init?.();
        swiperInstance.navigation?.update?.();
    }, [swiperInstance]);

    const stop = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <div
            className={`relative w-full ${aspectClassName} ${rounded} overflow-hidden shrink-0 select-none`}
            style={{ background: 'var(--bg-muted)' }}
            onClick={onSlideClick}
        >
            <Swiper
                modules={[Pagination, Navigation, A11y, Keyboard]}
                slidesPerView={1}
                spaceBetween={0}
                loop={false}
                keyboard={{ enabled: true }}
                a11y={{
                    prevSlideMessage: 'Imagen anterior',
                    nextSlideMessage: 'Imagen siguiente',
                    paginationBulletMessage: 'Ir a imagen {{index}}',
                }}
                navigation={multi ? { prevEl: prevRef.current, nextEl: nextRef.current } : false}
                onSwiper={(s) => setSwiperInstance(s)}
                onSlideChange={(s) => setActiveIndex(s.activeIndex)}
                className="absolute inset-0 h-full w-full"
            >
                {slides.map((slide, index) => (
                    <SwiperSlide key={`${seed}-${index}`} className="h-full w-full">
                        {slide.kind === 'img' ? (
                            <img
                                src={slide.src}
                                alt={slide.alt}
                                loading="lazy"
                                decoding="async"
                                draggable={false}
                                className="absolute inset-0 h-full w-full object-cover"
                            />
                        ) : (
                            <div className="absolute inset-0 h-full w-full" style={{ background: slide.gradient }} />
                        )}
                    </SwiperSlide>
                ))}
            </Swiper>

            {multi && showArrows ? (
                <>
                    <button
                        ref={prevRef}
                        type="button"
                        aria-label="Imagen anterior"
                        onClick={stop}
                        className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/70"
                    >
                        <IconChevronLeft size={16} />
                    </button>
                    <button
                        ref={nextRef}
                        type="button"
                        aria-label="Imagen siguiente"
                        onClick={stop}
                        className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/70"
                    >
                        <IconChevronRight size={16} />
                    </button>
                </>
            ) : null}

            {multi && showDots ? (
                <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
                    {slides.map((_, index) => (
                        <span
                            key={`dot-${index}`}
                            aria-hidden
                            className="rounded-full transition-all duration-200"
                            style={{
                                width: activeIndex === index ? 20 : 6,
                                height: 4,
                                background: activeIndex === index ? '#ffffff' : 'rgba(255,255,255,0.55)',
                            }}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}
