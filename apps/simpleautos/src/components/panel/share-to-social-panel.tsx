'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    SimplePublishShareHub,
    type SimplePublishShareIntegration,
} from '@simple/ui/simple-publish';
import {
    SIMPLE_PUBLISH_INTEGRATIONS_CONNECT_HREF,
    buildMarketplaceListingCopy,
    buildMarketplacePublicUrl,
    getFacebookMarketplaceCreateUrl,
} from '@simple/utils';
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
import {
    fetchPanelListingDetail,
    trackPortalIntegration,
} from '@/lib/panel-listings';
import { listingHasShareableVideo } from '@/lib/listing-media';

type Props = {
    listingId: string;
    listingTitle: string;
    listingHref: string;
    listingPrice?: string | null;
    listingDescription?: string | null;
    listingLocation?: string | null;
    hasVideo?: boolean;
    shareText?: string;
    brandName?: string;
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
    brandName = 'SimpleAutos',
}: Props) {
    const [loading, setLoading] = useState(true);
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [listingHasVideo, setListingHasVideo] = useState(hasVideo);
    const [igConnected, setIgConnected] = useState(false);
    const [fbConnected, setFbConnected] = useState(false);
    const [tiktokConnected, setTiktokConnected] = useState(false);
    const [youtubeConnected, setYoutubeConnected] = useState(false);
    const [publishedKeys, setPublishedKeys] = useState<Set<string>>(new Set());
    const [marketplacePublished, setMarketplacePublished] = useState(false);
    const [detailMeta, setDetailMeta] = useState({
        title: listingTitle,
        href: listingHref,
        price: listingPrice ?? '',
        description: listingDescription ?? '',
        location: listingLocation ?? '',
    });

    const loadMarketplaceState = useCallback(async () => {
        const result = await fetchPanelListingDetail(listingId);
        if (!result.ok || !result.item) return;
        setDetailMeta({
            title: result.item.title,
            href: result.item.href,
            price: result.item.price,
            description: result.item.description,
            location: result.item.location ?? '',
        });
        setListingHasVideo(listingHasShareableVideo(result.item));
        const facebook = result.item.integrations.find((item) => item.portal === 'facebook');
        setMarketplacePublished(facebook?.status === 'published');
    }, [listingId]);

    useEffect(() => {
        setListingHasVideo(hasVideo);
    }, [hasVideo]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all([
            fetchInstagramIntegrationStatus(),
            fetchSocialHubStatus('autos'),
            loadMarketplaceState(),
        ])
            .then(([instagram, hub]) => {
                if (cancelled) return;
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
                if (cancelled) return;
                setIgConnected(false);
                setFbConnected(false);
                setTiktokConnected(false);
                setYoutubeConnected(false);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [listingId, loadMarketplaceState]);

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
        }
    }

    async function publishHub(target: SocialPublishTarget) {
        setBusyKey(target);
        const response = await publishListingToSocialHub(listingId, { targets: [target] });
        setBusyKey(null);
        const ok = response.results.some((item) => item.target === target && item.ok);
        if (ok) {
            setPublishedKeys((current) => new Set([...current, target]));
        }
    }

    async function publishAllConnected() {
        setBusyKey('all');
        const response = await publishListingToSocialHub(listingId, { publishAll: true });
        setBusyKey(null);
        if (!response.ok) return;
        const succeeded = response.results.filter((item) => item.ok).map((item) => item.target);
        if (succeeded.length === 0) return;
        setPublishedKeys((current) => new Set([...current, ...succeeded]));
    }

    const canPublishAll = igConnected || fbConnected || tiktokConnected || youtubeConnected;

    async function copyMarketplaceAssist() {
        const href = detailMeta.href || listingHref;
        const copy = buildMarketplaceListingCopy({
            title: detailMeta.title || listingTitle,
            price: detailMeta.price || listingPrice,
            description: detailMeta.description || listingDescription,
            location: detailMeta.location || listingLocation,
            publicUrl: buildMarketplacePublicUrl(href),
            brandLabel: brandName,
        });
        await navigator.clipboard.writeText(copy);
    }

    async function markMarketplacePublished() {
        setBusyKey('facebook_marketplace');
        const result = await trackPortalIntegration(listingId, 'facebook', 'mark_published', null);
        setBusyKey(null);
        if (!result.ok) return;
        setMarketplacePublished(true);
        void loadMarketplaceState();
    }

    async function clearMarketplacePublished() {
        setBusyKey('facebook_marketplace');
        const result = await trackPortalIntegration(listingId, 'facebook', 'clear');
        setBusyKey(null);
        if (!result.ok) return;
        setMarketplacePublished(false);
        void loadMarketplaceState();
    }

    const connectHref = SIMPLE_PUBLISH_INTEGRATIONS_CONNECT_HREF;
    const marketplaceCreateUrl = getFacebookMarketplaceCreateUrl('autos');

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
            key: 'facebook_marketplace',
            label: 'Facebook Marketplace',
            icon: 'facebook',
            available: true,
            connected: true,
            connectHref,
            manual: true,
            published: marketplacePublished,
            busy: busyKey === 'facebook_marketplace',
            onCopyAssist: copyMarketplaceAssist,
            openHref: marketplaceCreateUrl,
            onMarkPublished: markMarketplacePublished,
            onClearPublished: clearMarketplacePublished,
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
    ], [
        brandName,
        busyKey,
        connectHref,
        detailMeta,
        fbConnected,
        igConnected,
        listingDescription,
        listingHref,
        listingLocation,
        listingPrice,
        listingTitle,
        marketplaceCreateUrl,
        marketplacePublished,
        publishedKeys,
        tiktokConnected,
        youtubeConnected,
    ]);

    return (
        <SimplePublishShareHub
            brandName={brandName}
            listingTitle={listingTitle}
            publishedHref={listingHref}
            shareText={shareText}
            integrations={integrations}
            loading={loading}
            hasVideo={listingHasVideo}
            publishAllAction={{
                onPublishAll: publishAllConnected,
                busy: busyKey === 'all',
                disabled: !canPublishAll || loading,
                disabledReason: !canPublishAll
                    ? 'Conecta al menos una red en Integraciones.'
                    : null,
            }}
        />
    );
}
