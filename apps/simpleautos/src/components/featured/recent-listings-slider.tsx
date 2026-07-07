'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconArrowRight } from '@tabler/icons-react';
import { FeaturedCardSwiper } from '@simple/ui/listings';
import {
    BOOST_SECTION_META,
    type BoostSection,
} from '@/lib/boost';
import {
    fetchPublicListings,
    selectRecentPublicListings,
    type PublicListing,
} from '@/lib/public-listings';
import { resolveListingSellerAvatarUrl } from '@simple/utils';
import VehicleListingCard, { type VehicleListingCardData } from '@/components/listings/vehicle-listing-card';

const SECTIONS: BoostSection[] = ['sale', 'rent', 'auction'];
const MAX_CARDS = 30;

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

function mapPublicListingToVehicleCard(item: PublicListing): VehicleListingCardData {
    const metaItems = orderVehicleTags(
        item.summary.slice(0, 5).filter(p => !p.includes('Publicación SimpleAutos') && !p.includes('Publicación SimplePropiedades'))
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
        sellerName: item.seller?.name ?? 'SimpleAutos',
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
    const [section, setSection] = useState<BoostSection>('sale');
    const [items, setItems] = useState<PublicListing[]>([]);
    const [loading, setLoading] = useState(true);

    const sectionMeta = BOOST_SECTION_META[section];

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
            node: <VehicleListingCard data={mapPublicListingToVehicleCard(item)} mode="grid" />,
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
                            Las últimas publicaciones de vehículos.
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
                            {BOOST_SECTION_META[key].label}
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
