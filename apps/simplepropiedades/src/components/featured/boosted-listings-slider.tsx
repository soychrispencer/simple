'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconArrowRight } from '@tabler/icons-react';
import { FeaturedCardSwiper } from '@simple/ui';
import {
    BOOST_SECTION_META,
    fetchFeaturedBoosted,
    type BoostSection,
    type FeaturedBoostItem,
} from '@/lib/boost';
import PropertyListingCard, { type PropertyListingCardData } from '@/components/listings/property-listing-card';

const SECTIONS: BoostSection[] = ['sale', 'rent', 'project'];
const MAX_CARDS = 30;

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

function mapFeaturedBoostToPropertyCard(item: FeaturedBoostItem): PropertyListingCardData {
    const sectionLabel = item.section === 'sale' ? 'Venta' : item.section === 'rent' ? 'Arriendo' : 'Proyecto';
    const metaItems = orderPropertyTags(
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
        sellerAvatarUrl: undefined,
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

    const sectionMeta = BOOST_SECTION_META[section];

    const loadItems = useCallback(async () => {
        setLoading(true);
        const featured = await fetchFeaturedBoosted(section, MAX_CARDS);
        setItems(featured.slice(0, MAX_CARDS));
        setLoading(false);
    }, [section]);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    const slides = useMemo(() => {
        return items.map((item) => ({
            key: item.id,
            node: <PropertyListingCard data={mapFeaturedBoostToPropertyCard(item)} mode="grid" />,
        }));
    }, [items]);

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
                    <Link
                        href={sectionMeta.href}
                        className="text-sm font-medium inline-flex items-center gap-1"
                        style={{ color: 'var(--fg-muted)' }}
                    >
                        Ver {sectionMeta.label.toLowerCase()} <IconArrowRight size={12} />
                    </Link>
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

                {loading ? (
                    <div className="flex gap-4 overflow-hidden">
                        {Array.from({ length: 4 }, (_, index) => (
                            <div
                                key={`placeholder-${index}`}
                                className="shrink-0 w-[calc(85%-8px)] sm:w-[45%] md:w-[32%] xl:w-[24%] rounded-2xl border animate-pulse"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                            >
                                <div className="aspect-[3/2] rounded-t-2xl" style={{ background: 'var(--bg-muted)' }} />
                                <div className="p-4 space-y-2">
                                    <div className="h-4 rounded" style={{ background: 'var(--bg-muted)' }} />
                                    <div className="h-3 rounded w-3/4" style={{ background: 'var(--bg-muted)' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <article
                        className="w-full rounded-xl border p-8 text-center"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                    >
                        <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                            Aún no hay propiedades impulsadas en esta sección.
                        </p>
                    </article>
                ) : (
                    <FeaturedCardSwiper items={slides} />
                )}
            </div>
        </section>
    );
}
