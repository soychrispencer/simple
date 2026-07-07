import type { ListingAccent, ListingBadge, ListingMode, ListingVariant, PublicListingCardProps } from '../types';

export type MarketplaceCardLike = {
    id: string;
    href: string;
    title: string;
    price: string;
    priceOriginal?: string;
    discountLabel?: string;
    priceLabel?: string;
    variant?: ListingVariant;
    meta: string[];
    location: string;
    sellerName: string;
    sellerMeta?: string;
    sellerAvatarUrl?: string;
    sellerProfileHref?: string;
    images?: string[];
    ctaLabel?: string;
    isSponsored?: boolean;
    discountPercent?: number;
    financing?: boolean;
    exchange?: boolean;
    negotiable?: boolean;
    live?: boolean;
    projectStatus?: string;
};

export function parseListingPriceAmount(price: string): number {
    const numeric = price.replace(/[^0-9]/g, '');
    return parseInt(numeric, 10) || 0;
}

function buildExtraBadges(data: MarketplaceCardLike): ListingBadge[] {
    const badges: ListingBadge[] = [];
    if (data.projectStatus) badges.push({ label: data.projectStatus, tone: 'info' });
    if (data.discountPercent && data.discountPercent > 0) {
        badges.push({ label: `-${data.discountPercent}%`, tone: 'warning' });
    }
    if (data.financing) badges.push({ label: 'Financiamiento', tone: 'neutral' });
    if (data.exchange) badges.push({ label: 'Permuta', tone: 'neutral' });
    else if (data.negotiable) badges.push({ label: 'Conversable', tone: 'neutral' });
    if (data.isSponsored) badges.push({ label: 'Patrocinado', tone: 'info' });
    if (data.live) badges.push({ label: 'En vivo', tone: 'danger' });
    return badges;
}

export function mapMarketplaceCardToPublicProps(
    data: MarketplaceCardLike,
    mode: ListingMode,
    accent: ListingAccent,
): Omit<PublicListingCardProps, 'isSaved' | 'onSave' | 'onShare' | 'onClick'> {
    return {
        id: data.id,
        href: data.href,
        title: data.title,
        price: {
            amount: parseListingPriceAmount(data.price),
            original: data.priceOriginal ? parseListingPriceAmount(data.priceOriginal) : undefined,
            discountLabel: data.discountLabel,
            caption: data.priceLabel,
        },
        variant: data.variant ?? 'sale',
        mode,
        accent,
        images: (data.images ?? []).map((src, index) => ({
            src,
            alt: `${data.title} imagen ${index + 1}`,
        })),
        location: data.location,
        metaTags: data.meta,
        seller: {
            name: data.sellerName,
            avatarUrl: data.sellerAvatarUrl,
            profileHref: data.sellerProfileHref,
            meta: data.sellerMeta,
        },
        badges: buildExtraBadges(data),
        ctaLabel: data.ctaLabel,
    };
}
