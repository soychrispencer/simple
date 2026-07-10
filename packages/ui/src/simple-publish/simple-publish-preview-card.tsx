'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { IconCamera } from '@tabler/icons-react';
import { fetchAccountPublicProfile, resolveAppMediaUrl } from '@simple/utils';
import MarketplaceReelListingCard from '../listing-card/marketplace-reel-listing-card';
import type { MarketplaceReelChip, MarketplaceReelSpec } from '../listing-card/marketplace-reel-listing-card';
import type { ListingAccent } from '../listing-card/types';
import { joinClasses } from '../shared/join-classes';

export type SimplePublishPreviewSpec = {
    icon: ReactNode;
    label: string;
};

export type SimplePublishPreviewCardProps = {
    badge: string;
    price: string;
    /** Precio lista tachado cuando hay oferta. */
    priceOriginal?: string;
    title: string;
    location: string;
    accent?: ListingAccent;
    /** Fotos en orden de publicación (portada = primera). */
    photoUrls?: string[];
    /** Clip subido; se muestra primero como en la tarjeta real. */
    videoUrl?: string | null;
    /** @deprecated Usa `photoUrls` */
    coverUrl?: string | null;
    /** @deprecated Usa `videoUrl` */
    coverVideoUrl?: string | null;
    /** @deprecated Se calcula desde `photoUrls` y `videoUrl` */
    photoCount?: number;
    specs?: SimplePublishPreviewSpec[];
    extraChips?: MarketplaceReelChip[];
    ctaLabel?: string;
    sellerName?: string;
    sellerAvatarUrl?: string;
    brandLabel?: string;
    footerHint?: string;
    className?: string;
};

export function SimplePublishPreviewCard({
    badge,
    price,
    priceOriginal,
    title,
    location,
    accent = 'autos',
    photoUrls,
    videoUrl,
    coverUrl,
    coverVideoUrl,
    specs = [],
    extraChips = [],
    ctaLabel = 'Ver detalle',
    sellerName = 'Tu negocio',
    sellerAvatarUrl,
    brandLabel = 'Simple',
    footerHint = 'Así se verá en el marketplace',
    className,
}: SimplePublishPreviewCardProps) {
    const [resolvedSellerName, setResolvedSellerName] = useState(sellerName);
    const [resolvedSellerAvatarUrl, setResolvedSellerAvatarUrl] = useState(sellerAvatarUrl);

    useEffect(() => {
        setResolvedSellerName(sellerName);
        setResolvedSellerAvatarUrl(sellerAvatarUrl);
    }, [sellerAvatarUrl, sellerName]);

    useEffect(() => {
        if (sellerAvatarUrl && sellerName !== 'Tu negocio') return;
        let cancelled = false;
        void fetchAccountPublicProfile(accent === 'propiedades' ? 'propiedades' : 'autos')
            .then((response) => {
                if (cancelled || !response?.ok || !response.profile) return;
                const profile = response.profile;
                if (!sellerAvatarUrl) {
                    const logo = resolveAppMediaUrl(profile.avatarImageUrl);
                    if (logo) setResolvedSellerAvatarUrl(logo);
                }
                if (sellerName === 'Tu negocio') {
                    const name = profile.displayName?.trim() || profile.companyName?.trim();
                    if (name) setResolvedSellerName(name);
                }
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [accent, sellerAvatarUrl, sellerName]);

    const resolvedPhotos = useMemo(
        () => (photoUrls ?? (coverUrl ? [coverUrl] : [])).map((url) => url.trim()).filter(Boolean),
        [coverUrl, photoUrls],
    );
    const resolvedVideo = (videoUrl ?? coverVideoUrl ?? '').trim() || null;

    const reelSpecs = useMemo<MarketplaceReelSpec[]>(
        () => specs.slice(0, 4).map((spec) => ({ icon: spec.icon, label: spec.label })),
        [specs],
    );

    const chips = useMemo<MarketplaceReelChip[]>(
        () => [{ label: badge }, ...extraChips],
        [badge, extraChips],
    );

    return (
        <div
            className={joinClasses(
                'overflow-hidden rounded-2xl border border-(--border) bg-(--surface) shadow-md',
                className,
            )}
        >
            <MarketplaceReelListingCard
                preview
                mode="grid"
                accent={accent}
                href="#preview"
                title={title}
                price={price}
                priceOriginal={priceOriginal}
                location={location}
                ctaLabel={ctaLabel}
                images={resolvedPhotos}
                videoUrl={resolvedVideo ?? undefined}
                specs={reelSpecs}
                chips={chips}
                sellerName={resolvedSellerName}
                sellerAvatarUrl={resolvedSellerAvatarUrl}
                onNavigate={() => undefined}
                shareText=""
                emptyMediaIcon={<IconCamera size={28} className="text-white/40" />}
                emptyMediaLabel="Agrega la portada"
                className="!max-w-none !rounded-none !border-0 !shadow-none"
            />

            <div className="flex items-center justify-between border-t border-(--border) px-3 py-2">
                <p className="text-[10px] text-(--fg-muted)">{footerHint}</p>
                <span className="rounded-full bg-(--accent) px-2 py-0.5 text-[10px] font-semibold text-(--accent-contrast)">
                    {brandLabel}
                </span>
            </div>
        </div>
    );
}
