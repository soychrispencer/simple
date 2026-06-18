'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    IconBrandFacebook,
    IconBrandInstagram,
    IconBrandTiktok,
    IconBrandWhatsapp,
    IconBrandYoutube,
    IconCheck,
    IconExternalLink,
    IconPhoto,
    IconShare3,
    IconSparkles,
    IconVideo,
} from '@tabler/icons-react';
import {
    fetchInstagramIntegrationStatus,
    publishListingToInstagramEnhanced,
    type InstagramIntegrationStatus,
    type InstagramMediaFormat,
    type InstagramPublicationView,
} from '@/lib/instagram';
import {
    fetchSocialHubStatus,
    publishListingToSocialHub,
    type SocialHubPublishResult,
    type SocialHubStatus,
    type SocialPublishTarget,
} from '@/lib/social-hub';
import { fetchPanelListingDetail } from '@/lib/panel-listings';
import { FacebookMarketplaceAssist } from '@/components/panel/facebook-marketplace-assist';
import { GenerateListingReelCard } from '@/components/panel/generate-listing-reel-card';

type ShareResult = {
    key: string;
    ok: boolean;
    message: string;
    permalink?: string | null;
};

type Props = {
    listingId: string;
    listingTitle: string;
    listingHref: string;
    hasVideo?: boolean;
    shareText?: string;
    compact?: boolean;
    onVideoGenerated?: (videoUrl: string) => void;
};

function publicationLabel(contentType?: InstagramPublicationView['contentType']): string {
    if (contentType === 'reel') return 'Reel';
    if (contentType === 'carousel') return 'Carrusel';
    if (contentType === 'image') return 'Foto';
    return 'Instagram';
}

function targetLabel(target: SocialPublishTarget): string {
    if (target === 'instagram_carousel') return 'Instagram · Fotos';
    if (target === 'instagram_reel') return 'Instagram · Reel';
    if (target === 'facebook') return 'Facebook · Página';
    if (target === 'tiktok') return 'TikTok';
    if (target === 'youtube') return 'YouTube';
    return target;
}

type AutoChannelKey = 'instagram_carousel' | 'instagram_reel' | 'facebook_page' | 'tiktok' | 'youtube';

