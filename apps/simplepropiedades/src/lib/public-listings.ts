import { API_BASE } from '@simple/config';

export type PublicListingSection = 'sale' | 'rent' | 'project';

export type PublicListing = {
    id: string;
    vertical: 'propiedades';
    section: PublicListingSection;
    sectionLabel: string;
    title: string;
    description: string;
    price: string;
    href: string;
    location: string;
    views: number;
    favs: number;
    leads: number;
    days: number;
    publishedAgo: string;
    updatedAt: number;
    images: string[];
    videoUrl?: string | null;
    summary: string[];
    seller: {
        id: string;
        name: string;
        username: string;
        profileHref: string | null;
        email: string;
        phone: string | null;
    } | null;
};

import type { PublicBusinessPaymentMethods } from '@simple/utils';

export type PublicProfile = {
    id: string;
    ownerUserId: string;
    name: string;
    username: string;
    vertical: 'propiedades';
    accountKind: 'individual' | 'independent' | 'company';
    accountKindLabel: string;
    subscriptionPlanId: 'free' | 'pro' | 'enterprise';
    subscriptionPlanName: string;
    headline: string | null;
    bio: string | null;
    companyName: string | null;
    website: string | null;
    email: string;
    phone: string | null;
    whatsapp: string | null;
    addressLine: string | null;
    city: string | null;
    region: string | null;
    locationLabel: string | null;
    coverImageUrl: string | null;
    avatarImageUrl: string | null;
    socialLinks: {
        instagram: string | null;
        facebook: string | null;
        linkedin: string | null;
        youtube: string | null;
        tiktok: string | null;
        x: string | null;
    };
    businessHours: Array<{
        day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
        open: string | null;
        close: string | null;
        closed: boolean;
    }>;
    scheduleNote: string | null;
    alwaysOpen: boolean;
    specialties: string[];
    activeListings: number;
    totalViews: number;
    totalFavorites: number;
    followers: number;
    paymentMethods?: PublicBusinessPaymentMethods | null;
};

type ListingsResponse = {
    ok: boolean;
    items?: PublicListing[];
};

type ListingResponse = {
    ok: boolean;
    item?: PublicListing;
    error?: string;
};

type ProfileCatalogService = {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    color: string | null;
    category: string;
    pricingMode: 'fixed' | 'quote';
    price: string | null;
    promoPrice: string | null;
    currency: string;
    durationMinutes: number | null;
    isOnline: boolean;
    isPresential: boolean;
};

type ProfileCatalogPack = {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    sessionsCount: number;
    price: string;
    promoPrice: string | null;
    currency: string;
    appliesTo: 'all' | 'services';
    serviceIds: string[];
    validityDays: number | null;
};

type ProfileCatalogPromotion = {
    id: string;
    label: string;
    description: string | null;
    discountType: 'percent' | 'fixed';
    discountValue: string;
    appliesTo: 'all' | 'services';
    serviceIds: string[];
    startsAt: string | null;
    endsAt: string | null;
};

type ProfileResponse = {
    ok: boolean;
    profile?: PublicProfile;
    listings?: PublicListing[];
    services?: ProfileCatalogService[];
    packs?: ProfileCatalogPack[];
    promotions?: ProfileCatalogPromotion[];
    error?: string;
};

export type PublicProfileCatalog = {
    services: ProfileCatalogService[];
    packs: ProfileCatalogPack[];
    promotions: ProfileCatalogPromotion[];
};

async function apiRequest<T>(path: string): Promise<T | null> {
    try {
        const response = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
        if (!response.ok) return null;
        return (await response.json().catch(() => null)) as T | null;
    } catch {
        return null;
    }
}

export async function fetchPublicListings(section?: PublicListingSection): Promise<PublicListing[]> {
    const suffix = section ? `&section=${encodeURIComponent(section)}` : '';
    const data = await apiRequest<ListingsResponse>(`/api/public/listings?vertical=propiedades${suffix}`);
    return Array.isArray(data?.items) ? data.items : [];
}

export async function fetchPublicListing(slug: string): Promise<PublicListing | null> {
    const data = await apiRequest<ListingResponse>(`/api/public/listings/${encodeURIComponent(slug)}?vertical=propiedades`);
    return data?.item ?? null;
}

export async function fetchPublicProfile(username: string): Promise<{ profile: PublicProfile; listings: PublicListing[]; catalog: PublicProfileCatalog } | null> {
    const data = await apiRequest<ProfileResponse>(`/api/public/profiles/${encodeURIComponent(username)}?vertical=propiedades`);
    if (!data?.profile || !Array.isArray(data.listings)) return null;
    return {
        profile: data.profile,
        listings: data.listings,
        catalog: {
            services: Array.isArray(data.services) ? data.services : [],
            packs: Array.isArray(data.packs) ? data.packs : [],
            promotions: Array.isArray(data.promotions) ? data.promotions : [],
        },
    };
}
