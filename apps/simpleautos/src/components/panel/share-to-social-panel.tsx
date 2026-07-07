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
    type InstagramMediaFormat,
} from '@/lib/instagram';
import {
    fetchSocialHubStatus,
    publishListingToSocialHub,
    type SocialPublishTarget,
} from '@/lib/social-hub';
import { ListingDistributionSection } from '@/components/panel/listing-distribution-section';

type Props = {
    listingId: string;
    listingTitle: string;
    listingHref: string;
    listingPrice?: string | null;
    listingDescription?: string | null;
    listingLocation?: string | null;
    hasVideo?: boolean;
    shareText?: string;
};

export function ShareToSocialPanel({
    listingId,
    listingTitle,
    listingHref,
    listingPrice,
    listingDescription,
    listingLocation,
    hasVideo = false,
    shareText,
}: Props) {
    const [loading, setLoading] = useState(true);
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [distributionRefreshToken, setDistributionRefreshToken] = useState(0);
    const [listingHasVideo, setListingHasVideo] = useState(hasVideo);
    const [igConnected, setIgConnected] = useState(false);
    const [fbConnected, setFbConnected] = useState(false);
    const [tiktokConnected, setTiktokConnected] = useState(false);
    const [youtubeConnected, setYoutubeConnected] = useState(false);
    const [publishedKeys, setPublishedKeys] = useState<Set<string>>(new Set());

    useEffect(() => {
        setListingHasVideo(hasVideo);
    }, [hasVideo]);

    useEffect(() => {
        Promise.all([
            fetchInstagramIntegrationStatus(),
            fetchSocialHubStatus('autos'),
        ])
            .then(([instagram, hub]) => {
                setIgConnected(Boolean(
                    hub?.platforms.instagram.connected
                    || instagram?.account?.status === 'connected',
                ));
                setFbConnected(Boolean(hub?.platforms.facebook.connected && !hub?.platforms.facebook.needsReconnect));
                setTiktokConnected(Boolean(hub?.platforms.tiktok.connected));
                setYoutubeConnected(Boolean(hub?.platforms.youtube.connected));

                const published = new Set<string>();
                for (const item of instagram?.recentPublications ?? []) {
                    if (item.listingId !== listingId) continue;
                    published.add(item.contentType === 'reel' ? 'instagram_reel' : 'instagram_carousel');
                }
                for (const item of hub?.recentPublications ?? []) {
                    if (item.listingId !== listingId || item.status !== 'published') continue;
                    if (item.platform === 'facebook') published.add('facebook');
                    if (item.platform === 'tiktok') published.add('tiktok');
                    if (item.platform === 'youtube') published.add('youtube');
                }
                setPublishedKeys(published);
            })
            .catch(() => {
                setIgConnected(false);
                setFbConnected(false);
                setTiktokConnected(false);
                setYoutubeConnected(false);
            })
            .finally(() => setLoading(false));
    }, [listingId]);

    async function publishInstagram(format: InstagramMediaFormat) {
        const key = format === 'reel' ? 'instagram_reel' : 'instagram_carousel';
        setBusyKey(key);
        const result = await publishListingToInstagramEnhanced(listingId, {
            useAI: true,
            tone: 'professional',
            targetAudience: 'general',
            mediaFormat: format,
        });
        setBusyKey(null);
        if (result.ok && result.publication) {
            setPublishedKeys((current) => new Set([...current, key]));
            setDistributionRefreshToken((value) => value + 1);
        }
    }

    async function publishHub(target: SocialPublishTarget) {
        setBusyKey(target);
        const response = await publishListingToSocialHub(listingId, { targets: [target] });
        setBusyKey(null);
        const ok = response.results.some((item) => item.target === target && item.ok);
        if (ok) {
            setPublishedKeys((current) => new Set([...current, target]));
            setDistributionRefreshToken((value) => value + 1);
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
            onPublish: () => publishInstagram('carousel'),
            busy: busyKey === 'instagram_carousel',
            published: publishedKeys.has('instagram_carousel'),
        },
        {
            key: 'instagram_reel',
            label: 'Instagram · Reel',
            icon: 'instagram',
            available: true,
            connected: igConnected,
            connectHref,
            requiresVideo: true,
            onPublish: () => publishInstagram('reel'),
            busy: busyKey === 'instagram_reel',
            published: publishedKeys.has('instagram_reel'),
        },
        {
            key: 'facebook',
            label: 'Facebook · Página',
            icon: 'facebook',
            available: true,
            connected: fbConnected,
            connectHref,
            onPublish: () => publishHub('facebook'),
            busy: busyKey === 'facebook',
            published: publishedKeys.has('facebook'),
        },
        {
            key: 'tiktok',
            label: 'TikTok',
            icon: 'tiktok',
            available: true,
            connected: tiktokConnected,
            connectHref,
            requiresVideo: true,
            onPublish: () => publishHub('tiktok'),
            busy: busyKey === 'tiktok',
            published: publishedKeys.has('tiktok'),
        },
        {
            key: 'youtube',
            label: 'YouTube Shorts',
            icon: 'youtube',
            available: true,
            connected: youtubeConnected,
            connectHref,
            requiresVideo: true,
            onPublish: () => publishHub('youtube'),
            busy: busyKey === 'youtube',
            published: publishedKeys.has('youtube'),
        },
    ], [busyKey, connectHref, fbConnected, igConnected, publishedKeys, tiktokConnected, youtubeConnected]);

    return (
        <div className="space-y-5">
            <SimplePublishShareHub
                brandName="SimpleAutos"
                listingTitle={listingTitle}
                publishedHref={listingHref}
                shareText={shareText}
                integrations={integrations}
                loading={loading}
                hasVideo={listingHasVideo}
            />
            <ListingDistributionSection
                listingId={listingId}
                vertical="autos"
                brandLabel="SimpleAutos"
                listingTitle={listingTitle}
                listingHref={listingHref}
                listingPrice={listingPrice}
                listingDescription={listingDescription}
                listingLocation={listingLocation}
                refreshToken={distributionRefreshToken}
            />
        </div>
    );
}
