'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FeaturedBoostSliderSection } from '@simple/ui/featured';
import {
    BOOST_SECTION_META,
    fetchFeaturedBoosted,
    type FeaturedBoostItem,
    type ListingBoostSection,
} from '@/lib/boost';
import { resolveListingSellerAvatarUrl } from '@simple/utils';
import { orderPropertyCardTags } from '@simple/ui/listings';
import PropertyListingCard, { type PropertyListingCardData } from '@/components/listings/property-listing-card';

const SECTIONS: ListingBoostSection[] = ['sale', 'rent', 'project'];
const MAX_CARDS = 30;


function mapFeaturedBoostToPropertyCard(item: FeaturedBoostItem): PropertyListingCardData {
    const sectionLabel = item.section === 'sale' ? 'Venta' : item.section === 'rent' ? 'Arriendo' : 'Proyecto';
    const metaItems = orderPropertyCardTags(
        item.summary?.length
            ? item.summary
            : item.subtitle
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
        sellerAvatarUrl: resolveListingSellerAvatarUrl({ avatarUrl: item.owner?.avatar }),
        sellerIsFeatured: item.boosted,
        badge: sectionLabel,
        variant: item.section === 'rent' ? 'rent' : item.section === 'project' ? 'project' : 'sale',
        images,
        isSponsored: item.boosted,
        engagement: {
            views24h: 0,
            saves: 0,
        },
    };
}

export default function BoostedListingsSlider() {
    const [section, setSection] = useState<ListingBoostSection>('sale');
    const [items, setItems] = useState<FeaturedBoostItem[]>([]);
    const [loading, setLoading] = useState(true);

    const sectionMeta = BOOST_SECTION_META[section] ?? { label: 'Ventas', href: '/ventas' };

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

    const tabs = SECTIONS.map((key) => ({ key, label: BOOST_SECTION_META[key]?.label ?? key }));

    if (!loading && items.length === 0) {
        return null;
    }

    return (
        <FeaturedBoostSliderSection
            viewMoreHref={sectionMeta.href}
            viewMoreLabel={`Ver ${sectionMeta.label.toLowerCase()}`}
            tabs={tabs}
            activeTab={section}
            onTabChange={setSection}
            loading={loading}
            slides={slides}
            placeholderAspectClass="aspect-[3/4]"
        />
    );
}
