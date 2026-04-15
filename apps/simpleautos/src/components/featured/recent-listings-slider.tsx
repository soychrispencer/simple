'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    IconArrowRight,
    IconCar,
    IconChevronLeft,
    IconChevronRight,
    IconClock,
    IconMapPin,
} from '@tabler/icons-react';
import { fetchPublicListings, type PublicListing } from '@/lib/public-listings';

export default function RecentListingsSlider() {
    const [items, setItems] = useState<PublicListing[]>([]);
    const [loading, setLoading] = useState(true);

    const sliderRef = useRef<HTMLDivElement | null>(null);

    const loadItems = useCallback(async () => {
        setLoading(true);
        const listings = await fetchPublicListings('sale');
        setItems(listings.slice(0, 8));
        setLoading(false);
    }, []);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    const scrollByCards = (direction: -1 | 1) => {
        const node = sliderRef.current;
        if (!node) return;
        node.scrollBy({ left: direction * 328, behavior: 'smooth' });
    };

    const formatPrice = (price: string) => {
        const num = parseInt(price, 10);
        if (isNaN(num)) return price;
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            maximumFractionDigits: 0,
        }).format(num);
    };

    const cards = useMemo(() => {
        if (loading) {
            return Array.from({ length: 4 }, (_, index) => (
                <div
                    key={`placeholder-${index}`}
                    className="shrink-0 w-[280px] rounded-xl border animate-pulse"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <div className="aspect-4/3" style={{ background: 'var(--bg-muted)' }} />
                    <div className="p-4 space-y-2">
                        <div className="h-4 rounded" style={{ background: 'var(--bg-muted)' }} />
                        <div className="h-3 rounded w-3/4" style={{ background: 'var(--bg-muted)' }} />
                    </div>
                </div>
            ));
        }

        if (items.length === 0) {
            return null;
        }

        return items.map((item) => (
            <Link
                key={item.id}
                href={item.href}
                className="shrink-0 w-[280px] rounded-xl border overflow-hidden transition-all duration-300 hover:-translate-y-1"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
                <div
                    className="aspect-4/3 p-3 flex items-start justify-between"
                    style={{
                        background: item.images[0]
                            ? `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.55)), url(${item.images[0]}) center / cover no-repeat`
                            : 'var(--bg-muted)',
                    }}
                >
                    <span
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full"
                        style={{
                            background: 'rgba(15,23,42,0.65)',
                            color: '#ffffff',
                        }}
                    >
                        <IconCar size={12} />
                        {item.sectionLabel}
                    </span>
                </div>
                <div className="p-4 space-y-2">
                    <h3 className="text-sm font-semibold line-clamp-1" style={{ color: 'var(--fg)' }}>
                        {item.title}
                    </h3>
                    <p className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>
                        {formatPrice(item.price)}
                    </p>
                    <p className="text-xs line-clamp-1" style={{ color: 'var(--fg-secondary)' }}>
                        {item.summary.slice(0, 3).join(' • ')}
                    </p>
                    <div className="flex items-center justify-between text-xs" style={{ color: 'var(--fg-muted)' }}>
                        <span className="inline-flex items-center gap-1">
                            <IconMapPin size={12} />
                            {item.location}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <IconClock size={12} />
                            {item.publishedAgo}
                        </span>
                    </div>
                </div>
            </Link>
        ));
    }, [items, loading]);

    if (!loading && items.length === 0) {
        return null;
    }

    return (
        <section style={{ borderTop: '1px solid var(--border)' }}>
            <div className="container-app py-14">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div>
                        <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>
                            Recién llegados
                        </h2>
                        <p className="text-sm mt-1" style={{ color: 'var(--fg-secondary)' }}>
                            Las últimas publicaciones de vehículos.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/ventas"
                            className="text-sm font-medium inline-flex items-center gap-1"
                            style={{ color: 'var(--fg-muted)' }}
                        >
                            Ver todas <IconArrowRight size={12} />
                        </Link>
                        <div className="hidden md:flex items-center gap-2">
                            <button
                                onClick={() => scrollByCards(-1)}
                                className="w-9 h-9 rounded-md border flex items-center justify-center transition-colors hover:bg-(--bg-subtle) hover:border-(--border-strong)"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                                aria-label="Anterior"
                            >
                                <IconChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => scrollByCards(1)}
                                className="w-9 h-9 rounded-md border flex items-center justify-center transition-colors hover:bg-(--bg-subtle) hover:border-(--border-strong)"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                                aria-label="Siguiente"
                            >
                                <IconChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span
                        className="h-9 px-4 rounded-md text-sm border flex items-center"
                        style={{
                            borderColor: 'var(--button-primary-border)',
                            background: 'var(--button-primary-bg)',
                            color: 'var(--button-primary-color)',
                        }}
                    >
                        Venta
                    </span>
                </div>

                <div className="relative">
                    <div
                        ref={sliderRef}
                        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2"
                        style={{ scrollbarWidth: 'none' }}
                    >
                        {cards}
                    </div>
                </div>
            </div>
        </section>
    );
}
