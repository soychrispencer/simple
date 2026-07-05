'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    SimplePublishShareHub,
    type SimplePublishShareIntegration,
} from '@simple/ui/simple-publish';
import { SIMPLE_PUBLISH_INTEGRATIONS_CONNECT_HREF } from '@simple/utils';
import {
    fetchInstagramIntegrationStatus,
    publishListingToInstagramEnhanced,
} from '@/lib/instagram';

type Props = {
    listingId: string;
    listingTitle: string;
    listingHref: string;
    hasVideo?: boolean;
    shareText?: string;
};

export function ShareToSocialPanel({
    listingId,
    listingTitle,
    listingHref,
    hasVideo = false,
    shareText,
}: Props) {
    const [loading, setLoading] = useState(true);
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [igConnected, setIgConnected] = useState(false);
    const [publishedKeys, setPublishedKeys] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchInstagramIntegrationStatus()
            .then((instagram) => {
                setIgConnected(Boolean(instagram?.account?.status === 'connected'));

                const published = new Set<string>();
                for (const item of instagram?.recentPublications ?? []) {
                    if (item.listingId !== listingId || item.status !== 'published') continue;
                    published.add('instagram_carousel');
                }
                setPublishedKeys(published);
            })
            .catch(() => setIgConnected(false))
            .finally(() => setLoading(false));
    }, [listingId]);

    async function publishInstagram() {
        setBusyKey('instagram_carousel');
        const result = await publishListingToInstagramEnhanced(listingId, {
            useAI: true,
            tone: 'professional',
            targetAudience: 'general',
        });
        setBusyKey(null);
        if (result.ok && result.result) {
            setPublishedKeys((current) => new Set([...current, 'instagram_carousel']));
        }
    }

    const connectHref = SIMPLE_PUBLISH_INTEGRATIONS_CONNECT_HREF;

    const integrations = useMemo<SimplePublishShareIntegration[]>(() => [
        {
            key: 'instagram_carousel',
            label: 'Instagram · Fotos',
            icon: 'instagram',
            available: true,
            connected: igConnected,
            connectHref,
            onPublish: () => publishInstagram(),
            busy: busyKey === 'instagram_carousel',
            published: publishedKeys.has('instagram_carousel'),
        },
    ], [busyKey, connectHref, igConnected, publishedKeys]);

    return (
        <SimplePublishShareHub
            brandName="SimplePropiedades"
            listingTitle={listingTitle}
            publishedHref={listingHref}
            shareText={shareText}
            integrations={integrations}
            loading={loading}
            hasVideo={hasVideo}
        />
    );
}
