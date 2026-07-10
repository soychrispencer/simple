'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconArrowRight } from '@tabler/icons-react';
import { FeaturedCardSwiper } from '@simple/ui/listings';
import {
    fetchPublicListings,
    selectRecentPublicListings,
    type PublicListing,
    type PublicListingSection,
} from '@/lib/public-listings';
import { resolveListingSellerAvatarUrl } from '@simple/utils';
import { orderPropertyCardTags } from '@simple/ui/listings';
import PropertyListingCard, { type PropertyListingCardData } from '@/components/listings/property-listing-card';

const SECTIONS: PublicListingSection[] = ['sale', 'rent', 'project'];
const MAX_CARDS = 30;


function mapPublicListingToPropertyCard(item: PublicListing): PropertyListingCardData {
    const metaItems = orderPropertyCardTags(
        item.summary.slice(0, 5).filter((p) => !p.includes('Publicación SimplePropiedades')),
    );
    const listedLabel = item.days === 0 ? 'Publicado hoy' : item.days === 1 ? 'Publicado ayer' : `Publicado hace ${item.days} días`;
    return {
        id: item.id,
        href: item.href,
        title: item.title,
        price: item.price,
        subtitle: item.description,
        meta: metaItems,
        location: item.location || 'Chile',
        sellerName: item.seller?.name ?? 'SimplePropiedades',
        sellerMeta: listedLabel,
        sellerAvatarUrl: resolveListingSellerAvatarUrl(item.seller),
        sellerProfileHref: item.seller?.profileHref ?? undefined,
        badge: item.sectionLabel,
        variant: item.section,
        images: item.images,
        videoUrl: item.videoUrl ?? undefined,
        listedSince: listedLabel,
        engagement: {
            views24h: item.views,
            saves: item.favs,
        },
    };
}

export default function RecentListingsSlider() {
    const [section, setSection] = useState<PublicListingSection>('sale');
    const [items, setItems] = useState<PublicListing[]>([]);
    const [loading, setLoading] = useState(true);

    const listingSectionMeta: Record<PublicListingSection, { label: string; href: string }> = {
        sale: { label: 'Ventas', href: '/ventas' },
        rent: { label: 'Arriendos', href: '/arriendos' },
        project: { label: 'Proyectos', href: '/proyectos' },
    };
    const sectionMeta = listingSectionMeta[section];

    const loadItems = useCallback(async () => {
        setLoading(true);
        const listings = await fetchPublicListings(section);
        setItems(selectRecentPublicListings(listings, MAX_CARDS));
        setLoading(false);
    }, [section]);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    const slides = useMemo(() => {
        return items.map((item) => ({
            key: item.id,
            node: <PropertyListingCard data={mapPublicListingToPropertyCard(item)} mode="grid" />,
        }));
    }, [items]);

    if (!loading && items.length === 0) {
        return null;
    }

    return (
        <section className="min-w-0 overflow-x-hidden" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="container-app section-marketing min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div>
                        <h2 className="type-section-title" style={{ color: 'var(--fg)' }}>
                            Recién llegados
                        </h2>
                        <p className="text-sm mt-1" style={{ color: 'var(--fg-secondary)' }}>
                            Las últimas publicaciones de propiedades.
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
                    {SECTIONS.map((key) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setSection(key)}
                            className={`featured-boost-tab h-9 rounded-button border px-4 text-sm transition-all hover:border-(--border-strong) hover:bg-(--bg-subtle) hover:text-(--fg) ${
                                section === key ? 'featured-boost-tab--active' : ''
                            }`}
                        >
                            {listingSectionMeta[key].label}
                        </button>
                    ))}
                </div>

                {loading ? null : (
                    <FeaturedCardSwiper items={slides} />
                )}
            </div>
        </section>
    );
}
