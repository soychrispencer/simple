'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperInstance } from 'swiper';
import { A11y, Autoplay, Keyboard, Navigation, Pagination } from 'swiper/modules';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import 'swiper/css';
import 'swiper/css/pagination';

type SlideItem = { key: string; node: ReactNode };

type Props = {
    items: SlideItem[];
    autoplay?: boolean;
    autoplayDelay?: number;
    showNav?: boolean;
    showProgress?: boolean;
    showDots?: boolean;
};

function useMobileCarousel(breakpoint = 768): boolean {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const media = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
        const apply = () => setIsMobile(media.matches);
        apply();
        media.addEventListener('change', apply);
        return () => media.removeEventListener('change', apply);
    }, [breakpoint]);

    return isMobile;
}

export default function FeaturedCardSwiper({
    items,
    autoplay = true,
    autoplayDelay = 4000,
    showNav = true,
    showProgress = true,
    showDots = false,
}: Props) {
    const prevRef = useRef<HTMLButtonElement | null>(null);
    const nextRef = useRef<HTMLButtonElement | null>(null);
    const swiperRef = useRef<SwiperInstance | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const isMobile = useMobileCarousel();

    if (items.length === 0) return null;

    const canAdvance = items.length > 1;

    return (
        <div className="featured-card-swiper relative min-w-0 max-w-full overflow-hidden px-0 md:px-14">
            {showProgress && canAdvance && (
                <div className="mb-3 px-1">
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
                        {activeIndex + 1} de {items.length}
                    </p>
                    <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                        <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                                width: `${((activeIndex + 1) / items.length) * 100}%`,
                                background: 'var(--accent)',
                            }}
                        />
                    </div>
                </div>
            )}

            <Swiper
                modules={[Navigation, Autoplay, A11y, Keyboard, Pagination]}
                onSwiper={(swiper) => {
                    swiperRef.current = swiper;
                }}
                onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
                slidesPerView={1}
                slidesPerGroup={1}
                spaceBetween={12}
                loop={false}
                rewind={canAdvance}
                speed={500}
                grabCursor={canAdvance}
                allowTouchMove={canAdvance}
                allowSlidePrev={!isMobile}
                watchOverflow
                keyboard={{ enabled: true }}
                touchRatio={1}
                threshold={8}
                autoplay={
                    autoplay && canAdvance
                        ? {
                              delay: autoplayDelay,
                              disableOnInteraction: false,
                              pauseOnMouseEnter: true,
                              reverseDirection: false,
                          }
                        : false
                }
                navigation={
                    showNav && canAdvance
                        ? { prevEl: prevRef.current, nextEl: nextRef.current }
                        : false
                }
                onBeforeInit={(swiper) => {
                    if (swiper.params.navigation && typeof swiper.params.navigation === 'object') {
                        const nav = swiper.params.navigation as { prevEl: HTMLElement | null; nextEl: HTMLElement | null };
                        nav.prevEl = prevRef.current;
                        nav.nextEl = nextRef.current;
                    }
                }}
                breakpoints={{
                    768: { slidesPerView: 2, spaceBetween: 16 },
                    1024: { slidesPerView: 3, spaceBetween: 16 },
                    1280: { slidesPerView: 4, spaceBetween: 16 },
                }}
                pagination={
                    showDots && canAdvance
                        ? {
                              clickable: true,
                              bulletClass: 'swiper-pagination-bullet custom-bullet',
                              bulletActiveClass: 'swiper-pagination-bullet-active custom-bullet-active',
                          }
                        : false
                }
                className="featured-card-swiper__track !overflow-hidden !pb-2"
            >
                {items.map((item) => (
                    <SwiperSlide key={item.key} className="featured-card-swiper__slide !h-auto">
                        <div className="featured-card-swiper__slide-inner">{item.node}</div>
                    </SwiperSlide>
                ))}
            </Swiper>

            {showNav && canAdvance && (
                <>
                    <button
                        ref={prevRef}
                        type="button"
                        aria-label="Anterior"
                        className="absolute left-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border shadow-md transition hover:scale-105 hover:shadow-lg md:flex"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                    >
                        <IconChevronLeft size={18} />
                    </button>
                    <button
                        ref={nextRef}
                        type="button"
                        aria-label="Siguiente"
                        className="absolute right-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border shadow-md transition hover:scale-105 hover:shadow-lg md:flex"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                    >
                        <IconChevronRight size={18} />
                    </button>
                </>
            )}
        </div>
    );
}
