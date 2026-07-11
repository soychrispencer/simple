'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    SimplePublishShareHub,
    type SimplePublishShareIntegration,
} from '@simple/ui/simple-publish';
import {
    InstagramPublishPersonalizeModal,
    type InstagramPublishTemplateOption,
} from '@simple/ui/integrations';
import {
    SIMPLE_PUBLISH_INTEGRATIONS_CONNECT_HREF,
    buildMarketplaceListingCopy,
    buildMarketplacePublicUrl,
    getFacebookMarketplaceCreateUrl,
} from '@simple/utils';
import {
    DEFAULT_INSTAGRAM_PUBLISH_STYLE,
    fetchInstagramIntegrationStatus,
    generateSmartTemplates,
    parseInstagramPublishStyle,
    publishListingToInstagramEnhanced,
    saveInstagramPublishPreferences,
    type InstagramMediaFormat,
    type InstagramPublishStyleView,
    type InstagramTemplateView,
} from '@/lib/instagram';
import {
    fetchSocialHubStatus,
    publishListingToSocialHub,
    type SocialPublishTarget,
} from '@/lib/social-hub';
import {
    fetchPanelListingDetail,
    trackPortalIntegration,
    type PanelListing,
} from '@/lib/panel-listings';
import { getListingPhotoUrls, listingHasShareableVideo } from '@/lib/listing-media';

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

function buildDefaultCaption(listing: {
    title: string;
    price?: string | null;
    description?: string | null;
    location?: string | null;
    href: string;
}, brandName: string): string {
    const publicUrl = buildMarketplacePublicUrl(listing.href);
    const base = listing.description?.trim()
        || `${listing.title}\n${listing.price || 'Consultar precio'}\n${listing.location || ''}`.trim();
    return `${base}\n\n🔗 Ver más: ${publicUrl}\n\n#${brandName.replace(/\s+/g, '')}`;
}

