'use client';

import { useCallback, useEffect, useState } from 'react';
import { ListingDistributionPanel } from '@simple/ui/panel';
import type { ListingDistributionChannel } from '@simple/utils';
import {
    fetchPanelListingDetail,
    trackPortalIntegration,
    type PanelListing,
} from '@/lib/panel-listings';

type Props = {
    listingId: string;
    vertical: 'autos' | 'propiedades';
    brandLabel: string;
    listingTitle: string;
    listingHref: string;
    listingPrice?: string | null;
    listingDescription?: string | null;
    listingLocation?: string | null;
    refreshToken?: number;
};

export function ListingDistributionSection({
    listingId,
    vertical,
    brandLabel,
    listingTitle,
    listingHref,
    listingPrice,
    listingDescription,
    listingLocation,
    refreshToken = 0,
}: Props) {
    const [loading, setLoading] = useState(true);
    const [channels, setChannels] = useState<ListingDistributionChannel[]>([]);
    const [listingStatus, setListingStatus] = useState<PanelListing['status']>('active');
    const [detailMeta, setDetailMeta] = useState<Pick<PanelListing, 'title' | 'price' | 'description' | 'location' | 'href'> | null>(null);
    const [marking, setMarking] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [fbPublished, setFbPublished] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const result = await fetchPanelListingDetail(listingId);
        if (result.ok && result.item) {
            setChannels(result.item.distribution ?? []);
            setListingStatus(result.item.status);
            setDetailMeta({
                title: result.item.title,
                price: result.item.price,
                description: result.item.description,
                location: result.item.location,
                href: result.item.href,
            });
            const facebook = result.item.integrations.find((item) => item.portal === 'facebook');
            setFbPublished(facebook?.status === 'published');
        }
        setLoading(false);
    }, [listingId]);

    useEffect(() => {
        void load();
    }, [load, refreshToken]);

    async function handleMarkPublished(externalUrl: string | null) {
        setMarking(true);
        const result = await trackPortalIntegration(listingId, 'facebook', 'mark_published', externalUrl);
        setMarking(false);
        if (!result.ok) return;
        if (result.distribution) setChannels(result.distribution);
        setFbPublished(true);
        void load();
    }

    async function handleClearPublished() {
        setClearing(true);
        const result = await trackPortalIntegration(listingId, 'facebook', 'clear');
        setClearing(false);
        if (!result.ok) return;
        if (result.distribution) setChannels(result.distribution);
        setFbPublished(false);
        void load();
    }

    return (
        <ListingDistributionPanel
            channels={channels}
            loading={loading}
            soldHint={listingStatus === 'sold'}
            onRefresh={() => void load()}
            marketplaceAssist={{
                vertical,
                brandLabel,
                listingTitle: listingTitle || detailMeta?.title || '',
                listingHref: listingHref || detailMeta?.href || '',
                listingPrice: listingPrice ?? detailMeta?.price,
                listingDescription: listingDescription ?? detailMeta?.description,
                listingLocation: listingLocation ?? detailMeta?.location,
                marking,
                clearing,
                initialPublished: fbPublished,
                onMarkPublished: handleMarkPublished,
                onClearPublished: handleClearPublished,
            }}
        />
    );
}
