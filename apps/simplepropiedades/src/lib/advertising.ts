const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type AdFormat = 'hero' | 'card' | 'inline';
export type AdStatus = 'scheduled' | 'active' | 'paused' | 'ended';
export type AdPaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';
export type AdDestinationType = 'none' | 'custom_url' | 'listing' | 'profile';
export type AdOverlayAlign = 'left' | 'center' | 'right';
export type AdPlacementSection = 'home' | 'ventas' | 'arriendos' | 'subastas' | 'proyectos';

export type AdCampaign = {
    id: string;
    userId: string;
    vertical: 'autos' | 'propiedades';
    name: string;
    format: AdFormat;
    status: AdStatus;
    paymentStatus: AdPaymentStatus;
    destinationType: AdDestinationType;
    destinationUrl?: string | null;
    listingHref?: string | null;
    profileSlug?: string | null;
    desktopImageDataUrl: string;
    mobileImageDataUrl?: string | null;
    overlayEnabled: boolean;
    overlayTitle?: string | null;
    overlaySubtitle?: string | null;
    overlayCta?: string | null;
    overlayAlign: AdOverlayAlign;
    placementSection?: AdPlacementSection | null;
    startAt: string;
    endAt: string;
    durationDays: number;
    paidAt?: string | null;
    createdAt: string;
    updatedAt: string;
};

export type AdCounters = {
    totalNotEnded: number;
    activeHero: number;
    scheduled: number;
};

export type CreateAdCampaignInput = {
    name: string;
    format: AdFormat;
    destinationType: AdDestinationType;
    destinationUrl?: string | null;
    listingHref?: string | null;
    profileSlug?: string | null;
    desktopImageDataUrl: string;
    mobileImageDataUrl?: string | null;
    overlayEnabled: boolean;
    overlayTitle?: string | null;
    overlaySubtitle?: string | null;
    overlayCta?: string | null;
    overlayAlign: AdOverlayAlign;
    placementSection?: AdPlacementSection | null;
    startAt: string;
    durationDays: 7 | 15 | 30;
};

export type UpdateAdCampaignContentInput = {
    name: string;
    destinationType: AdDestinationType;
    destinationUrl?: string | null;
    listingHref?: string | null;
    profileSlug?: string | null;
    desktopImageDataUrl: string;
    mobileImageDataUrl?: string | null;
    overlayEnabled: boolean;
    overlayTitle?: string | null;
    overlaySubtitle?: string | null;
    overlayCta?: string | null;
    overlayAlign: AdOverlayAlign;
};

type ApiResponse<T> = {
    status: number;
    data: T | null;
};

type CampaignListResponse = {
    ok: boolean;
    items?: AdCampaign[];
    error?: string;
};

type CampaignItemResponse = {
    ok: boolean;
    item?: AdCampaign;
    error?: string;
};

type DeleteResponse = {
    ok: boolean;
    error?: string;
};

export const AD_UPDATE_EVENT = 'simplepropiedades:ad-campaigns-updated';
export const MAX_CAMPAIGNS_TOTAL = 10;
export const MAX_ACTIVE_HERO_CAMPAIGNS = 5;

async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
    try {
        const response = await fetch(`${API_BASE}${path}`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(init?.headers ?? {}),
            },
            cache: 'no-store',
            ...init,
        });

        const data = (await response.json().catch(() => null)) as T | null;
        return { status: response.status, data };
    } catch {
        return { status: 0, data: null };
    }
}

export function emitCampaignsUpdated(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(AD_UPDATE_EVENT));
}

function toMs(iso: string): number {
    const value = new Date(iso).getTime();
    return Number.isNaN(value) ? 0 : value;
}

function applyBaseStatus(campaign: AdCampaign, now: number): AdCampaign {
    const startMs = toMs(campaign.startAt);
    const endMs = toMs(campaign.endAt);

    if (campaign.status === 'paused') {
        if (endMs > 0 && now >= endMs) return { ...campaign, status: 'ended' };
        return campaign;
    }
    if (endMs > 0 && now >= endMs) return { ...campaign, status: 'ended' };
    if (startMs > now) return { ...campaign, status: 'scheduled' };
    return { ...campaign, status: 'active' };
}

export function normalizeCampaigns(campaigns: AdCampaign[], now: number = Date.now()): AdCampaign[] {
    const normalized = campaigns.map((campaign) => applyBaseStatus(campaign, now));

    const activeHeroCandidates = normalized
        .filter((campaign) => campaign.paymentStatus === 'paid' && campaign.format === 'hero' && campaign.status === 'active')
        .sort((a, b) => toMs(a.startAt) - toMs(b.startAt) || toMs(a.createdAt) - toMs(b.createdAt));

    const allowedHeroIds = new Set(
        activeHeroCandidates.slice(0, MAX_ACTIVE_HERO_CAMPAIGNS).map((campaign) => campaign.id)
    );

    return normalized.map((campaign) => {
        if (campaign.paymentStatus !== 'paid') return campaign;
        if (campaign.format !== 'hero') return campaign;
        if (campaign.status !== 'active') return campaign;
        if (allowedHeroIds.has(campaign.id)) return campaign;
        return { ...campaign, status: 'scheduled' };
    });
}

