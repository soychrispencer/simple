'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FeaturedBoostSliderSection } from '@simple/ui/featured';
import { resolveAppMediaUrl } from '@simple/utils';
import { BOOST_SECTION_META, fetchFeaturedBoosted, type BoostSection, type FeaturedBoostItem } from '@/lib/boost';
import { PanelCard } from '@simple/ui/panel';

export function BoostedCatalogSlider({ section }: { section: 'products' | 'services' }) {
    const [items, setItems] = useState<FeaturedBoostItem[]>([]);
    const [loading, setLoading] = useState(true);
    const sectionMeta = BOOST_SECTION_META[section];

    const loadItems = useCallback(async () => {
        setLoading(true);
        const featured = await fetchFeaturedBoosted(section as BoostSection, 12);
        setItems(featured);
        setLoading(false);
    }, [section]);

    useEffect(() => {
        void loadItems();
    }, [loadItems]);

    const slides = useMemo(
        () => items.map((item) => ({
            key: item.id,
            node: (
                <Link href={item.href} className="block h-full">
                    <PanelCard size="md" className="flex h-full flex-col gap-3 p-4">
                        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-bg-muted">
                            {item.imageUrl ? (
                                <Image
                                    src={resolveAppMediaUrl(item.imageUrl) ?? item.imageUrl}
                                    alt={item.title}
                                    fill
                                    className="object-cover"
                                    sizes="280px"
                                    unoptimized
                                />
                            ) : null}
                        </div>
                        <div className="space-y-1">
                            <p className="line-clamp-2 text-base font-semibold text-fg">{item.title}</p>
                            <p className="text-sm text-fg-secondary">{item.price}</p>
                            <p className="text-xs text-fg-muted">{item.location}</p>
                        </div>
                    </PanelCard>
                </Link>
            ),
        })),
        [items],
    );

    if (!loading && items.length === 0) return null;

    return (
        <FeaturedBoostSliderSection
            title={section === 'products' ? 'Productos destacados' : 'Servicios destacados'}
            subtitle={section === 'products'
                ? 'Accesorios impulsados por negocios verificados.'
                : 'Talleres y servicios con mayor visibilidad.'}
            viewMoreHref={sectionMeta.href}
            viewMoreLabel={`Ver ${sectionMeta.label.toLowerCase()}`}
            tabs={[{ key: section, label: sectionMeta.label }]}
            activeTab={section}
            onTabChange={() => undefined}
            loading={loading}
            slides={slides}
            placeholderAspectClass="aspect-4/3"
        />
    );
}
