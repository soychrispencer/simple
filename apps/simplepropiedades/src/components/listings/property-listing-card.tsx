'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PublicListingCard } from '@simple/ui';
import type { ListingImage, ListingMode, ListingVariant } from '@simple/ui';
import { useAuth } from '@/context/auth-context';
import { isListingSaved, subscribeSavedListings, toggleSavedListing } from '@/lib/saved-listings';

type CardVariant = 'sale' | 'rent' | 'project';

type CardEngagement = {
    views24h?: number;
    saves?: number;
};

export type PropertyListingCardData = {
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
    highlights?: string[];
    projectStatus?: string;
    delivery?: string;
    listedSince?: string;
    engagement?: CardEngagement;
    ctaLabel?: string;
};

type Props = {
    data: PropertyListingCardData;
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

export default function PropertyListingCard({ data, mode }: Props) {
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
        const secondary = data.delivery ? `Entrega ${data.delivery}` : undefined;
        return {
            amount,
            original,
            discountLabel: data.discountLabel,
            secondary,
        };
    }, [data.price, data.priceOriginal, data.discountLabel, data.delivery]);

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
            if (navigator.share) {
                await navigator.share({ title: data.title, url });
            } else {
                await navigator.clipboard.writeText(url);
            }
        } catch {
            // ignore cancel
        }
    };

    const detailItems = data.highlights && data.highlights.length > 0 ? data.highlights : data.meta;

    const badges = data.projectStatus
        ? [{ label: data.projectStatus, tone: 'info' as const }]
        : undefined;

    return (
        <PublicListingCard
            id={data.id}
            href={data.href}
            title={data.title}
            price={price}
            variant={variant}
            mode={mode}
            accent="propiedades"
            images={toImages(data.images)}
            location={data.location}
            metaTags={detailItems}
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