export function getCampaignCounters(campaigns: AdCampaign[]): AdCounters {
    const normalized = normalizeCampaigns(campaigns);
    return {
        totalNotEnded: normalized.filter((campaign) => campaign.status !== 'ended').length,
        activeHero: normalized.filter(
            (campaign) => campaign.paymentStatus === 'paid' && campaign.format === 'hero' && campaign.status === 'active'
        ).length,
        scheduled: normalized.filter(
            (campaign) => campaign.paymentStatus === 'paid' && campaign.status === 'scheduled'
        ).length,
    };
}

export function getActiveHeroCampaigns(campaigns: AdCampaign[]): AdCampaign[] {
    return normalizeCampaigns(campaigns).filter(
        (campaign) => campaign.paymentStatus === 'paid' && campaign.format === 'hero' && campaign.status === 'active'
    );
}

export function getActiveCampaignsByFormat(
    campaigns: AdCampaign[],
    format: AdFormat,
    placementSection?: AdPlacementSection
): AdCampaign[] {
    return normalizeCampaigns(campaigns).filter((campaign) => {
        if (campaign.paymentStatus !== 'paid') return false;
        if (campaign.format !== format || campaign.status !== 'active') return false;
        if (!placementSection) return true;
        if (format !== 'inline') return true;
        return campaign.placementSection === placementSection;
    });
}

export function getCampaignDestinationHref(campaign: AdCampaign): string {
    if (campaign.destinationType === 'none') return '#';
    if (campaign.destinationType === 'listing' && campaign.listingHref) return campaign.listingHref;
    if (campaign.destinationType === 'profile' && campaign.profileSlug) return `/perfil/${campaign.profileSlug}`;
    if (campaign.destinationType === 'custom_url' && campaign.destinationUrl) return campaign.destinationUrl;
    return '#';
}

export function isValidHttpUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

export async function fetchMyAdCampaigns(): Promise<{
    items: AdCampaign[];
    unauthorized?: boolean;
    error?: string;
}> {
    const { status, data } = await apiRequest<CampaignListResponse>('/api/advertising/campaigns?vertical=propiedades', {
        method: 'GET',
    });

    if (status === 401) {
        return { items: [], unauthorized: true, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    }
    if (!data?.ok || !Array.isArray(data.items)) return { items: [], error: data?.error };
    return { items: normalizeCampaigns(data.items) };
}

export async function fetchPublicAdCampaigns(): Promise<AdCampaign[]> {
    const { data } = await apiRequest<CampaignListResponse>('/api/advertising/public?vertical=propiedades', {
        method: 'GET',
    });
    return data?.ok && Array.isArray(data.items) ? normalizeCampaigns(data.items) : [];
}

export async function createAdCampaign(input: CreateAdCampaignInput): Promise<{
    ok: boolean;
    item?: AdCampaign;
    error?: string;
    unauthorized?: boolean;
}> {
    const { status, data } = await apiRequest<CampaignItemResponse>('/api/advertising/campaigns', {
        method: 'POST',
        body: JSON.stringify({
            vertical: 'propiedades',
            ...input,
        }),
    });

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.', unauthorized: true };
    if (!data) return { ok: false, error: 'No pudimos conectar con el backend.' };
    return { ok: !!data.ok, item: data.item, error: data.error };
}

export async function updateAdCampaignContent(
    campaignId: string,
    input: UpdateAdCampaignContentInput
): Promise<{ ok: boolean; item?: AdCampaign; error?: string; unauthorized?: boolean }> {
    const { status, data } = await apiRequest<CampaignItemResponse>(`/api/advertising/campaigns/${encodeURIComponent(campaignId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
            action: 'content',
            ...input,
        }),
    });

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.', unauthorized: true };
    if (!data) return { ok: false, error: 'No pudimos conectar con el backend.' };
    return { ok: !!data.ok, item: data.item, error: data.error };
}

export async function updateAdCampaignLifecycle(
    campaignId: string,
    status: 'paused' | 'scheduled' | 'active'
): Promise<{ ok: boolean; item?: AdCampaign; error?: string; unauthorized?: boolean }> {
    const { status: responseStatus, data } = await apiRequest<CampaignItemResponse>(`/api/advertising/campaigns/${encodeURIComponent(campaignId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
            action: 'lifecycle',
            status,
        }),
    });

    if (responseStatus === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.', unauthorized: true };
    if (!data) return { ok: false, error: 'No pudimos conectar con el backend.' };
    return { ok: !!data.ok, item: data.item, error: data.error };
}

export async function deleteAdCampaign(
    campaignId: string
): Promise<{ ok: boolean; error?: string; unauthorized?: boolean }> {
    const { status, data } = await apiRequest<DeleteResponse>(`/api/advertising/campaigns/${encodeURIComponent(campaignId)}`, {
        method: 'DELETE',
    });

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.', unauthorized: true };
    if (!data) return { ok: false, error: 'No pudimos conectar con el backend.' };
    return { ok: !!data.ok, error: data.error };
}
