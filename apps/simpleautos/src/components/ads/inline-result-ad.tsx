'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
    AD_UPDATE_EVENT,
    fetchPublicAdCampaigns,
    getActiveCampaignsByFormat,
    getCampaignDestinationHref,
    type AdPlacementSection,
} from '@/lib/advertising';
import { getInlineAdPlaceholder } from '@/lib/ad-placeholders';

type InlineResultAdProps = {
    section: AdPlacementSection;
    className?: string;
};

type InlineCampaignView = {
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

export default function InlineResultAd({ section, className = '' }: InlineResultAdProps) {
    const [campaign, setCampaign] = useState<InlineCampaignView | null>(null);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const placeholder = getInlineAdPlaceholder(section);

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
                const campaigns = await fetchPublicAdCampaigns();
                const selected = getActiveCampaignsByFormat(campaigns, 'inline', section)[0];
                if (!selected) {
                    setCampaign(null);
                    return;
                }

                const href = getCampaignDestinationHref(selected);
                setCampaign({
                    id: selected.id,
                    href,
                    external: href.startsWith('http://') || href.startsWith('https://'),
                    title: selected.overlayTitle?.trim() || '',
                    subtitle: selected.overlaySubtitle?.trim() || '',
                    cta: selected.overlayCta?.trim() || '',
                    imageUrl: selected.desktopImageDataUrl,
                    mobileImageUrl: selected.mobileImageDataUrl ?? undefined,
                    overlayEnabled: selected.overlayEnabled,
                });
            })();
        };

        sync();
        window.addEventListener(AD_UPDATE_EVENT, sync as EventListener);
        return () => {
            window.removeEventListener(AD_UPDATE_EVENT, sync as EventListener);
        };
    }, [section]);

    const image = useMemo(() => {
        if (!campaign) return undefined;
        return isMobileViewport
            ? campaign.mobileImageUrl ?? campaign.imageUrl
            : campaign.imageUrl ?? campaign.mobileImageUrl;
    }, [campaign, isMobileViewport]);

    if (!campaign) {
        return (
            <article
                className={`relative overflow-hidden rounded-xl min-h-[96px] md:min-h-[110px] ${className}`.trim()}
                style={{
                    border: '1px solid var(--border)',
                    background: `linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0.3)), url(${placeholder.imageUrl}) center / cover no-repeat`,
                }}
            >
                <div className="flex h-full items-start p-4 md:p-5">
                    <span className="inline-flex rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/80">
                        {placeholder.label}
                    </span>
                </div>
            </article>
        );
    }

    const hasLink = campaign.href !== '#';

    return (
        <article
            className={`relative rounded-xl overflow-hidden min-h-[96px] md:min-h-[110px] ${className}`.trim()}
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
            <div className="relative z-2 p-4 md:p-5 h-full flex items-center justify-between gap-4">
                <div className="min-w-0">
                    {campaign.title ? <p className="text-sm md:text-base font-semibold text-white line-clamp-1">{campaign.title}</p> : null}
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
