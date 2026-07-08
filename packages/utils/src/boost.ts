import { apiFetch, publicFetch } from './api-client.js';

export type BoostVertical = 'autos' | 'propiedades' | 'agenda' | 'serenatas';
export type BoostSection = 'sale' | 'rent' | 'auction' | 'project' | 'marketplace' | 'landing' | 'products' | 'services';
export type BoostTargetType = 'listing' | 'serenata_group' | 'operator_profile' | 'operator_product' | 'operator_service';
export type BoostPlanId = 'boost_starter' | 'boost_pro' | 'boost_max';
export type BoostOrderStatus = 'scheduled' | 'active' | 'paused' | 'ended';

export type BoostListing = {
    id: string;
    vertical: BoostVertical;
    section: BoostSection;
    ownerId: string;
    href: string;
    title: string;
    subtitle: string;
    price: string;
    location: string;
    imageUrl?: string;
    targetType?: BoostTargetType;
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
    vertical: BoostVertical;
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
        username?: string;
        profileHref?: string | null;
        phone?: string | null;
        role?: 'user' | 'admin' | 'superadmin';
        avatar?: string;
    } | null;
};

export type FreeBoostQuota = {
    max: number;
    used: number;
    remaining: number;
    planId?: string;
    planName?: string;
    unlimited?: boolean;
};

export type BoostCatalogResponse = {
    ok: boolean;
    vertical: BoostVertical;
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

export function getBoostSectionMeta(vertical: BoostVertical): Partial<Record<BoostSection, { label: string; href: string }>> {
    if (vertical === 'serenatas') {
        return {
            marketplace: { label: 'Directorio mariachis', href: '/mariachis' },
            landing: { label: 'Portada', href: '/' },
        };
    }
    if (vertical === 'agenda') {
        return {
            marketplace: { label: 'Directorio profesionales', href: '/profesionales' },
            landing: { label: 'Portada', href: '/' },
        };
    }
    if (vertical === 'propiedades') {
        return {
            sale: { label: 'Venta', href: '/ventas' },
            rent: { label: 'Arriendo', href: '/arriendos' },
            auction: { label: 'Subastas', href: '/subastas' },
            project: { label: 'Proyectos', href: '/proyectos' },
        };
    }
    return {
        sale: { label: 'Venta', href: '/ventas' },
        rent: { label: 'Arriendo', href: '/arriendos' },
        auction: { label: 'Subastas', href: '/subastas' },
        project: { label: 'Proyectos', href: '/proyectos' },
        products: { label: 'Productos', href: '/productos' },
        services: { label: 'Servicios', href: '/servicios' },
    };
}

export async function fetchBoostCatalog(vertical: BoostVertical): Promise<BoostCatalogResponse | null> {
    const { ok, data } = await apiFetch<BoostCatalogResponse>(`/api/boost/catalog?vertical=${vertical}`, { method: 'GET' });
    return ok ? data : null;
}

export async function fetchBoostOrders(vertical: BoostVertical): Promise<BoostOrder[]> {
    const { data } = await apiFetch<BoostOrdersResponse>(`/api/boost/orders?vertical=${vertical}`, { method: 'GET' });
    return data?.orders ?? [];
}

export async function createBoostOrder(
    vertical: BoostVertical,
    input: {
        listingId: string;
        section: BoostSection;
        planId: BoostPlanId;
    }
): Promise<{ ok: boolean; order?: BoostOrder; error?: string }> {
    const { data } = await apiFetch<CreateBoostOrderResponse>('/api/boost/orders', {
        method: 'POST',
        body: JSON.stringify({ vertical, ...input }),
    });

    if (!data) return { ok: false, error: 'No pudimos crear el boost.' };
    return { ok: data.ok, order: data.order, error: data.error };
}

export async function activateFreeBoost(
    vertical: BoostVertical,
    input: {
        listingId: string;
        targetType?: BoostTargetType;
        section: BoostSection;
        planId: BoostPlanId;
    }
): Promise<{ ok: boolean; order?: BoostOrder; error?: string }> {
    const { data } = await apiFetch<CreateBoostOrderResponse>('/api/boost/orders', {
        method: 'POST',
        body: JSON.stringify({
            vertical,
            ...input,
            ...(input.targetType ? { targetType: input.targetType } : {}),
            useFreeBoost: true,
        }),
    });

    if (!data) return { ok: false, error: 'No pudimos activar el boost gratuito.' };
    return { ok: data.ok, order: data.order, error: data.error };
}

export async function updateBoostOrderStatus(orderId: string, status: 'active' | 'paused' | 'ended'): Promise<boolean> {
    const { data } = await apiFetch<{ ok: boolean }>(`/api/boost/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
    return Boolean(data?.ok);
}

export async function fetchFeaturedBoosted(
    vertical: BoostVertical,
    section: BoostSection,
    limit = 8
): Promise<FeaturedBoostItem[]> {
    const data = await publicFetch<FeaturedResponse>(
        `/api/boost/featured?vertical=${vertical}&section=${encodeURIComponent(section)}&limit=${encodeURIComponent(String(limit))}`,
    );
    return (data?.items ?? []).filter((item) => item.boosted);
}
