'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FeaturedBoostSliderSection } from '@simple/ui';
import {
    BOOST_SECTION_META,
    fetchFeaturedBoosted,
    type BoostSection,
    type FeaturedBoostItem,
} from '@/lib/boost';
import VehicleListingCard, { type VehicleListingCardData } from '@/components/listings/vehicle-listing-card';

const SECTIONS: BoostSection[] = ['sale', 'rent', 'auction'];
const MAX_CARDS = 30;

function orderVehicleTags(tags: string[]): string[] {
    const allowedPatterns = [
        /auto|sedán|hatchback|suv|camioneta|pickup|van|bus|deportivo|coupe|moto|cuatrimoto|convertible/i,
        /usado|nuevo|seminuevo|impecable|excelente|buen estado|como nuevo/i,
        /km|kilometraje|kilómetro/i,
        /bencina|diesel|híbrido|hibrido|eléctrico|electrico|gas|petróleo/i,
        /automático|automatico|manual|cvt|secuencial/i,
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
                node: <VehicleListingCard data={mapFeaturedBoostToVehicleCard(item)} mode="grid" />,
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
            emptyMessage="Aún no hay publicaciones impulsadas en esta sección."
            slides={slides}
            placeholderAspectClass="aspect-4/3"
        />
    );
}