export function ShareToSocialPanel({
    listingId,
    listingTitle,
    listingHref,
    hasVideo = false,
    shareText,
    compact = false,
    onVideoGenerated,
}: Props) {
    const resolvedShareText = shareText
        ?? `¡Mira este ${listingTitle} que estoy vendiendo! ${typeof window !== 'undefined' ? window.location.origin : ''}${listingHref}`;

    const [igStatus, setIgStatus] = useState<InstagramIntegrationStatus | null>(null);
    const [hubStatus, setHubStatus] = useState<SocialHubStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [busyTarget, setBusyTarget] = useState<SocialPublishTarget | 'all' | null>(null);
    const [results, setResults] = useState<ShareResult[]>([]);
    const [copied, setCopied] = useState(false);
    const [listingPrice, setListingPrice] = useState<string | null>(null);
    const [listingDescription, setListingDescription] = useState<string | null>(null);
    const [listingLocation, setListingLocation] = useState<string | null>(null);
    const [marketplacePublished, setMarketplacePublished] = useState(false);
    const [listingHasVideo, setListingHasVideo] = useState(hasVideo);
    const [autoChannels, setAutoChannels] = useState<Record<AutoChannelKey, boolean>>({
        instagram_carousel: true,
        instagram_reel: false,
        facebook_page: true,
        tiktok: false,
        youtube: false,
    });

    useEffect(() => {
        Promise.all([
            fetchInstagramIntegrationStatus(),
            fetchSocialHubStatus('autos'),
            fetchPanelListingDetail(listingId),
        ])
            .then(([instagram, hub, listing]) => {
                setIgStatus(instagram);
                setHubStatus(hub);
                if (listing.item) {
                    setListingPrice(listing.item.price ?? null);
                    setListingDescription(listing.item.description ?? null);
                    setListingLocation(listing.item.location ?? null);
                    const marketplace = listing.item.integrations.find((item) => item.portal === 'facebook');
                    setMarketplacePublished(marketplace?.status === 'published');
                }
            })
            .catch(() => {
                setIgStatus(null);
                setHubStatus(null);
            })
            .finally(() => setLoading(false));
    }, [listingId]);

    useEffect(() => {
        setListingHasVideo(hasVideo);
    }, [hasVideo]);

    useEffect(() => {
        setAutoChannels((current) => ({
            ...current,
            instagram_reel: listingHasVideo ? current.instagram_reel : false,
            tiktok: listingHasVideo ? current.tiktok : false,
            youtube: listingHasVideo ? current.youtube : false,
        }));
    }, [listingHasVideo]);

    const publicationsByFormat = useMemo(() => {
        const map = new Map<InstagramMediaFormat, InstagramPublicationView>();
        for (const item of igStatus?.recentPublications ?? []) {
            if (item.listingId !== listingId) continue;
            const format: InstagramMediaFormat = item.contentType === 'reel' ? 'reel' : 'carousel';
            if (!map.has(format)) map.set(format, item);
        }
        return map;
    }, [igStatus?.recentPublications, listingId]);

    const facebookPublication = useMemo(
        () => hubStatus?.recentPublications.find((item) => item.listingId === listingId && item.platform === 'facebook'),
        [hubStatus?.recentPublications, listingId],
    );

    const tiktokPublication = useMemo(
        () => hubStatus?.recentPublications.find((item) => item.listingId === listingId && item.platform === 'tiktok'),
        [hubStatus?.recentPublications, listingId],
    );

    const youtubePublication = useMemo(
        () => hubStatus?.recentPublications.find((item) => item.listingId === listingId && item.platform === 'youtube'),
        [hubStatus?.recentPublications, listingId],
    );

    const eligible = hubStatus?.eligible ?? (igStatus?.eligible ?? false);
    const igConnected = Boolean(
        (hubStatus?.platforms.instagram.connected ?? false)
        || (igStatus?.account?.status === 'connected'),
    );
    const fbConnected = Boolean(hubStatus?.platforms.facebook.connected);
    const fbNeedsReconnect = Boolean(hubStatus?.platforms.facebook.needsReconnect);
    const tiktokConnected = Boolean(hubStatus?.platforms.tiktok.connected);
    const youtubeConnected = Boolean(hubStatus?.platforms.youtube.connected);
    const tiktokAvailable = Boolean(hubStatus?.platforms.tiktok.available ?? hubStatus?.platforms.tiktok.configured);
    const youtubeAvailable = Boolean(hubStatus?.platforms.youtube.available ?? hubStatus?.platforms.youtube.configured);

    const selectedAutoTargets = useMemo(() => {
        const targets: SocialPublishTarget[] = [];
        if (autoChannels.instagram_carousel) targets.push('instagram_carousel');
        if (autoChannels.instagram_reel && listingHasVideo) targets.push('instagram_reel');
        if (autoChannels.facebook_page) targets.push('facebook');
        if (autoChannels.tiktok && listingHasVideo) targets.push('tiktok');
        if (autoChannels.youtube && listingHasVideo) targets.push('youtube');
        return targets;
    }, [autoChannels, listingHasVideo]);

    const needsInstagram = autoChannels.instagram_carousel || (autoChannels.instagram_reel && listingHasVideo);
    const needsFacebookPage = autoChannels.facebook_page;
    const needsTikTok = autoChannels.tiktok && listingHasVideo;
    const needsYouTube = autoChannels.youtube && listingHasVideo;
    const canPublishSelected = eligible
        && selectedAutoTargets.length > 0
        && (!needsInstagram || igConnected)
        && (!needsFacebookPage || (fbConnected && !fbNeedsReconnect))
        && (!needsTikTok || tiktokConnected)
        && (!needsYouTube || youtubeConnected);

    function mergeResults(incoming: ShareResult[]) {
        setResults((current) => {
            const map = new Map(current.map((item) => [item.key, item]));
            for (const item of incoming) map.set(item.key, item);
            return Array.from(map.values());
        });
    }

    function mapHubResults(items: SocialHubPublishResult[]): ShareResult[] {
        return items.map((item) => ({
            key: item.target,
            ok: item.ok,
            message: item.ok ? item.message : `${targetLabel(item.target)}: ${item.message}`,
            permalink: item.permalink ?? null,
        }));
    }

    async function publishToInstagram(format: InstagramMediaFormat) {
        setBusyTarget(format === 'reel' ? 'instagram_reel' : 'instagram_carousel');
        const result = await publishListingToInstagramEnhanced(listingId, {
            useAI: true,
            tone: 'professional',
            targetAudience: 'general',
            mediaFormat: format,
        });
        setBusyTarget(null);

        const publication = result.publication ?? null;
        const ok = result.ok && Boolean(publication);
        const label = format === 'reel' ? 'Reel' : 'Carrusel de fotos';
        mergeResults([{
            key: format === 'reel' ? 'instagram_reel' : 'instagram_carousel',
            ok,
            message: ok
                ? `¡${label} publicado en Instagram!`
                : (result.error ?? `No se pudo publicar el ${label.toLowerCase()} en Instagram.`),
            permalink: publication?.instagramPermalink ?? null,
        }]);
    }

    async function publishToFacebook() {
        setBusyTarget('facebook');
        const response = await publishListingToSocialHub(listingId, { targets: ['facebook'] });
        setBusyTarget(null);
        mergeResults(mapHubResults(response.results));
    }

    async function publishToTikTok() {
        setBusyTarget('tiktok');
        const response = await publishListingToSocialHub(listingId, { targets: ['tiktok'] });
        setBusyTarget(null);
        mergeResults(mapHubResults(response.results));
    }

    async function publishToYouTube() {
        setBusyTarget('youtube');
        const response = await publishListingToSocialHub(listingId, { targets: ['youtube'] });
        setBusyTarget(null);
        mergeResults(mapHubResults(response.results));
    }

    async function publishSelectedChannels() {
        if (selectedAutoTargets.length === 0) {
            mergeResults([{
                key: 'selection',
                ok: false,
                message: 'Selecciona al menos un destino automático.',
            }]);
            return;
        }

        setBusyTarget('all');
        const response = await publishListingToSocialHub(listingId, { targets: selectedAutoTargets });
        setBusyTarget(null);
        mergeResults(mapHubResults(response.results));
    }

    function toggleAutoChannel(key: AutoChannelKey) {
        setAutoChannels((current) => ({ ...current, [key]: !current[key] }));
    }

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(resolvedShareText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // ignore
        }
    }

    return (
        <div className={compact ? 'w-full' : 'w-full max-w-md mx-auto'}>
            <div className="mb-3 text-left">
                <p className="text-sm font-semibold text-[var(--fg)]">Compartir en redes</p>
                <p className="text-xs text-[var(--fg-muted)]">
                    Elige dónde publicar automáticamente. Marketplace es manual y queda registrado solo cuando tú lo confirmas.
                </p>
            </div>

            <div className="mb-4 rounded-2xl border border-[var(--border)] p-3 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)] mb-2">
                    Publicación automática
                </p>
                <div className="space-y-2">
                    <ChannelToggle
                        label="Instagram · Fotos"
                        checked={autoChannels.instagram_carousel}
                        disabled={!eligible || !igConnected}
                        onChange={() => toggleAutoChannel('instagram_carousel')}
                    />
                    <ChannelToggle
                        label="Instagram · Reel"
                        checked={autoChannels.instagram_reel}
                        disabled={!eligible || !igConnected || !listingHasVideo}
                        hint={!listingHasVideo ? 'Requiere video en el aviso' : undefined}
                        onChange={() => toggleAutoChannel('instagram_reel')}
                    />
                    <ChannelToggle
                        label="Facebook · Página"
                        checked={autoChannels.facebook_page}
                        disabled={!eligible || !fbConnected || fbNeedsReconnect}
                        hint={fbNeedsReconnect ? 'Reconecta Meta' : undefined}
                        onChange={() => toggleAutoChannel('facebook_page')}
                    />
                    <ChannelToggle
                        label="TikTok"
                        checked={autoChannels.tiktok}
                        disabled={!eligible || !tiktokConnected || !listingHasVideo || !tiktokAvailable}
                        hint={!listingHasVideo ? 'Requiere video en el aviso' : !tiktokConnected ? 'Conecta TikTok' : undefined}
                        onChange={() => toggleAutoChannel('tiktok')}
                    />
                    <ChannelToggle
                        label="YouTube Shorts"
                        checked={autoChannels.youtube}
                        disabled={!eligible || !youtubeConnected || !listingHasVideo || !youtubeAvailable}
                        hint={!listingHasVideo ? 'Requiere video en el aviso' : !youtubeConnected ? 'Conecta YouTube' : undefined}
                        onChange={() => toggleAutoChannel('youtube')}
                    />
                </div>
            </div>

            <div className={`grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
                <a
                    href={listingHref}
                    className="sm:col-span-2 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[var(--accent)] text-white font-semibold hover:bg-[var(--accent)]/90 transition-all"
                >
                    Ver publicación
                    <IconExternalLink size={18} />
                </a>

                <button
                    type="button"
                    disabled={!canPublishSelected || busyTarget !== null}
                    onClick={() => void publishSelectedChannels()}
                    className="sm:col-span-2 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-[var(--accent)] text-[var(--accent)] font-semibold hover:bg-[var(--accent)]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <IconSparkles size={18} />
                    {busyTarget === 'all' ? 'Publicando selección...' : `Publicar en selección (${selectedAutoTargets.length})`}
                </button>

                {!canPublishSelected && eligible && selectedAutoTargets.length > 0 ? (
                    <p className="sm:col-span-2 text-xs text-[var(--fg-muted)] text-center">
                        Conecta las cuentas necesarias para los destinos marcados.
                    </p>
                ) : null}

                <a
                    href={`https://wa.me/?text=${encodeURIComponent(resolvedShareText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366] text-white font-medium hover:bg-[#128C7E] transition-colors"
                >
                    <IconBrandWhatsapp size={20} />
                    WhatsApp
                </a>

                <button
                    type="button"
                    onClick={() => void handleCopy()}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-medium transition-all ${
                        copied
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-[var(--border)] hover:bg-[var(--bg-subtle)]'
                    }`}
                >
                    {copied ? <IconCheck size={18} /> : <IconShare3 size={18} />}
                    {copied ? '¡Copiado!' : 'Copiar link'}
                </button>

                <InstagramFormatButton
                    label="Instagram · Fotos"
                    hint="Carrusel con portada"
                    icon={<IconPhoto size={18} />}
                    loading={loading}
                    eligible={eligible}
                    connected={igConnected}
                    publishing={busyTarget === 'instagram_carousel'}
                    publication={publicationsByFormat.get('carousel')}
                    connectHref="/panel/mi-cuenta/integraciones"
                    onPublish={() => void publishToInstagram('carousel')}
                />

                <InstagramFormatButton
                    label="Instagram · Reel"
                    hint={listingHasVideo ? 'Video del aviso' : 'Sube o genera un video'}
                    icon={<IconVideo size={18} />}
                    loading={loading}
                    eligible={eligible}
                    connected={igConnected}
                    publishing={busyTarget === 'instagram_reel'}
                    publication={publicationsByFormat.get('reel')}
                    connectHref="/panel/mi-cuenta/integraciones"
                    disabled={!listingHasVideo}
                    onPublish={() => void publishToInstagram('reel')}
                />

                <SocialNetworkButton
                    label="Facebook · Página"
                    hint={
                        fbNeedsReconnect
                            ? 'Vuelve a conectar Meta'
                            : fbConnected
                                ? (hubStatus?.platforms.facebook.pageName ?? 'Tu página')
                                : 'Conecta Meta primero'
                    }
                    icon={<IconBrandFacebook size={18} className="text-[#1877F2]" />}
                    loading={loading}
                    eligible={eligible}
                    connected={fbConnected}
                    needsReconnect={fbNeedsReconnect}
                    publishing={busyTarget === 'facebook'}
                    published={facebookPublication?.status === 'published'}
                    connectHref="/panel/mi-cuenta/integraciones"
                    onPublish={() => void publishToFacebook()}
                />

                <SocialNetworkButton
                    label="TikTok"
                    hint={
                        !listingHasVideo
                            ? 'Sube o genera un video'
                            : tiktokConnected
                                ? (hubStatus?.platforms.tiktok.username ? `@${hubStatus.platforms.tiktok.username}` : 'Tu cuenta')
                                : 'Conecta TikTok primero'
                    }
                    icon={<IconBrandTiktok size={18} />}
                    loading={loading}
                    eligible={eligible}
                    connected={tiktokConnected}
                    publishing={busyTarget === 'tiktok'}
                    published={tiktokPublication?.status === 'published'}
                    connectHref="/panel/mi-cuenta/integraciones"
                    disabled={!listingHasVideo || !tiktokAvailable}
                    onPublish={() => void publishToTikTok()}
                />

                <SocialNetworkButton
                    label="YouTube Shorts"
                    hint={
                        !listingHasVideo
                            ? 'Sube o genera un video'
                            : youtubeConnected
                                ? (hubStatus?.platforms.youtube.channelTitle ?? 'Tu canal')
                                : 'Conecta YouTube primero'
                    }
                    icon={<IconBrandYoutube size={18} className="text-[#FF0000]" />}
                    loading={loading}
                    eligible={eligible}
                    connected={youtubeConnected}
                    publishing={busyTarget === 'youtube'}
                    published={youtubePublication?.status === 'published'}
                    connectHref="/panel/mi-cuenta/integraciones"
                    disabled={!listingHasVideo || !youtubeAvailable}
                    onPublish={() => void publishToYouTube()}
                />

                <GenerateListingReelCard
                    listingId={listingId}
                    hasVideo={listingHasVideo}
                    onGenerated={(videoUrl) => {
                        setListingHasVideo(true);
                        setAutoChannels((current) => ({
                            ...current,
                            instagram_reel: true,
                            tiktok: current.tiktok,
                            youtube: current.youtube,
                        }));
                        onVideoGenerated?.(videoUrl);
                    }}
                />

                <FacebookMarketplaceAssist
                    listingId={listingId}
                    listingTitle={listingTitle}
                    listingHref={listingHref}
                    listingPrice={listingPrice}
                    listingDescription={listingDescription}
                    listingLocation={listingLocation}
                    initialPublished={marketplacePublished}
                    onMarkedPublished={() => setMarketplacePublished(true)}
                />
            </div>

            {results.length > 0 ? (
                <div className="mt-4 space-y-2 text-left">
                    {results.map((item) => (
                        <div
                            key={item.key}
                            className={`rounded-xl border px-3 py-2 text-sm ${
                                item.ok
                                    ? 'border-green-200 bg-green-50 text-green-800'
                                    : 'border-red-200 bg-red-50 text-red-800'
                            }`}
                        >
                            <p>{item.message}</p>
                            {item.ok && item.permalink ? (
                                <a
                                    href={item.permalink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium underline"
                                >
                                    Ver publicación
                                    <IconExternalLink size={12} />
                                </a>
                            ) : null}
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function ChannelToggle({
    label,
    checked,
    disabled = false,
    hint,
    onChange,
}: {
    label: string;
    checked: boolean;
    disabled?: boolean;
    hint?: string;
    onChange: () => void;
}) {
    return (
        <label className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${disabled ? 'opacity-50' : 'cursor-pointer hover:bg-[var(--bg-subtle)]'}`}>
            <span className="flex flex-col">
                <span className="font-medium text-[var(--fg)]">{label}</span>
                {hint ? <span className="text-[10px] text-[var(--fg-muted)]">{hint}</span> : null}
            </span>
            <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--accent)]"
                checked={checked}
                disabled={disabled}
                onChange={onChange}
            />
        </label>
    );
}

