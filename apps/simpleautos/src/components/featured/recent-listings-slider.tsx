'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconArrowRight } from '@tabler/icons-react';
import { FeaturedCardSwiper } from '@simple/ui';
import { fetchPublicListings, type PublicListing } from '@/lib/public-listings';
import VehicleListingCard, { type VehicleListingCardData } from '@/components/listings/vehicle-listing-card';

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
    return {
        id: item.id,
        href: item.href,
        title: item.title,
        price: item.price,
        subtitle: item.description,
        meta: metaItems,
        location: item.location || 'Chile',
        sellerName: item.seller?.name ?? 'SimpleAutos',
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

    const loadItems = useCallback(async () => {
        setLoading(true);
        const listings = await fetchPublicListings('sale');
        setItems(listings.slice(0, MAX_CARDS));
        setLoading(false);
    }, []);

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
                    <Link
                        href="/ventas"
                        className="text-sm font-medium inline-flex items-center gap-1"
                        style={{ color: 'var(--fg-muted)' }}
                    >
                        Ver todas <IconArrowRight size={12} />
                    </Link>
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

                {loading ? (
                    <div className="flex gap-4 overflow-hidden">
                        {Array.from({ length: 4 }, (_, index) => (
                            <div
                                key={`placeholder-${index}`}
                                className="shrink-0 w-[calc(85%-8px)] sm:w-[45%] md:w-[32%] xl:w-[24%] rounded-2xl border animate-pulse"
                                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                            >
                                <div className="aspect-4/3 rounded-t-2xl" style={{ background: 'var(--bg-muted)' }} />
                                <div className="p-4 space-y-2">
                                    <div className="h-4 rounded" style={{ background: 'var(--bg-muted)' }} />
                                    <div className="h-3 rounded w-3/4" style={{ background: 'var(--bg-muted)' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <FeaturedCardSwiper items={slides} />
                )}
            </div>
        </section>
    );
}
