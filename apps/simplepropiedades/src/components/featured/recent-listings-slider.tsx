'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    IconArrowRight,
    IconChevronLeft,
    IconChevronRight,
} from '@tabler/icons-react';
import PropertyListingCard, { type PropertyListingCardData } from '@/components/listings/property-listing-card';
import { fetchPublicListings, type PublicListing } from '@/lib/public-listings';

function orderPropertyTags(tags: string[]): string[] {
    const allowedPatterns = [
        /casa|departamento|oficina|terreno|local|bodega|estacionamiento/i,
        /usado|nuevo|seminuevo|impecable|excelente|buen estado|como nuevo/i,
        /m²|m2|metros|metraje|superficie/i,
        /habitaciones|dormitorios|habitación|dormitorio/i,
        /baños|baño/i
    ];

    const ordered: string[] = [];

    for (const tag of tags) {
        const lower = tag.toLowerCase();
        for (let i = 0; i < allowedPatterns.length; i++) {
            if (allowedPatterns[i].test(lower)) {
                ordered[i] = tag;
                break;
            }
        }
    }

    return ordered.filter(Boolean).slice(0, 5);
}

function mapPublicListingToPropertyCard(item: PublicListing): PropertyListingCardData {
    const metaItems = orderPropertyTags(
        item.summary.slice(0, 5).filter(p => !p.includes('Publicación SimpleAutos') && !p.includes('Publicación SimplePropiedades'))
    );
    return {
        id: item.id,
        href: item.href,
        title: item.title,
        price: item.price,
        subtitle: item.description,
        meta: metaItems,
        location: item.location || 'Chile',
        sellerName: item.seller?.name ?? 'SimplePropiedades',
        sellerMeta: `Actualizado hace ${item.publishedAgo}`,
        sellerAvatarUrl: undefined,
        sellerProfileHref: item.seller?.profileHref ?? undefined,
        badge: item.sectionLabel,
        variant: item.section,
        images: item.images,
        listedSince: `Actualizado hace ${item.publishedAgo}`,
        engagement: {
            views24h: item.views,
            saves: item.favs,
        },
    };
}

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
        const cardWidth = window.innerWidth >= 640 ? 280 : window.innerWidth / 2 - 16;
        node.scrollBy({ left: direction * (cardWidth + 16), behavior: 'smooth' });
    };

    const cards = useMemo(() => {
        if (loading) {
            return Array.from({ length: 4 }, (_, index) => (
                <div
                    key={`placeholder-${index}`}
                    className="shrink-0 w-[calc(50%-8px)] sm:w-[280px] rounded-xl border animate-pulse"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <div className="relative aspect-[4/3]" style={{ background: 'var(--bg-muted)' }}>
                        <div className="absolute top-2 left-2 h-6 w-12 rounded" style={{ background: 'var(--border)' }} />
                        <div className="absolute top-2 right-2 h-6 w-12 rounded" style={{ background: 'var(--border)' }} />
                    </div>
                    <div className="p-3 space-y-2">
                        <div className="h-5 rounded w-2/3" style={{ background: 'var(--bg-muted)' }} />
                        <div className="h-4 rounded w-full" style={{ background: 'var(--bg-muted)' }} />
                        <div className="flex gap-1.5">
                            <div className="h-3 rounded w-12" style={{ background: 'var(--bg-muted)' }} />
                            <div className="h-3 rounded w-12" style={{ background: 'var(--bg-muted)' }} />
                            <div className="h-3 rounded w-12" style={{ background: 'var(--bg-muted)' }} />
                        </div>
                        <div className="h-3 rounded w-1/2" style={{ background: 'var(--bg-muted)' }} />
                        <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                            <div className="w-5 h-5 rounded-full" style={{ background: 'var(--bg-muted)' }} />
                            <div className="h-3 rounded w-20" style={{ background: 'var(--bg-muted)' }} />
                        </div>
                    </div>
                </div>
            ));
        }

        if (items.length === 0) {
            return null;
        }

        return items.map((item) => (
            <div key={item.id} className="shrink-0 w-[calc(50%-8px)] sm:w-[280px]">
                <PropertyListingCard data={mapPublicListingToPropertyCard(item)} mode="grid" />
            </div>
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
                            Las últimas publicaciones de propiedades.
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
                                className="w-9 h-9 rounded-md border flex items-center justify-center transition-colors hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                                aria-label="Anterior"
                            >
                                <IconChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => scrollByCards(1)}
                                className="w-9 h-9 rounded-md border flex items-center justify-center transition-colors hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]"
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
