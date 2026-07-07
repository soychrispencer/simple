'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
    createAdvertisingClient,
    getActiveCampaignsByFormat,
    getActiveHeroCampaignsForPlacement,
    getCampaignDestinationHref,
    type AdCampaign,
    type AdPlacementSection,
    type AdvertisingVertical,
} from '@simple/utils';

export type PublicAdBannerStripProps = {
    vertical: AdvertisingVertical;
    placementSection?: AdPlacementSection;
    variant?: 'banner' | 'strip';
    className?: string;
    sponsoredLabel?: string;
    /** Muestra un espacio reservado cuando no hay campaña activa. */
    showPlaceholderWhenEmpty?: boolean;
    placeholderLabel?: string;
    placeholderImageUrl?: string;
};

type BannerView = {
    id: string;
    href: string;
    external: boolean;
    title: string;
    subtitle: string;
    cta: string;
    imageUrl?: string;
    mobileImageUrl?: string;
    overlayEnabled: boolean;
};

function mapCampaign(campaign: AdCampaign): BannerView {
    const href = getCampaignDestinationHref(campaign);
    return {
        id: campaign.id,
        href,
        external: href.startsWith('http://') || href.startsWith('https://'),
        title: campaign.overlayTitle?.trim() ?? '',
        subtitle: campaign.overlaySubtitle?.trim() ?? '',
        cta: campaign.overlayCta?.trim() ?? '',
        imageUrl: campaign.desktopImageDataUrl,
        mobileImageUrl: campaign.mobileImageDataUrl ?? undefined,
        overlayEnabled: campaign.overlayEnabled,
    };
}

export function PublicAdBannerStrip({
    vertical,
    placementSection = 'home',
    variant = 'banner',
    className = '',
    sponsoredLabel = 'Patrocinado',
    showPlaceholderWhenEmpty = false,
    placeholderLabel = 'Espacio publicitario',
    placeholderImageUrl = '/hero/discover.svg',
}: PublicAdBannerStripProps) {
    const client = useMemo(() => createAdvertisingClient(vertical), [vertical]);
    const [campaign, setCampaign] = useState<BannerView | null>(null);
    const [isMobileViewport, setIsMobileViewport] = useState(false);

    useEffect(() => {
        const media = window.matchMedia('(max-width: 767px)');
        const apply = () => setIsMobileViewport(media.matches);
        apply();
        media.addEventListener('change', apply);
        return () => media.removeEventListener('change', apply);
    }, []);

    useEffect(() => {
        const sync = () => {
            void (async () => {
                const campaigns = await client.fetchPublicAdCampaigns();
                const selected = getActiveHeroCampaignsForPlacement(campaigns, placementSection)[0] ?? null;
                setCampaign(selected ? mapCampaign(selected) : null);
            })();
        };

        sync();
        window.addEventListener(client.AD_UPDATE_EVENT, sync as EventListener);
        return () => window.removeEventListener(client.AD_UPDATE_EVENT, sync as EventListener);
    }, [client, placementSection]);

    if (!campaign) {
        if (!showPlaceholderWhenEmpty) return null;

        const isStrip = variant === 'strip';
        return (
            <section className={`container-app ${className}`.trim()} aria-label="Espacio publicitario">
                <article
                    className={`relative overflow-hidden rounded-card border border-border ${isStrip ? 'min-h-[88px]' : 'min-h-[140px] sm:min-h-[180px]'}`}
                    style={{
                        background: `linear-gradient(to right, rgba(0,0,0,0.58), rgba(0,0,0,0.24)), url(${placeholderImageUrl}) center / cover no-repeat`,
                    }}
                >
                    <div className={`relative z-2 flex h-full ${isStrip ? 'items-center p-4' : 'flex-col justify-end p-5 sm:p-6'}`}>
                        <span className="inline-flex w-fit rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">
                            {placeholderLabel}
                        </span>
                    </div>
                </article>
            </section>
        );
    }

    const image = isMobileViewport
        ? campaign.mobileImageUrl ?? campaign.imageUrl
        : campaign.imageUrl ?? campaign.mobileImageUrl;
    const hasLink = campaign.href !== '#';
    const isStrip = variant === 'strip';

    return (
        <section className={`container-app ${className}`.trim()} aria-label="Anuncio patrocinado">
            <article
                className={`relative overflow-hidden rounded-card border border-border ${isStrip ? 'min-h-[88px]' : 'min-h-[140px] sm:min-h-[180px]'}`}
                style={{
                    background: image
                        ? `linear-gradient(to right, rgba(0,0,0,0.62), rgba(0,0,0,0.28)), url(${image}) center / cover no-repeat`
                        : 'var(--bg-subtle)',
                }}
            >
                {hasLink ? (
                    <Link
                        href={campaign.href}
                        target={campaign.external ? '_blank' : undefined}
                        rel={campaign.external ? 'noopener noreferrer' : undefined}
                        className="absolute inset-0 z-1"
                        aria-label="Ir al anuncio patrocinado"
                    />
                ) : null}
                <div className={`relative z-2 flex h-full ${isStrip ? 'items-center justify-between gap-4 p-4' : 'flex-col justify-end gap-2 p-5 sm:p-6'}`}>
                    <div className="min-w-0">
                        <span className="inline-flex rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/85">
                            {sponsoredLabel}
                        </span>
                        {campaign.overlayEnabled && campaign.title ? (
                            <p className={`mt-2 font-semibold text-white ${isStrip ? 'text-sm line-clamp-1' : 'text-lg sm:text-xl line-clamp-2'}`}>
                                {campaign.title}
                            </p>
                        ) : null}
                        {campaign.overlayEnabled && campaign.subtitle ? (
                            <p className={`text-white/82 ${isStrip ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'}`}>
                                {campaign.subtitle}
                            </p>
                        ) : null}
                    </div>
                    {campaign.overlayEnabled && campaign.cta ? (
                        <span className={`shrink-0 rounded-button border border-white/35 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white ${isStrip ? '' : 'self-start'}`}>
                            {campaign.cta}
                        </span>
                    ) : null}
                </div>
            </article>
        </section>
    );
}

