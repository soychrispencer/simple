import { API_BASE } from '@simple/config';
import { apiRequest as apiRequestBase } from './api-client.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AdFormat = 'hero' | 'card' | 'inline';
export type AdStatus = 'scheduled' | 'active' | 'paused' | 'ended';
export type AdPaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';
export type AdDestinationType = 'none' | 'custom_url' | 'listing' | 'profile';
export type AdOverlayAlign = 'left' | 'center' | 'right';
export type AdPlacementSection = 'home' | 'ventas' | 'arriendos' | 'subastas' | 'proyectos' | 'mariachis' | 'professionals';

export type AdCampaign = {
    id: string;
    userId: string;
    vertical: 'autos' | 'propiedades' | 'agenda' | 'serenatas';
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

type ApiResponse<T> = { status: number; data: T | null };
type CampaignListResponse = { ok: boolean; items?: AdCampaign[]; error?: string };
type CampaignItemResponse = { ok: boolean; item?: AdCampaign; error?: string };
type DeleteResponse = { ok: boolean; error?: string };

// ─── Constants ───────────────────────────────────────────────────────────────

export const MAX_CAMPAIGNS_TOTAL = 10;
export const MAX_ACTIVE_HERO_CAMPAIGNS = 5;

// ─── Pure utility functions ──────────────────────────────────────────────────

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
    const normalized = campaigns.map((c) => applyBaseStatus(c, now));
    const activeHeroCandidates = normalized
        .filter((c) => c.paymentStatus === 'paid' && c.format === 'hero' && c.status === 'active')
        .sort((a, b) => toMs(a.startAt) - toMs(b.startAt) || toMs(a.createdAt) - toMs(b.createdAt));
    const allowedHeroIds = new Set(activeHeroCandidates.slice(0, MAX_ACTIVE_HERO_CAMPAIGNS).map((c) => c.id));
    return normalized.map((c) => {
        if (c.paymentStatus !== 'paid' || c.format !== 'hero' || c.status !== 'active') return c;
        return allowedHeroIds.has(c.id) ? c : { ...c, status: 'scheduled' as const };
    });
}

export function getCampaignCounters(campaigns: AdCampaign[]): AdCounters {
    const n = normalizeCampaigns(campaigns);
    return {
        totalNotEnded: n.filter((c) => c.status !== 'ended').length,
        activeHero: n.filter((c) => c.paymentStatus === 'paid' && c.format === 'hero' && c.status === 'active').length,
        scheduled: n.filter((c) => c.paymentStatus === 'paid' && c.status === 'scheduled').length,
    };
}

export function getActiveHeroCampaigns(campaigns: AdCampaign[]): AdCampaign[] {
    return normalizeCampaigns(campaigns).filter(
        (c) => c.paymentStatus === 'paid' && c.format === 'hero' && c.status === 'active'
    );
}

export function getActiveCampaignsByFormat(campaigns: AdCampaign[], format: AdFormat, placementSection?: AdPlacementSection): AdCampaign[] {
    return normalizeCampaigns(campaigns).filter((c) => {
        if (c.paymentStatus !== 'paid' || c.format !== format || c.status !== 'active') return false;
        if (!placementSection || format !== 'inline') return true;
        return c.placementSection === placementSection;
    });
}

export function getCampaignDestinationHref(campaign: AdCampaign): string {
    if (campaign.destinationType === 'none') return '#';
    if (campaign.destinationType === 'listing' && campaign.listingHref) return campaign.listingHref;
    if (campaign.destinationType === 'profile' && campaign.profileSlug) {
        if (campaign.vertical === 'agenda' || campaign.vertical === 'serenatas') {
            return `/${encodeURIComponent(campaign.profileSlug)}`;
        }
        return `/perfil/${encodeURIComponent(campaign.profileSlug)}`;
    }
    if (campaign.destinationType === 'custom_url' && campaign.destinationUrl) return campaign.destinationUrl;
    return '#';
}

export function getActiveHeroCampaignsForPlacement(
    campaigns: AdCampaign[],
    placementSection?: AdPlacementSection,
): AdCampaign[] {
    const heroes = getActiveHeroCampaigns(campaigns);
    if (!placementSection) return heroes;
    return heroes.filter((campaign) => !campaign.placementSection || campaign.placementSection === placementSection);
}

