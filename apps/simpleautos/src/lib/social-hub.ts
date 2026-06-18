import { API_BASE } from './api-config';

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

export type SocialPublishTarget =
    | 'instagram_carousel'
    | 'instagram_reel'
    | 'facebook'
    | 'tiktok'
    | 'youtube'
    | 'all';

export type SocialPlatformStatus = {
    available: boolean;
    configured?: boolean;
    connected: boolean;
    username?: string | null;
    channelTitle?: string | null;
    pageName?: string | null;
    needsReconnect?: boolean;
    connectUrl?: string | null;
    message?: string;
};

export type SocialPublicationView = {
    id: string;
    listingId: string;
    listingTitle: string;
    platform: 'facebook' | 'tiktok' | 'youtube';
    contentType: 'video' | 'link' | 'image';
    permalink: string | null;
    status: 'published' | 'failed';
    errorMessage: string | null;
    publishedAt: number | null;
};

export type SocialHubStatus = {
    configured: boolean;
    eligible: boolean;
    currentPlanId: string;
    platforms: {
        instagram: SocialPlatformStatus;
        facebook: SocialPlatformStatus;
        tiktok: SocialPlatformStatus;
        youtube: SocialPlatformStatus;
    };
    recentPublications: SocialPublicationView[];
};

export type SocialHubPublishResult = {
    target: SocialPublishTarget;
    ok: boolean;
    message: string;
    permalink?: string | null;
};

export async function fetchSocialHubStatus(vertical: 'autos' = 'autos'): Promise<SocialHubStatus | null> {
    const { status, data } = await apiRequest<{
        ok: boolean;
        configured?: boolean;
        eligible?: boolean;
        currentPlanId?: string;
        platforms?: SocialHubStatus['platforms'];
        recentPublications?: SocialPublicationView[];
    }>(`/api/integrations/social?vertical=${encodeURIComponent(vertical)}`);

    if (status === 401 || !data?.ok) return null;
    return {
        configured: Boolean(data.configured),
        eligible: Boolean(data.eligible),
        currentPlanId: data.currentPlanId ?? 'free',
        platforms: data.platforms ?? {
            instagram: { available: true, connected: false },
            facebook: { available: true, connected: false },
            tiktok: { available: false, connected: false, configured: false },
            youtube: { available: false, connected: false, configured: false },
        },
        recentPublications: Array.isArray(data.recentPublications) ? data.recentPublications : [],
    };
}

export async function publishListingToSocialHub(
    listingId: string,
    options: {
        vertical?: 'autos';
        publishAll?: boolean;
        targets?: SocialPublishTarget[];
        captionOverride?: string | null;
    } = {},
): Promise<{ ok: boolean; results: SocialHubPublishResult[]; error?: string }> {
    const { status, data } = await apiRequest<{
        ok: boolean;
        results?: SocialHubPublishResult[];
        error?: string;
    }>('/api/integrations/social/publish', {
        method: 'POST',
        body: JSON.stringify({
            vertical: options.vertical ?? 'autos',
            listingId,
            publishAll: options.publishAll ?? false,
            targets: options.targets,
            captionOverride: options.captionOverride ?? null,
        }),
    });

    if (status === 401) return { ok: false, results: [], error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return {
        ok: Boolean(data?.ok),
        results: Array.isArray(data?.results) ? data.results : [],
        error: data?.error,
    };
}

export async function publishListingToFacebookPage(
    listingId: string,
    captionOverride?: string | null,
): Promise<{ ok: boolean; result?: SocialHubPublishResult; error?: string }> {
    const response = await publishListingToSocialHub(listingId, {
        targets: ['facebook'],
        captionOverride,
    });
    const result = response.results.find((item) => item.target === 'facebook');
    return {
        ok: Boolean(result?.ok),
        result,
        error: result?.ok ? undefined : (result?.message ?? response.error ?? 'No pudimos publicar en Facebook.'),
    };
}
