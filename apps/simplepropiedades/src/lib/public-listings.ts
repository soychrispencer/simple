import { API_BASE } from '@simple/config';
import { publicFetch } from '@simple/utils';

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
        avatarUrl?: string | null;
        email: string;
        phone: string | null;
        whatsapp?: string | null;
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

type ProfileCatalogProduct = {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    category: string;
    price: string;
    promoPrice: string | null;
    currency: string;
    stock: number | null;
    sku: string | null;
};

type ProfileResponse = {
    ok: boolean;
    profile?: PublicProfile;
    listings?: PublicListing[];
    services?: ProfileCatalogService[];
    packs?: ProfileCatalogPack[];
    promotions?: ProfileCatalogPromotion[];
    products?: ProfileCatalogProduct[];
    error?: string;
};

export type PublicProfileCatalog = {
    services: ProfileCatalogService[];
    packs: ProfileCatalogPack[];
    promotions: ProfileCatalogPromotion[];
    products: ProfileCatalogProduct[];
};

/** Publicaciones consideradas "recién llegadas" en sliders de home (por días desde publicación). */
export const RECENT_LISTING_MAX_DAYS = 30;

export function selectRecentPublicListings(listings: PublicListing[], limit = 30): PublicListing[] {
    return listings
        .filter((item) => item.days <= RECENT_LISTING_MAX_DAYS)
        .sort((a, b) => a.days - b.days || b.updatedAt - a.updatedAt)
        .slice(0, limit);
}

export type PublicListingsFilters = {
    q?: string;
    region?: string;
    commune?: string;
    price_from?: string;
    price_to?: string;
    property_type?: string;
    bedrooms?: string;
    bathrooms?: string;
    parking?: string;
    min_area?: string;
    sales_stage?: string;
    delivery_status?: string;
};

export async function fetchPublicListings(section?: PublicListingSection, filters?: PublicListingsFilters): Promise<PublicListing[]> {
    const params = new URLSearchParams();
    params.set('vertical', 'propiedades');
    if (section) params.set('section', section);
    if (filters?.q) params.set('q', filters.q);
    if (filters?.region) params.set('region', filters.region);
    if (filters?.commune) params.set('commune', filters.commune);
    if (filters?.price_from) params.set('price_from', filters.price_from);
    if (filters?.price_to) params.set('price_to', filters.price_to);
    if (filters?.property_type) params.set('property_type', filters.property_type);
    if (filters?.bedrooms) params.set('bedrooms', filters.bedrooms);
    if (filters?.bathrooms) params.set('bathrooms', filters.bathrooms);
    if (filters?.parking) params.set('parking', filters.parking);
    if (filters?.min_area) params.set('min_area', filters.min_area);
    if (filters?.sales_stage) params.set('sales_stage', filters.sales_stage);
    if (filters?.delivery_status) params.set('delivery_status', filters.delivery_status);

    const data = await publicFetch<ListingsResponse>(`/api/public/listings?${params.toString()}`);
    return Array.isArray(data?.items) ? data.items : [];
}

export async function fetchPublicListing(slug: string): Promise<PublicListing | null> {
    const data = await publicFetch<ListingResponse>(`/api/public/listings/${encodeURIComponent(slug)}?vertical=propiedades`);
    return data?.item ?? null;
}

export async function fetchPublicProfile(username: string): Promise<{ profile: PublicProfile; listings: PublicListing[]; catalog: PublicProfileCatalog } | null> {
    const data = await publicFetch<ProfileResponse>(`/api/public/profiles/${encodeURIComponent(username)}?vertical=propiedades`);
    if (!data?.profile || !Array.isArray(data.listings)) return null;
    return {
        profile: data.profile,
        listings: data.listings,
        catalog: {
            services: Array.isArray(data.services) ? data.services : [],
            packs: Array.isArray(data.packs) ? data.packs : [],
            promotions: Array.isArray(data.promotions) ? data.promotions : [],
            products: Array.isArray(data.products) ? data.products : [],
        },
    };
}
