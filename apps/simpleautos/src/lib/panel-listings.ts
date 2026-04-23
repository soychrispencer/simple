import type { ListingLocation } from '@simple/types';
import type { PublicationLifecycleView } from '@simple/config';
import { API_BASE } from '@simple/config';

export type ListingSection = 'sale' | 'rent' | 'auction' | 'project';
export type ListingStatus = 'draft' | 'active' | 'paused' | 'sold' | 'archived';
export type PortalKey = 'yapo' | 'chileautos' | 'mercadolibre' | 'facebook';
export type PortalSyncStatus = 'missing' | 'ready' | 'published' | 'failed';

export type ListingPortalSync = {
    portal: PortalKey;
    label: string;
    status: PortalSyncStatus;
    missingRequired: string[];
    missingRecommended: string[];
    publishedAt: number | null;
    externalId: string | null;
    lastError: string | null;
};

export type RawDataPhoto = {
    id: string;
    name: string;
    dataUrl: string;
    previewUrl: string;
    url?: string;
    isCover: boolean;
    width: number;
    height: number;
    sizeBytes: number;
    mimeType: string;
};

export type RawDataDiscoverVideo = {
    id: string;
    name: string;
    dataUrl: string;
    previewUrl: string;
    url?: string;
    width?: number;
    height?: number;
    sizeBytes?: number;
    mimeType?: string;
    durationSeconds?: number;
};

export type RawDataMedia = {
    photos: RawDataPhoto[];
    videoUrl: string;
    discoverVideo: RawDataDiscoverVideo | null;
    documents: unknown[];
};

export type PanelListing = {
    id: string;
    vertical: 'autos' | 'propiedades';
    section: ListingSection;
    title: string;
    description: string;
    price: string;
    status: ListingStatus;
    views: number;
    clicks?: number;
    favs: number;
    leads: number;
    days: number;
    href: string;
    location?: string;
    locationData?: ListingLocation;
    updatedAt: number;
    publicationLifecycle?: PublicationLifecycleView;
    integrations: ListingPortalSync[];
    rawData?: unknown;
};

export type CreatePanelListingInput = {
    vertical: 'autos' | 'propiedades';
    listingType: ListingSection;
    title: string;
    description: string;
    priceLabel: string;
    location?: string;
    locationData?: ListingLocation;
    href?: string;
    status?: ListingStatus;
    rawData?: unknown;
};

type ListResponse = {
    ok: boolean;
    items?: PanelListing[];
    error?: string;
};

type CreateResponse = {
    ok: boolean;
    item?: PanelListing;
    error?: string;
};

type DetailResponse = {
    ok: boolean;
    item?: PanelListing;
    error?: string;
};

type PublishPortalResponse = {
    ok: boolean;
    portal?: PortalKey;
    integration?: ListingPortalSync;
    error?: string;
    missingRequired?: string[];
    missingRecommended?: string[];
};

type UpdateStatusResponse = {
    ok: boolean;
    item?: PanelListing;
    error?: string;
};

type DraftRecord = {
    id: string;
    userId: string;
    vertical: 'autos' | 'propiedades';
    draft: unknown;
    createdAt: number;
    updatedAt: number;
};

type DraftResponse = {
    ok: boolean;
    item?: DraftRecord | null;
    error?: string;
};

async function apiRequest<T>(path: string, init?: RequestInit): Promise<{ status: number; data: T | null }> {
    try {
        const response = await fetch(`${API_BASE}${path}`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(init?.headers ?? {}),
            },
            ...init,
        });

        const data = (await response.json().catch(() => null)) as T | null;
        return { status: response.status, data };
    } catch {
        return { status: 0, data: null };
    }
}

export async function fetchMyPanelListings(): Promise<{ items: PanelListing[]; unauthorized?: boolean }> {
    const { status, data } = await apiRequest<ListResponse>('/api/listings?vertical=autos&mine=true', { method: 'GET' });
    if (status === 401) return { items: [], unauthorized: true };
    if (!data?.ok || !Array.isArray(data.items)) return { items: [] };
    return { items: data.items };
}

export async function createPanelListing(input: CreatePanelListingInput): Promise<{ ok: boolean; item?: PanelListing; error?: string; unauthorized?: boolean }> {
    const { status, data } = await apiRequest<CreateResponse>('/api/listings', {
        method: 'POST',
        body: JSON.stringify(input),
    });
    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.', unauthorized: true };
    if (!data) return { ok: false, error: 'No pudimos conectar con el backend.' };
    return { ok: !!data.ok, item: data.item, error: data.error };
}

export async function publishListingToPortal(
    listingId: string,
    portal: PortalKey
): Promise<{ ok: boolean; integration?: ListingPortalSync; error?: string; missingRequired?: string[]; unauthorized?: boolean }> {
    const { status, data } = await apiRequest<PublishPortalResponse>(`/api/listings/${encodeURIComponent(listingId)}/integrations/publish`, {
        method: 'POST',
        body: JSON.stringify({ portal }),
    });

    if (status === 401) {
        return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.', unauthorized: true };
    }
    if (!data) return { ok: false, error: 'No pudimos conectar con el backend.' };
    if (data.ok) return { ok: true, integration: data.integration };

    if (status === 422) {
        return {
            ok: false,
            error: data.error ?? 'Faltan campos requeridos para publicar en el portal.',
            missingRequired: data.missingRequired ?? [],
        };
    }

    return { ok: false, error: data.error ?? 'No se pudo publicar en el portal.' };
}