export type PublicAdInlineCardProps = {
    vertical: AdvertisingVertical;
    placementSection: AdPlacementSection;
    className?: string;
    placeholderLabel?: string;
    placeholderImageUrl?: string;
};

export function PublicAdInlineCard({
    vertical,
    placementSection,
    className = '',
    placeholderLabel = 'Espacio publicitario',
    placeholderImageUrl = '/hero/discover.svg',
}: PublicAdInlineCardProps) {
    const client = useMemo(() => createAdvertisingClient(vertical), [vertical]);
    const [campaign, setCampaign] = useState<BannerView | null>(null);
    const [isMobileViewport, setIsMobileViewport] = useState(false);

    useEffect(() => {
        const media = window.matchMedia('(max-width: 767px)');
        const apply = () => setIsMobileViewport(media.matches);
        apply();
        media.addEventListener('change', apply);
        return () => media.removeEventListener('change', apply);
    }, []);

    useEffect(() => {
        const sync = () => {
            void (async () => {
                const campaigns = await client.fetchPublicAdCampaigns();
                const selected = getActiveCampaignsByFormat(campaigns, 'inline', placementSection)[0] ?? null;
                setCampaign(selected ? mapCampaign(selected) : null);
            })();
        };

        sync();
        window.addEventListener(client.AD_UPDATE_EVENT, sync as EventListener);
        return () => window.removeEventListener(client.AD_UPDATE_EVENT, sync as EventListener);
    }, [client, placementSection]);

    const image = campaign
        ? (isMobileViewport ? campaign.mobileImageUrl ?? campaign.imageUrl : campaign.imageUrl ?? campaign.mobileImageUrl)
        : undefined;

    if (!campaign) {
        return (
            <article
                className={`relative col-span-full overflow-hidden rounded-xl min-h-[96px] md:min-h-[110px] ${className}`.trim()}
                style={{
                    border: '1px solid var(--border)',
                    background: `linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0.3)), url(${placeholderImageUrl}) center / cover no-repeat`,
                }}
            >
                <div className="flex h-full items-start p-4 md:p-5">
                    <span className="inline-flex rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/80">
                        {placeholderLabel}
                    </span>
                </div>
            </article>
        );
    }

    const hasLink = campaign.href !== '#';

    return (
        <article
            className={`relative col-span-full overflow-hidden rounded-xl min-h-[96px] md:min-h-[110px] ${className}`.trim()}
            style={{
                border: '1px solid var(--border)',
                background: image
                    ? `linear-gradient(to right, rgba(0,0,0,0.55), rgba(0,0,0,0.28)), url(${image}) center / cover no-repeat`
                    : 'var(--bg-muted)',
            }}
        >
            {hasLink ? (
                <Link
                    href={campaign.href}
                    target={campaign.external ? '_blank' : undefined}
                    rel={campaign.external ? 'noopener noreferrer' : undefined}
                    className="absolute inset-0 z-1"
                    aria-label="Ir a la campaña"
                />
            ) : null}
            <div className="relative z-2 flex h-full items-center justify-between gap-4 p-4 md:p-5">
                <div className="min-w-0">
                    {campaign.title ? (
                        <p className="text-sm md:text-base font-semibold text-white line-clamp-1">{campaign.title}</p>
                    ) : null}
                    {campaign.overlayEnabled && campaign.subtitle ? (
                        <p className="text-xs md:text-sm text-white/80 line-clamp-1">{campaign.subtitle}</p>
                    ) : null}
                </div>
                {campaign.overlayEnabled && campaign.cta ? (
                    <span className="hidden md:inline-flex rounded-md border border-white/40 px-3 py-1.5 text-xs text-white/90">
                        {campaign.cta}
                    </span>
                ) : null}
            </div>
        </article>
    );
}

