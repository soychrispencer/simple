'use client';

import { useEffect, useState } from 'react';
import { FacebookMarketplaceAssistCard } from '@simple/ui/panel';
import { trackPortalIntegration } from '@/lib/panel-listings';

type Props = {
    listingId: string;
    listingTitle: string;
    listingHref: string;
    listingPrice?: string | null;
    listingDescription?: string | null;
    listingLocation?: string | null;
    initialPublished?: boolean;
    initialExternalUrl?: string | null;
    onMarkedPublished?: () => void;
};

export function FacebookMarketplaceAssist({
    listingId,
    listingTitle,
    listingHref,
    listingPrice,
    listingDescription,
    listingLocation,
    initialPublished = false,
    initialExternalUrl = null,
    onMarkedPublished,
}: Props) {
    const [marking, setMarking] = useState(false);
    const [clearing, setClearing] = useState(false);

    return (
        <FacebookMarketplaceAssistCard
            vertical="autos"
            brandLabel="SimpleAutos"
            listingTitle={listingTitle}
            listingHref={listingHref}
            listingPrice={listingPrice}
            listingDescription={listingDescription}
            listingLocation={listingLocation}
            initialPublished={initialPublished}
            initialExternalUrl={initialExternalUrl}
            marking={marking}
            clearing={clearing}
            onMarkPublished={async (externalUrl) => {
                setMarking(true);
                const result = await trackPortalIntegration(listingId, 'facebook', 'mark_published', externalUrl);
                setMarking(false);
                if (result.ok) onMarkedPublished?.();
            }}
            onClearPublished={async () => {
                setClearing(true);
                await trackPortalIntegration(listingId, 'facebook', 'clear');
                setClearing(false);
            }}
        />
    );
}
