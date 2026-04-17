'use client';

import { useRef, type ReactNode } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperInstance } from 'swiper';
import { A11y, Autoplay, Keyboard, Navigation } from 'swiper/modules';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import 'swiper/css';

type Props = {
    items: Array<{ key: string; node: ReactNode }>;
    autoplay?: boolean;
    autoplayDelay?: number;
    showNav?: boolean;
};

export default function FeaturedCardSwiper({
    items,
    autoplay = true,
    autoplayDelay = 3500,
    showNav = true,
}: Props) {
    const prevRef = useRef<HTMLButtonElement | null>(null);
    const nextRef = useRef<HTMLButtonElement | null>(null);
    const swiperRef = useRef<SwiperInstance | null>(null);

    if (items.length === 0) return null;

    const loopEnabled = items.length > 2;

    return (
        <div className="relative">
            <Swiper
                modules={[Navigation, Autoplay, A11y, Keyboard]}
                onSwiper={(s) => (swiperRef.current = s)}
                slidesPerView={1.15}
                spaceBetween={12}
                loop={loopEnabled}
                grabCursor
                keyboard={{ enabled: true }}
                autoplay={
                    autoplay
                        ? { delay: autoplayDelay, disableOnInteraction: false, pauseOnMouseEnter: true }
                        : false
                }
                navigation={
                    showNav
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
                className="!overflow-visible !pb-2"
            >
                {items.map((item) => (
                    <SwiperSlide key={item.key} className="!h-auto">
                        <div className="h-full">{item.node}</div>
                    </SwiperSlide>
                ))}
            </Swiper>

            {showNav && items.length > 1 ? (
                <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between md:flex">
                    <button
                        ref={prevRef}
                        type="button"
                        aria-label="Anterior"
                        className="pointer-events-auto -ml-3 flex h-10 w-10 items-center justify-center rounded-full border shadow-md transition hover:shadow-lg"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                    >
                        <IconChevronLeft size={18} />
                    </button>
                    <button
                        ref={nextRef}
                        type="button"
                        aria-label="Siguiente"
                        className="pointer-events-auto -mr-3 flex h-10 w-10 items-center justify-center rounded-full border shadow-md transition hover:shadow-lg"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                    >
                        <IconChevronRight size={18} />
                    </button>
                </div>
            ) : null}
        </div>
    );
}