export async function updatePanelListingStatus(
    listingId: string,
    status: ListingStatus
): Promise<{ ok: boolean; item?: PanelListing; error?: string; unauthorized?: boolean }> {
    const { status: responseStatus, data } = await apiRequest<UpdateStatusResponse>(`/api/listings/${encodeURIComponent(listingId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });

    if (responseStatus === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.', unauthorized: true };
    if (!data) return { ok: false, error: 'No pudimos conectar con el backend.' };
    return { ok: !!data.ok, item: data.item, error: data.error };
}

export async function fetchPanelListingDetail(
    listingId: string
): Promise<{ ok: boolean; item?: PanelListing; error?: string; unauthorized?: boolean }> {
    const { status, data } = await apiRequest<DetailResponse>(`/api/listings/${encodeURIComponent(listingId)}`, {
        method: 'GET',
    });
    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.', unauthorized: true };
    if (!data) return { ok: false, error: 'No pudimos conectar con el backend.' };
    return { ok: !!data.ok, item: data.item, error: data.error };
}

export async function deletePanelListing(
    listingId: string
): Promise<{ ok: boolean; error?: string; unauthorized?: boolean }> {
    const { status, data } = await apiRequest<{ ok: boolean; error?: string }>(`/api/listings/${encodeURIComponent(listingId)}`, {
        method: 'DELETE',
    });
    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.', unauthorized: true };
    if (!data) return { ok: false, error: 'No pudimos conectar con el backend.' };
    return { ok: !!data.ok, error: data.error };
}

export async function updatePanelListing(
    listingId: string,
    input: Omit<CreatePanelListingInput, 'vertical'>
): Promise<{ ok: boolean; item?: PanelListing; error?: string; unauthorized?: boolean }> {
    const { status, data } = await apiRequest<CreateResponse>(`/api/listings/${encodeURIComponent(listingId)}`, {
        method: 'PUT',
        body: JSON.stringify(input),
    });
    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.', unauthorized: true };
    if (!data) return { ok: false, error: 'No pudimos conectar con el backend.' };
    return { ok: !!data.ok, item: data.item, error: data.error };
}

export async function renewPanelListing(
    listingId: string
): Promise<{ ok: boolean; item?: PanelListing; error?: string; unauthorized?: boolean }> {
    const { status: responseStatus, data } = await apiRequest<UpdateStatusResponse>(`/api/listings/${encodeURIComponent(listingId)}/renew`, {
        method: 'POST',
    });

    if (responseStatus === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.', unauthorized: true };
    if (!data) return { ok: false, error: 'No pudimos conectar con el backend.' };
    return { ok: !!data.ok, item: data.item, error: data.error };
}

export async function fetchPanelListingDraft(
    vertical: 'autos' | 'propiedades' | 'autos-quick'
): Promise<{ ok: boolean; draft?: unknown; unauthorized?: boolean; error?: string }> {
    const { status, data } = await apiRequest<DraftResponse>(`/api/listing-draft?vertical=${encodeURIComponent(vertical)}`, {
        method: 'GET',
    });
    if (status === 401) return { ok: false, unauthorized: true, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    if (!data?.ok) return { ok: false, error: data?.error ?? 'No pudimos cargar el borrador.' };
    return { ok: true, draft: data.item?.draft };
}

export async function savePanelListingDraft(
    vertical: 'autos' | 'propiedades' | 'autos-quick',
    draft: unknown
): Promise<{ ok: boolean; unauthorized?: boolean; error?: string }> {
    const { status, data } = await apiRequest<DraftResponse>(`/api/listing-draft?vertical=${encodeURIComponent(vertical)}`, {
        method: 'PUT',
        body: JSON.stringify({ draft }),
    });
    if (status === 401) return { ok: false, unauthorized: true, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    if (!data?.ok) return { ok: false, error: data?.error ?? 'No pudimos guardar el borrador.' };
    return { ok: true };
}

export async function deletePanelListingDraft(
    vertical: 'autos' | 'propiedades' | 'autos-quick'
): Promise<{ ok: boolean; unauthorized?: boolean; error?: string }> {
    const { status, data } = await apiRequest<{ ok: boolean; error?: string }>(`/api/listing-draft?vertical=${encodeURIComponent(vertical)}`, {
        method: 'DELETE',
    });
    if (status === 401) return { ok: false, unauthorized: true, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    if (!data?.ok) return { ok: false, error: data?.error ?? 'No pudimos limpiar el borrador.' };
    return { ok: true };
}

export async function duplicatePanelListing(
    listingId: string
): Promise<{ ok: boolean; item?: PanelListing; error?: string; unauthorized?: boolean }> {
    // Step 1: Fetch the original listing details
    const detailResult = await fetchPanelListingDetail(listingId);
    if (!detailResult.ok || !detailResult.item) {
        return { ok: false, error: detailResult.error ?? 'No se pudo obtener la publicación original.', unauthorized: detailResult.unauthorized };
    }

    const original = detailResult.item;

    // Step 2: Create new listing with copied data (excluding id, views, favs, leads, days, href, integrations)
    const newListingInput: CreatePanelListingInput = {
        vertical: original.vertical,
        listingType: original.section,
        title: `${original.title} (Copia)`,
        description: original.description,
        priceLabel: original.price,
        location: original.location,
        locationData: original.locationData,
        status: 'draft', // Start as draft
        rawData: original.rawData,
    };

    return await createPanelListing(newListingInput);
}