export function isValidHttpUrl(url: string): boolean {
    try { return new URL(url).protocol === 'http:' || new URL(url).protocol === 'https:'; } catch { return false; }
}

// ─── Factory: per-vertical API functions ─────────────────────────────────────

export function createAdvertisingClient(vertical: 'autos' | 'propiedades' | 'agenda' | 'serenatas') {
    const AD_UPDATE_EVENT = `${vertical}:ad-campaigns-updated`;

    function emitCampaignsUpdated(): void {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new Event(AD_UPDATE_EVENT));
    }

    async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
        try {
            const response = await fetch(`${API_BASE}${path}`, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
                cache: 'no-store',
                ...init,
            });
            const data = (await response.json().catch(() => null)) as T | null;
            return { status: response.status, data };
        } catch {
            return { status: 0, data: null };
        }
    }

    async function fetchMyAdCampaigns() {
        const { status, data } = await apiRequest<CampaignListResponse>(`/api/advertising/campaigns?vertical=${vertical}`, { method: 'GET' });
        if (status === 401) return { items: [] as AdCampaign[], unauthorized: true, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
        if (!data?.ok || !Array.isArray(data.items)) return { items: [] as AdCampaign[], error: data?.error };
        return { items: normalizeCampaigns(data.items) };
    }

    async function fetchPublicAdCampaigns(): Promise<AdCampaign[]> {
        const { data } = await apiRequest<CampaignListResponse>(`/api/advertising/public?vertical=${vertical}`, { method: 'GET' });
        return data?.ok && Array.isArray(data.items) ? normalizeCampaigns(data.items) : [];
    }

    async function createAdCampaign(input: CreateAdCampaignInput) {
        const { status, data } = await apiRequest<CampaignItemResponse>('/api/advertising/campaigns', {
            method: 'POST', body: JSON.stringify({ vertical, ...input }),
        });
        if (status === 401) return { ok: false, error: 'Tu sesión expiró.', unauthorized: true };
        if (!data) return { ok: false, error: 'No pudimos conectar con el backend.' };
        return { ok: !!data.ok, item: data.item, error: data.error };
    }

    async function updateAdCampaignContent(campaignId: string, input: UpdateAdCampaignContentInput) {
        const { status, data } = await apiRequest<CampaignItemResponse>(`/api/advertising/campaigns/${encodeURIComponent(campaignId)}`, {
            method: 'PATCH', body: JSON.stringify({ action: 'content', ...input }),
        });
        if (status === 401) return { ok: false, error: 'Tu sesión expiró.', unauthorized: true };
        if (!data) return { ok: false, error: 'No pudimos conectar con el backend.' };
        return { ok: !!data.ok, item: data.item, error: data.error };
    }

    async function updateAdCampaignLifecycle(campaignId: string, lifecycleStatus: 'paused' | 'scheduled' | 'active') {
        const { status: rs, data } = await apiRequest<CampaignItemResponse>(`/api/advertising/campaigns/${encodeURIComponent(campaignId)}`, {
            method: 'PATCH', body: JSON.stringify({ action: 'lifecycle', status: lifecycleStatus }),
        });
        if (rs === 401) return { ok: false, error: 'Tu sesión expiró.', unauthorized: true };
        if (!data) return { ok: false, error: 'No pudimos conectar con el backend.' };
        return { ok: !!data.ok, item: data.item, error: data.error };
    }

    async function deleteAdCampaign(campaignId: string) {
        const { status, data } = await apiRequest<DeleteResponse>(`/api/advertising/campaigns/${encodeURIComponent(campaignId)}`, { method: 'DELETE' });
        if (status === 401) return { ok: false, error: 'Tu sesión expiró.', unauthorized: true };
        if (!data) return { ok: false, error: 'No pudimos conectar con el backend.' };
        return { ok: !!data.ok, error: data.error };
    }

    return {
        AD_UPDATE_EVENT,
        emitCampaignsUpdated,
        fetchMyAdCampaigns,
        fetchPublicAdCampaigns,
        createAdCampaign,
        updateAdCampaignContent,
        updateAdCampaignLifecycle,
        deleteAdCampaign,
    };
}
