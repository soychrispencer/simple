'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PublicListingCard } from '@simple/ui';
import type { ListingImage, ListingMode, ListingVariant } from '@simple/ui';
import { useAuth } from '@/context/auth-context';
import { isListingSaved, subscribeSavedListings, toggleSavedListing } from '@/lib/saved-listings';

type CardVariant = 'sale' | 'rent' | 'auction';

type CardEngagement = {
    views24h?: number;
    saves?: number;
};

export type VehicleListingCardData = {
    id: string;
    href: string;
    title: string;
    price: string;
    priceOriginal?: string;
    discountLabel?: string;
    priceLabel?: string;
    subtitle?: string;
    meta: string[];
    location: string;
    sellerName: string;
    sellerMeta?: string;
    sellerAvatarUrl?: string;
    sellerProfileHref?: string;
    badge: string;
    variant?: CardVariant;
    images?: string[];
    auctionBids?: number;
    auctionTime?: string;
    live?: boolean;
    listedSince?: string;
    engagement?: CardEngagement;
    ctaLabel?: string;
};

type Props = {
    data: VehicleListingCardData;
    mode: ListingMode;
};

function parseAmount(value: string | undefined): number {
    if (!value) return 0;
    const n = parseInt(value.replace(/[^\d]/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
}

function toImages(sources?: string[]): ListingImage[] {
    if (!sources || sources.length === 0) return [];
    return sources.map((src) => ({ src }));
}

export default function VehicleListingCard({ data, mode }: Props) {
    const router = useRouter();
    const { requireAuth } = useAuth();
    const [favorite, setFavorite] = useState(false);

    useEffect(() => {
        setFavorite(isListingSaved(data.id));
        return subscribeSavedListings(() => setFavorite(isListingSaved(data.id)));
    }, [data.id]);

    const variant: ListingVariant = data.variant ?? 'sale';
    const price = useMemo(() => {
        const amount = parseAmount(data.price);
        const original = data.priceOriginal ? parseAmount(data.priceOriginal) : undefined;
        const secondary = variant === 'auction' && data.auctionTime ? `Cierra en ${data.auctionTime}` : undefined;
        return {
            amount,
            original,
            discountLabel: data.discountLabel,
            secondary,
        };
    }, [data.price, data.priceOriginal, data.discountLabel, data.auctionTime, variant]);

    const handleSave = async () => {
        if (!requireAuth()) return { saved: favorite };
        const result = await toggleSavedListing({
            id: data.id,
            href: data.href,
            title: data.title,
            price: data.price,
            location: data.location,
            subtitle: data.subtitle,
            meta: data.meta,
            badge: data.badge,
            sellerName: data.sellerName,
            sellerMeta: data.sellerMeta,
        });
        if (!result.ok) return { saved: favorite };
        setFavorite(result.saved);
        return { saved: result.saved };
    };

    const handleShare = async () => {
        const url = typeof window === 'undefined' ? data.href : `${window.location.origin}${data.href}`;
        try {
            await navigator.clipboard.writeText(url);
        } catch {
            // ignore
        }
    };

    const badges = data.live ? [{ label: 'En vivo', tone: 'danger' as const }] : undefined;

    return (
        <PublicListingCard
            id={data.id}
            href={data.href}
            title={data.title}
            price={price}
            variant={variant}
            mode={mode}
            accent="autos"
            images={toImages(data.images)}
            location={data.location}
            metaTags={data.meta}
            seller={{
                name: data.sellerName,
                avatarUrl: data.sellerAvatarUrl,
                profileHref: data.sellerProfileHref,
                meta: data.sellerMeta,
            }}
            badges={badges}
            ctaLabel={data.ctaLabel}
            isSaved={favorite}
            onSave={handleSave}
            onShare={handleShare}
            onClick={() => router.push(data.href)}
        />
    );
}
