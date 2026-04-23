import { API_BASE } from '@simple/config';

export type BoostSection = 'sale' | 'rent' | 'project';
export type BoostPlanId = 'boost_starter' | 'boost_pro' | 'boost_max';
export type BoostOrderStatus = 'scheduled' | 'active' | 'paused' | 'ended';

export type BoostListing = {
    id: string;
    vertical: 'autos' | 'propiedades';
    section: BoostSection;
    ownerId: string;
    href: string;
    title: string;
    subtitle: string;
    price: string;
    location: string;
    imageUrl?: string;
};

export type BoostPlan = {
    id: BoostPlanId;
    name: string;
    days: number;
    price: number;
    visibilityLift: string;
};

export type BoostOrder = {
    id: string;
    userId: string;
    vertical: 'autos' | 'propiedades';
    listingId: string;
    section: BoostSection;
    planId: BoostPlanId;
    planName: string;
    days: number;
    price: number;
    startAt: number;
    endAt: number;
    status: BoostOrderStatus;
    createdAt: number;
    updatedAt: number;
    sectionLabel?: string;
    listing?: BoostListing | null;
};

export type FeaturedBoostItem = {
    id: string;
    href: string;
    title: string;
    subtitle: string;
    price: string;
    location: string;
    imageUrl?: string;
    imageUrls?: string[];
    section: BoostSection;
    boosted: boolean;
    planName: string;
    boostEndsAt: number | null;
    owner?: {
        id: string;
        email: string;
        name: string;
        username: string;
        profileHref: string | null;
        phone: string | null;
    } | null;
};

export type FreeBoostQuota = {
    max: number;  // -1 = unlimited
    used: number;
    remaining: number; // -1 = unlimited
};

type BoostCatalogResponse = {
    ok: boolean;
    vertical: 'autos' | 'propiedades';
    sections: BoostSection[];
    listings: BoostListing[];
    plansBySection: Partial<Record<BoostSection, BoostPlan[]>>;
    reserved: Partial<Record<BoostSection, { used: number; max: number }>>;
    freeBoostQuota: FreeBoostQuota;
};

type BoostOrdersResponse = {
    ok: boolean;
    orders: BoostOrder[];
};

type CreateBoostOrderResponse = {
    ok: boolean;
    order?: BoostOrder;
    error?: string;
};

type FeaturedResponse = {
    ok: boolean;
    section: BoostSection;
    sectionLabel: string;
    items: FeaturedBoostItem[];
};


export const BOOST_SECTION_META: Record<BoostSection, { label: string; href: string }> = {
    sale: { label: 'Venta', href: '/ventas' },
    rent: { label: 'Arriendo', href: '/arriendos' },
    project: { label: 'Proyectos', href: '/proyectos' },
};

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T | null> {
    try {
        const response = await fetch(`${API_BASE}${path}`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(init?.headers ?? {}),
            },
            ...init,
        });

        if (!response.ok) return null;
        return (await response.json().catch(() => null)) as T | null;
    } catch {
        return null;
    }
}

export async function fetchBoostCatalog(): Promise<BoostCatalogResponse | null> {
    return apiRequest<BoostCatalogResponse>('/api/boost/catalog?vertical=propiedades', { method: 'GET' });
}

export async function fetchBoostOrders(): Promise<BoostOrder[]> {
    const data = await apiRequest<BoostOrdersResponse>('/api/boost/orders?vertical=propiedades', { method: 'GET' });
    return data?.orders ?? [];
}

export async function createBoostOrder(input: {
    listingId: string;
    section: BoostSection;
    planId: BoostPlanId;
}): Promise<{ ok: boolean; order?: BoostOrder; error?: string }> {
    const data = await apiRequest<CreateBoostOrderResponse>('/api/boost/orders', {
        method: 'POST',
        body: JSON.stringify({
            vertical: 'propiedades',
            listingId: input.listingId,
            section: input.section,
            planId: input.planId,
        }),
    });

    if (!data) return { ok: false, error: 'No pudimos crear el boost.' };
    return { ok: data.ok, order: data.order, error: data.error };
}

export async function activateFreeBoost(input: {
    listingId: string;
    section: BoostSection;
    planId: BoostPlanId;
}): Promise<{ ok: boolean; order?: BoostOrder; error?: string }> {
    const data = await apiRequest<CreateBoostOrderResponse>('/api/boost/orders', {
        method: 'POST',
        body: JSON.stringify({
            vertical: 'propiedades',
            listingId: input.listingId,
            section: input.section,
            planId: input.planId,
            useFreeBoost: true,
        }),
    });

    if (!data) return { ok: false, error: 'No pudimos activar el boost gratuito.' };
    return { ok: data.ok, order: data.order, error: data.error };
}

export async function updateBoostOrderStatus(orderId: string, status: 'active' | 'paused' | 'ended'): Promise<boolean> {
    const data = await apiRequest<{ ok: boolean }>(`/api/boost/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
    return Boolean(data?.ok);
}

export async function fetchFeaturedBoosted(section: BoostSection, limit = 8): Promise<FeaturedBoostItem[]> {
    const data = await apiRequest<FeaturedResponse>(
        `/api/boost/featured?vertical=propiedades&section=${encodeURIComponent(section)}&limit=${encodeURIComponent(String(limit))}`,
        { method: 'GET' }
    );
    return data?.items ?? [];
}