function toTemplateOptions(templates: InstagramTemplateView[]): InstagramPublishTemplateOption[] {
    return templates.map((template) => ({
        ...template,
        id: template.id,
        name: template.name,
        score: template.score,
    }));
}

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
    const [listingItem, setListingItem] = useState<PanelListing | null>(null);
    const [igConnected, setIgConnected] = useState(false);
    const [fbConnected, setFbConnected] = useState(false);
    const [tiktokConnected, setTiktokConnected] = useState(false);
    const [youtubeConnected, setYoutubeConnected] = useState(false);
    const [publishedKeys, setPublishedKeys] = useState<Set<string>>(new Set());
    const [marketplacePublished, setMarketplacePublished] = useState(false);
    const [igPublishStyle, setIgPublishStyle] = useState<InstagramPublishStyleView>(DEFAULT_INSTAGRAM_PUBLISH_STYLE);
    const [igCaptionTemplate, setIgCaptionTemplate] = useState<string | null>(null);
    const [personalizeOpen, setPersonalizeOpen] = useState(false);
    const [personalizeSaving, setPersonalizeSaving] = useState(false);
    const [personalizeError, setPersonalizeError] = useState<string | null>(null);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [instagramTemplates, setInstagramTemplates] = useState<InstagramPublishTemplateOption[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [personalizeCaption, setPersonalizeCaption] = useState('');
    const [detailMeta, setDetailMeta] = useState({
        title: listingTitle,
        href: listingHref,
        price: listingPrice ?? '',
        description: listingDescription ?? '',
        location: listingLocation ?? '',
    });

    const listingImages = useMemo(
        () => (listingItem ? getListingPhotoUrls(listingItem) : []),
        [listingItem],
    );

    const loadMarketplaceState = useCallback(async () => {
        const result = await fetchPanelListingDetail(listingId);
        if (!result.ok || !result.item) return;
        setListingItem(result.item);
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
                setIgPublishStyle(parseInstagramPublishStyle(instagram?.account?.publishStyle));
                setIgCaptionTemplate(instagram?.account?.captionTemplate ?? null);

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
            useAI: igPublishStyle.useAI,
            useTemplates: true,
            tone: igPublishStyle.tone,
            targetAudience: igPublishStyle.targetAudience,
            templateId: igPublishStyle.templateId,
            layoutVariant: igPublishStyle.layoutVariant,
            mediaFormat: format,
        });
        setBusyKey(null);
        if (result.ok && (result.publication || result.result)) {
            setPublishedKeys((current) => new Set([...current, key]));
        }
    }

    async function openInstagramPersonalize() {
        setPersonalizeError(null);
        setPersonalizeOpen(true);
        setPersonalizeCaption(
            igCaptionTemplate
            || buildDefaultCaption({
                title: detailMeta.title || listingTitle,
                price: detailMeta.price || listingPrice,
                description: detailMeta.description || listingDescription,
                location: detailMeta.location || listingLocation,
                href: detailMeta.href || listingHref,
            }, brandName),
        );
        setSelectedTemplateId(igPublishStyle.templateId);
        setTemplatesLoading(true);
        const result = await generateSmartTemplates(listingId);
        if (!result.ok || !result.recommendedTemplate) {
            setInstagramTemplates([]);
            setTemplatesLoading(false);
            return;
        }
        const order = ['essential-watermark', 'professional-centered', 'signature-complete'];
        const all = [result.recommendedTemplate, ...(result.alternatives ?? [])]
            .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
        setInstagramTemplates(toTemplateOptions(all));
        setSelectedTemplateId(igPublishStyle.templateId || result.recommendedTemplate.id);
        setTemplatesLoading(false);
    }

    async function saveInstagramPersonalize() {
        const templateId = (selectedTemplateId
            ?? instagramTemplates[0]?.id
            ?? null) as InstagramPublishStyleView['templateId'] | null;
        if (!templateId) {
            setPersonalizeError('Elige un diseño antes de guardar.');
            return;
        }
        const selected = instagramTemplates.find((template) => template.id === templateId);
        setPersonalizeSaving(true);
        setPersonalizeError(null);
        const result = await saveInstagramPublishPreferences({
            templateId,
            layoutVariant: (selected?.layoutVariant as InstagramPublishStyleView['layoutVariant'])
                ?? igPublishStyle.layoutVariant,
            tone: igPublishStyle.tone,
            targetAudience: igPublishStyle.targetAudience,
            useAI: igPublishStyle.useAI,
            captionTemplate: personalizeCaption.trim() || null,
        });
        setPersonalizeSaving(false);
        if (!result.ok) {
            setPersonalizeError(result.error ?? 'No pudimos guardar el estilo.');
            return;
        }
        const parsed = parseInstagramPublishStyle(result.account?.publishStyle);
        setIgPublishStyle({
            ...parsed,
            templateId,
            layoutVariant: selected?.layoutVariant === 'square' ? 'square' : (parsed.layoutVariant ?? 'portrait'),
        });
        setIgCaptionTemplate(result.account?.captionTemplate ?? (personalizeCaption.trim() || null));
        setSelectedTemplateId(templateId);
        setPersonalizeOpen(false);
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
        try {
            await navigator.clipboard.writeText(copy);
        } catch {
            // El hub ya abrió Marketplace; el pegado manual sigue siendo posible.
        }
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
            supportsPersonalize: true,
            onPersonalize: () => void openInstagramPersonalize(),
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
            supportsPersonalize: true,
            onPersonalize: () => void openInstagramPersonalize(),
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
        <>
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
            <InstagramPublishPersonalizeModal
                open={personalizeOpen}
                onClose={() => setPersonalizeOpen(false)}
                brandLabel={brandName}
                images={listingImages}
                templates={instagramTemplates}
                templatesLoading={templatesLoading}
                selectedTemplateId={selectedTemplateId}
                onSelectTemplate={setSelectedTemplateId}
                caption={personalizeCaption}
                onCaptionChange={setPersonalizeCaption}
                saving={personalizeSaving}
                onSave={saveInstagramPersonalize}
                error={personalizeError}
            />
        </>
    );
}
