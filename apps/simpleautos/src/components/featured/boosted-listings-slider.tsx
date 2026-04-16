'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    IconArrowRight,
    IconChevronLeft,
    IconChevronRight,
} from '@tabler/icons-react';
import {
    BOOST_SECTION_META,
    fetchFeaturedBoosted,
    type BoostSection,
    type FeaturedBoostItem,
} from '@/lib/boost';
import VehicleListingCard, { type VehicleListingCardData } from '@/components/listings/vehicle-listing-card';

const SECTIONS: BoostSection[] = ['sale', 'rent', 'auction'];

function orderVehicleTags(tags: string[]): string[] {
    const allowedPatterns = [
        /auto|sedán|hatchback|suv|camioneta|pickup|van|bus|deportivo|coupe|moto|cuatrimoto|convertible/i,
        /usado|nuevo|seminuevo|impecable|excelente|buen estado|como nuevo/i,
        /km|kilometraje|kilómetro/i,
        /bencina|diesel|híbrido|hibrido|eléctrico|electrico|gas|petróleo/i,
        /automático|automatico|manual|cvt|secuencial/i
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

function mapFeaturedBoostToVehicleCard(item: FeaturedBoostItem): VehicleListingCardData {
    const sectionLabel = item.section === 'sale' ? 'Venta' : item.section === 'rent' ? 'Arriendo' : 'Subasta';
    const metaItems = orderVehicleTags(
        item.subtitle
            .split(/[•\|;,]|\s+-\s+/g)
            .map(p => p.trim())
            .filter(p => p.length > 0)
    );
    const images = item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls : (item.imageUrl ? [item.imageUrl] : []);
    return {
        id: item.id,
        href: item.href,
        title: item.title,
        price: item.price,
        priceLabel: undefined,
        subtitle: item.subtitle,
        meta: metaItems,
        location: item.location,
        sellerName: item.owner?.name || 'Vendedor',
        sellerMeta: 'Publicado recientemente',
        sellerAvatarUrl: item.owner?.avatar,
        badge: sectionLabel,
        variant: item.section,
        images,
        listedSince: 'Reciente',
        engagement: {
            views24h: 0,
            saves: 0,
        },
    };
}

export default function BoostedListingsSlider() {
    const [section, setSection] = useState<BoostSection>('sale');
    const [items, setItems] = useState<FeaturedBoostItem[]>([]);
    const [loading, setLoading] = useState(true);

    const sliderRef = useRef<HTMLDivElement | null>(null);
    const sectionMeta = BOOST_SECTION_META[section];

    const loadItems = useCallback(async () => {
        setLoading(true);
        const featured = await fetchFeaturedBoosted(section, 8);
        setItems(featured);
        setLoading(false);
    }, [section]);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    const scrollByCards = (direction: -1 | 1) => {
        const node = sliderRef.current;
        if (!node) return;
        node.scrollBy({ left: direction * 328, behavior: 'smooth' });
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
            return (
                <article
                    className="w-full rounded-xl border p-8 text-center"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                        Aún no hay publicaciones impulsadas en esta sección.
                    </p>
                </article>
            );
        }

        return items.map((item) => (
            <div key={item.id} className="shrink-0 w-[280px]">
                <VehicleListingCard data={mapFeaturedBoostToVehicleCard(item)} mode="grid" />
            </div>
        ));
    }, [items, loading]);

    return (
        <section style={{ borderTop: '1px solid var(--border)' }}>
            <div className="container-app py-14">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div>
                        <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>
                            Publicaciones destacadas
                        </h2>
                        <p className="text-sm mt-1" style={{ color: 'var(--fg-secondary)' }}>
                            Ordenadas por campañas Boost activas.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href={sectionMeta.href}
                            className="text-sm font-medium inline-flex items-center gap-1"
                            style={{ color: 'var(--fg-muted)' }}
                        >
                            Ver {sectionMeta.label.toLowerCase()} <IconArrowRight size={12} />
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
                    {SECTIONS.map((itemSection) => (
                        <button
                            key={itemSection}
                            onClick={() => setSection(itemSection)}
                            className="h-9 px-4 rounded-md text-sm border transition-all hover:bg-(--bg-subtle) hover:border-(--border-strong) hover:text-(--fg)"
                            style={{
                                borderColor: section === itemSection ? 'var(--button-primary-border)' : 'var(--border)',
                                background: section === itemSection ? 'var(--button-primary-bg)' : 'var(--surface)',
                                color: section === itemSection ? 'var(--button-primary-color)' : 'var(--fg-secondary)',
                            }}
                        >
                            {BOOST_SECTION_META[itemSection].label}
                        </button>
                    ))}
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