const CARD_ROW_PLACEHOLDERS: Partial<Record<AdvertisingVertical, string[]>> = {
    agenda: [
        '/hero/consultation-hero.webp',
        '/hero/mobile-agenda-professional.webp',
        'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=900&q=80',
    ],
    serenatas: [
        'https://images.unsplash.com/photo-1769230367366-13ed92feb145?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1764593821767-352919115758?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1769230367203-7bd409f483c9?auto=format&fit=crop&w=900&q=80',
    ],
    autos: ['/hero/discover.svg', '/hero/sell.svg', '/hero/auction.svg'],
    propiedades: ['/hero/home.svg', '/hero/rent.svg', '/hero/projects.svg'],
};

export type PublicAdCardRowProps = {
    vertical: AdvertisingVertical;
    slotCount?: number;
    className?: string;
    placeholderLabel?: string;
    placeholderImages?: string[];
};

export function PublicAdCardRow({
    vertical,
    slotCount = 3,
    className = '',
    placeholderLabel = 'Espacio publicitario',
    placeholderImages,
}: PublicAdCardRowProps) {
    const client = useMemo(() => createAdvertisingClient(vertical), [vertical]);
    const [campaigns, setCampaigns] = useState<BannerView[]>([]);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const placeholders = placeholderImages ?? CARD_ROW_PLACEHOLDERS[vertical] ?? CARD_ROW_PLACEHOLDERS.autos ?? [];

    useEffect(() => {
        const media = window.matchMedia('(max-width: 767px)');
        const apply = () => setIsMobileViewport(media.matches);
        apply();
        media.addEventListener('change', apply);
        return () => media.removeEventListener('change', apply);
    }, []);

    useEffect(() => {
        const sync = () => {
            void (async () => {
                const all = await client.fetchPublicAdCampaigns();
                const cards = getActiveCampaignsByFormat(all, 'card')
                    .slice(0, slotCount)
                    .map(mapCampaign);
                setCampaigns(cards);
            })();
        };

        sync();
        window.addEventListener(client.AD_UPDATE_EVENT, sync as EventListener);
        return () => window.removeEventListener(client.AD_UPDATE_EVENT, sync as EventListener);
    }, [client, slotCount]);

    const slots = useMemo(
        () => Array.from({ length: slotCount }, (_, index) => campaigns[index] ?? null),
        [campaigns, slotCount],
    );

    return (
        <section className={`container-app ${className}`.trim()} aria-label="Anuncios patrocinados">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {slots.map((ad, slotIndex) => {
                    if (!ad) {
                        const imageUrl = placeholders[slotIndex] ?? placeholders[0] ?? '/hero/discover.svg';
                        return (
                            <article
                                key={`ad-placeholder-${slotIndex}`}
                                className="relative min-h-40 overflow-hidden rounded-xl"
                                style={{
                                    border: '1px solid var(--border)',
                                    background: `linear-gradient(to right, rgba(0,0,0,0.58), rgba(0,0,0,0.24)), url(${imageUrl}) center / cover no-repeat`,
                                }}
                            >
                                <div className="relative z-2 flex h-full items-start p-4">
                                    <span className="inline-flex w-fit rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/80">
                                        {placeholderLabel}
                                    </span>
                                </div>
                            </article>
                        );
                    }

                    const image = isMobileViewport
                        ? ad.mobileImageUrl ?? ad.imageUrl
                        : ad.imageUrl ?? ad.mobileImageUrl;
                    const hasLink = ad.href !== '#';

                    return (
                        <article
                            key={ad.id}
                            className="relative min-h-40 overflow-hidden rounded-xl"
                            style={{
                                border: '1px solid var(--border)',
                                background: image
                                    ? `linear-gradient(to right, rgba(0,0,0,0.45), rgba(0,0,0,0.2)), url(${image}) center / cover no-repeat`
                                    : 'var(--bg-muted)',
                            }}
                        >
                            {hasLink ? (
                                <Link
                                    href={ad.href}
                                    target={ad.external ? '_blank' : undefined}
                                    rel={ad.external ? 'noopener noreferrer' : undefined}
                                    className="absolute inset-0 z-1"
                                    aria-label="Ir al anuncio"
                                />
                            ) : null}
                            <div className="relative z-2 flex h-full flex-col justify-end p-4">
                                {ad.overlayEnabled && ad.title ? (
                                    <p className="text-sm font-semibold text-white line-clamp-2">{ad.title}</p>
                                ) : null}
                                {ad.overlayEnabled && ad.subtitle ? (
                                    <p className="mt-1 text-xs text-white/80 line-clamp-2">{ad.subtitle}</p>
                                ) : null}
                                {ad.overlayEnabled && ad.cta ? (
                                    <span className="mt-2 inline-flex w-fit rounded-md border border-white/40 px-2.5 py-1 text-[11px] text-white/90">
                                        {ad.cta}
                                    </span>
                                ) : null}
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
