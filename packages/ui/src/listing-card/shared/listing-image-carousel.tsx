'use client';

import { useState, useMemo } from 'react';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { makeSeededGradients } from './utils';
import type { ListingAccent, ListingImage } from '../types';

type Props = {
    images: ListingImage[];
    title: string;
    seed: string;
    accent: ListingAccent;
    aspectClassName?: string;
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
    const [activeIndex, setActiveIndex] = useState(0);

    const slides = useMemo(() => {
        if (images.length > 0) return images.map((img, i) => ({ kind: 'img' as const, src: img.src, alt: img.alt ?? `${title} imagen ${i + 1}` }));
        return makeSeededGradients(seed, accent).map((gradient) => ({ kind: 'gradient' as const, gradient }));
    }, [images, seed, accent, title]);

    const total = slides.length;
    const multi = total > 1;

    const goTo = (direction: number, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setActiveIndex((prev) => {
            const newIndex = prev + direction;
            if (newIndex < 0) return total - 1;
            if (newIndex >= total) return 0;
            return newIndex;
        });
    };

    if (slides.length === 0) {
        return (
            <div
                className={`relative w-full ${aspectClassName} ${rounded} overflow-hidden shrink-0`}
                style={{ background: 'var(--bg-muted)' }}
            />
        );
    }

    return (
        <div
            className={`relative w-full ${aspectClassName} ${rounded} overflow-hidden shrink-0`}
            style={{ background: 'var(--bg-muted)' }}
            onClick={onSlideClick}
        >
            {/* Slides */}
            <div
                className="flex h-full w-full"
                style={{ transform: `translateX(-${activeIndex * 100}%)`, transition: 'transform 0.3s ease-out' }}
            >
                {slides.map((slide, index) => (
                    <div
                        key={`${seed}-${index}`}
                        className="h-full w-full flex-shrink-0 flex-grow-0"
                        style={{ minWidth: '100%', minHeight: '100%' }}
                    >
                        {slide.kind === 'img' ? (
                            <img
                                src={slide.src}
                                alt={slide.alt}
                                loading={index === 0 ? 'eager' : 'lazy'}
                                decoding="async"
                                className="h-full w-full object-cover"
                                style={{ display: 'block', minHeight: '100%' }}
                            />
                        ) : (
                            <div className="h-full w-full" style={{ background: slide.gradient }} />
                        )}
                    </div>
                ))}
            </div>

            {/* Arrows */}
            {multi && showArrows && (
                <>
                    <button
                        type="button"
                        aria-label="Imagen anterior"
                        onClick={(e) => goTo(-1, e)}
                        className="absolute left-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-md"
                    >
                        <IconChevronLeft size={16} />
                    </button>
                    <button
                        type="button"
                        aria-label="Imagen siguiente"
                        onClick={(e) => goTo(1, e)}
                        className="absolute right-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-md"
                    >
                        <IconChevronRight size={16} />
                    </button>
                </>
            )}

            {/* Dots */}
            {multi && showDots && (
                <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
                    {slides.map((_, index) => (
                        <span
                            key={`dot-${index}`}
                            className="rounded-full"
                            style={{
                                width: activeIndex === index ? 20 : 6,
                                height: 4,
                                background: activeIndex === index ? '#ffffff' : 'rgba(255,255,255,0.55)',
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
