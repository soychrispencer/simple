'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FeaturedBoostSliderSection } from '@simple/ui/featured';
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
        /baños|baño/i,
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
            .split(/[•|;,]|\s+-\s+/g)
            .map((p) => p.trim())
            .filter((p) => p.length > 0),
    );
    const images = item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls : item.imageUrl ? [item.imageUrl] : [];
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

    const slides = useMemo(
        () =>
            items.map((item) => ({
                key: item.id,
                node: <PropertyListingCard data={mapFeaturedBoostToPropertyCard(item)} mode="grid" />,
            })),
        [items],
    );

    const tabs = SECTIONS.map((key) => ({ key, label: BOOST_SECTION_META[key].label }));

    return (
        <FeaturedBoostSliderSection
            viewMoreHref={sectionMeta.href}
            viewMoreLabel={`Ver ${sectionMeta.label.toLowerCase()}`}
            tabs={tabs}
            activeTab={section}
            onTabChange={setSection}
            loading={loading}
            emptyMessage="Aún no hay propiedades impulsadas en esta sección."
            slides={slides}
            placeholderAspectClass="aspect-[3/2]"
        />
    );
}