function InstagramFormatButton({
    label,
    hint,
    icon,
    loading,
    eligible,
    connected,
    publishing,
    publication,
    connectHref,
    disabled = false,
    onPublish,
}: {
    label: string;
    hint: string;
    icon: ReactNode;
    loading: boolean;
    eligible: boolean;
    connected: boolean;
    publishing: boolean;
    publication?: InstagramPublicationView;
    connectHref: string;
    disabled?: boolean;
    onPublish: () => void;
}) {
    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--bg-subtle)] text-[var(--fg-muted)] animate-pulse">
                <div className="w-5 h-5 rounded-full bg-[var(--fg-muted)]/20" />
                Cargando...
            </div>
        );
    }

    if (!eligible) {
        return (
            <Link
                href="/panel/mi-cuenta/suscripcion"
                className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl border-2 border-dashed border-[var(--border)] text-center hover:bg-[var(--bg-subtle)] transition-colors"
            >
                <span className="flex items-center gap-2 text-sm font-medium text-[var(--fg-muted)]">
                    <IconBrandInstagram size={18} />
                    {label}
                </span>
                <span className="text-[10px] text-[var(--fg-muted)]">Plan Pro</span>
            </Link>
        );
    }

    if (!connected) {
        return (
            <Link
                href={connectHref}
                className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl border-2 border-[var(--border)] text-center hover:bg-[var(--bg-subtle)] transition-colors"
            >
                <span className="flex items-center gap-2 text-sm font-medium">
                    <IconBrandInstagram size={18} className="text-[#E4405F]" />
                    Conectar IG
                </span>
                <span className="text-[10px] text-[var(--fg-muted)]">{label}</span>
            </Link>
        );
    }

    const status = publication?.status;
    const statusClass = status === 'published'
        ? 'border-green-200 bg-green-50/60'
        : status === 'failed'
            ? 'border-red-200 bg-red-50/60'
            : 'border-[var(--border)]';

    return (
        <button
            type="button"
            disabled={disabled || publishing}
            onClick={onPublish}
            className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border-2 text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--bg-subtle)] ${statusClass}`}
        >
            <span className="flex items-center gap-2 text-sm font-medium">
                <IconBrandInstagram size={18} className="text-[#E4405F]" />
                {publishing ? 'Publicando...' : label}
            </span>
            <span className="text-[10px] text-[var(--fg-muted)]">
                {disabled ? hint : status === 'published' ? `Publicado · ${publicationLabel(publication?.contentType)}` : hint}
            </span>
        </button>
    );
}

function SocialNetworkButton({
    label,
    hint,
    icon,
    loading,
    eligible,
    connected,
    needsReconnect = false,
    publishing = false,
    published = false,
    connectHref = '/panel/mi-cuenta/integraciones',
    disabled = false,
    comingSoon = false,
    onPublish,
}: {
    label: string;
    hint: string;
    icon: ReactNode;
    loading: boolean;
    eligible: boolean;
    connected: boolean;
    needsReconnect?: boolean;
    publishing?: boolean;
    published?: boolean;
    connectHref?: string;
    disabled?: boolean;
    comingSoon?: boolean;
    onPublish?: () => void;
}) {
    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--bg-subtle)] text-[var(--fg-muted)] animate-pulse">
                <div className="w-5 h-5 rounded-full bg-[var(--fg-muted)]/20" />
                Cargando...
            </div>
        );
    }

    if (comingSoon || disabled) {
        return (
            <div className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl border-2 border-dashed border-[var(--border)] text-center opacity-60">
                <span className="flex items-center gap-2 text-sm font-medium text-[var(--fg-muted)]">{icon}{label}</span>
                <span className="text-[10px] text-[var(--fg-muted)]">{hint}</span>
            </div>
        );
    }

    if (!eligible) {
        return (
            <Link
                href="/panel/mi-cuenta/suscripcion"
                className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl border-2 border-dashed border-[var(--border)] text-center hover:bg-[var(--bg-subtle)] transition-colors"
            >
                <span className="flex items-center gap-2 text-sm font-medium text-[var(--fg-muted)]">{icon}{label}</span>
                <span className="text-[10px] text-[var(--fg-muted)]">Plan Pro</span>
            </Link>
        );
    }

    if (!connected || needsReconnect) {
        return (
            <Link
                href={connectHref}
                className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl border-2 border-[var(--border)] text-center hover:bg-[var(--bg-subtle)] transition-colors"
            >
                <span className="flex items-center gap-2 text-sm font-medium">{icon}{needsReconnect ? 'Reconectar Meta' : 'Conectar'}</span>
                <span className="text-[10px] text-[var(--fg-muted)]">{hint}</span>
            </Link>
        );
    }

    const statusClass = published ? 'border-green-200 bg-green-50/60' : 'border-[var(--border)]';

    return (
        <button
            type="button"
            disabled={publishing}
            onClick={onPublish}
            className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border-2 text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--bg-subtle)] ${statusClass}`}
        >
            <span className="flex items-center gap-2 text-sm font-medium">
                {icon}
                {publishing ? 'Publicando...' : label}
            </span>
            <span className="text-[10px] text-[var(--fg-muted)]">
                {published ? 'Publicado en tu página' : hint}
            </span>
        </button>
    );
}
