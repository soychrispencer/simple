'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperInstance } from 'swiper';
import { A11y, Autoplay, Keyboard, Navigation, Pagination } from 'swiper/modules';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import 'swiper/css';
import 'swiper/css/pagination';

type Props = {
    items: Array<{ key: string; node: ReactNode }>;
    autoplay?: boolean;
    autoplayDelay?: number;
    showNav?: boolean;
    showProgress?: boolean;
    showDots?: boolean;
};

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

    if (items.length === 0) return null;

    return (
        <div className="relative px-12 md:px-14">
            {showProgress && items.length > 1 && (
                <div className="mb-3 px-1">
                    <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
                            {activeIndex + 1} de {items.length}
                        </p>
                        <p className="text-xs font-medium" style={{ color: 'var(--fg-secondary)' }}>
                            Destacados
                        </p>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
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
                onSwiper={(s) => (swiperRef.current = s)}
                onSlideChange={(s) => setActiveIndex(s.realIndex)}
                slidesPerView={1.15}
                spaceBetween={12}
                loop={true}
                speed={500}
                grabCursor={true}
                keyboard={{ enabled: true }}
                touchRatio={1}
                threshold={5}
                touchStartPreventDefault={false}
                touchMoveStopPropagation={false}
                autoplay={
                    autoplay
                        ? { 
                            delay: autoplayDelay, 
                            disableOnInteraction: false, 
                            pauseOnMouseEnter: true,
                        }
                        : false
                }
                navigation={
                    showNav && items.length > 1
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
                    480: { slidesPerView: 1.5, spaceBetween: 14 },
                    640: { slidesPerView: 2.2, spaceBetween: 16 },
                    900: { slidesPerView: 3, spaceBetween: 16 },
                    1280: { slidesPerView: 4, spaceBetween: 16 },
                }}
                pagination={
                    showDots && items.length > 1
                        ? {
                              clickable: true,
                              bulletClass: 'swiper-pagination-bullet custom-bullet',
                              bulletActiveClass: 'swiper-pagination-bullet-active custom-bullet-active',
                          }
                        : false
                }
                className="!overflow-hidden !pb-2"
            >
                {items.map((item) => (
                    <SwiperSlide key={item.key} className="!h-auto select-none">
                        <div className="h-full cursor-grab active:cursor-grabbing">{item.node}</div>
                    </SwiperSlide>
                ))}
            </Swiper>

            {showNav && items.length > 1 && (
                <>
                    <button
                        ref={prevRef}
                        type="button"
                        aria-label="Anterior"
                        className="absolute left-0 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border shadow-md transition hover:shadow-lg hover:scale-105 hidden md:flex z-10"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                    >
                        <IconChevronLeft size={18} />
                    </button>
                    <button
                        ref={nextRef}
                        type="button"
                        aria-label="Siguiente"
                        className="absolute right-0 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border shadow-md transition hover:shadow-lg hover:scale-105 hidden md:flex z-10"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                    >
                        <IconChevronRight size={18} />
                    </button>
                </>
            )}

        </div>
    );
}
