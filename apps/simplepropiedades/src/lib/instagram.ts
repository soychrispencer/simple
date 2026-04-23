import { API_BASE } from '@simple/config';

export type InstagramPlanId = 'free' | 'basic' | 'pro' | 'enterprise';

export type InstagramAccountView = {
    id: string;
    vertical: 'autos' | 'propiedades';
    instagramUserId: string;
    username: string;
    displayName: string | null;
    accountType: string | null;
    profilePictureUrl: string | null;
    scopes: string[];
    autoPublishEnabled: boolean;
    captionTemplate: string | null;
    status: 'connected' | 'error' | 'disconnected';
    lastSyncedAt: number | null;
    lastPublishedAt: number | null;
    lastError: string | null;
    createdAt: number;
    updatedAt: number;
};

export type InstagramPublicationView = {
    id: string;
    vertical: 'autos' | 'propiedades';
    listingId: string;
    listingTitle: string;
    instagramMediaId: string | null;
    instagramPermalink: string | null;
    caption: string;
    imageUrl: string;
    status: 'published' | 'failed';
    errorMessage: string | null;
    sourceUpdatedAt: number | null;
    publishedAt: number | null;
    createdAt: number;
    updatedAt: number;
};

export type InstagramTemplateView = {
    id: string;
    name: string;
    category: 'auto' | 'propiedad' | 'agenda';
    style: 'modern' | 'classic' | 'sport' | 'luxury' | 'minimal';
    layout: 'carousel' | 'single' | 'story';
    layoutVariant: 'square' | 'portrait';
    overlayVariant: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        surface: string;
        textPrimary: string;
        textInverse: string;
    };
    score: number;
    adaptations: {
        colors: boolean;
        layout: boolean;
        content: boolean;
    };
    branding: {
        appId: 'simpleautos' | 'simplepropiedades';
        appName: string;
        badgeText: string;
    };
    eyebrow: string;
    headline: string;
    priceLabel: string;
    locationLabel: string;
    highlights: string[];
    ctaLabel: string;
};

export type InstagramIntegrationStatus = {
    ok: boolean;
    vertical: 'autos' | 'propiedades';
    configured: boolean;
    eligible: boolean;
    currentPlanId: InstagramPlanId;
    requiredPlanIds: Array<'pro' | 'enterprise'>;
    connectUrl: string | null;
    account: InstagramAccountView | null;
    recentPublications: InstagramPublicationView[];
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

export async function fetchInstagramIntegrationStatus(): Promise<InstagramIntegrationStatus | null> {
    const { data } = await apiRequest<InstagramIntegrationStatus>('/api/integrations/instagram?vertical=propiedades', {
        method: 'GET',
    });
    return data?.ok ? data : null;
}

export function buildInstagramConnectUrl(returnTo: string): string {
    return `${API_BASE}/api/integrations/instagram/connect?vertical=propiedades&returnTo=${encodeURIComponent(returnTo)}`;
}

export async function updateInstagramSettings(input: {
    autoPublishEnabled: boolean;
    captionTemplate: string | null;
}): Promise<{ ok: boolean; account?: InstagramAccountView; error?: string }> {
    const { status, data } = await apiRequest<{ ok: boolean; account?: InstagramAccountView; error?: string }>('/api/integrations/instagram/settings', {
        method: 'POST',
        body: JSON.stringify({
            vertical: 'propiedades',
            autoPublishEnabled: input.autoPublishEnabled,
            captionTemplate: input.captionTemplate,
        }),
    });

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return data ?? { ok: false, error: 'No pudimos guardar la configuración.' };
}

export async function disconnectInstagram(): Promise<{ ok: boolean; error?: string }> {
    const { status, data } = await apiRequest<{ ok: boolean; error?: string }>('/api/integrations/instagram/disconnect', {
        method: 'POST',
        body: JSON.stringify({ vertical: 'propiedades' }),
    });

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return data ?? { ok: false, error: 'No pudimos desconectar Instagram.' };
}

export async function publishListingToInstagram(listingId: string, captionOverride?: string | null): Promise<{
    ok: boolean;
    publication?: InstagramPublicationView;
    error?: string;
}> {
    const { status, data } = await apiRequest<{ ok: boolean; publication?: InstagramPublicationView; error?: string }>('/api/integrations/instagram/publish', {
        method: 'POST',
        body: JSON.stringify({
            vertical: 'propiedades',
            listingId,
            captionOverride: captionOverride ?? null,
        }),
    });

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return data ?? { ok: false, error: 'No pudimos publicar en Instagram.' };
}

export async function publishListingToInstagramEnhanced(listingId: string, options: {
    useAI?: boolean;
    useTemplates?: boolean;
    tone?: 'professional' | 'casual' | 'excited' | 'luxury' | 'urgent';
    targetAudience?: 'young' | 'professional' | 'investors' | 'families' | 'general';
    captionOverride?: string | null;
    templateId?: string | null;
    layoutVariant?: 'square' | 'portrait' | null;
} = {}): Promise<{
    ok: boolean;
    result?: InstagramPublicationView;
    publication?: InstagramPublicationView;
    template?: InstagramTemplateView | null;
    error?: string;
}> {
    const { status, data } = await apiRequest<{
        ok: boolean;
        result?: InstagramPublicationView;
        publication?: InstagramPublicationView;
        template?: InstagramTemplateView | null;
        error?: string;
    }>('/api/integrations/instagram/publish-enhanced', {
        method: 'POST',
        body: JSON.stringify({
            vertical: 'propiedades',
            listingId,
            captionOverride: options.captionOverride ?? null,
            templateId: options.templateId ?? null,
            layoutVariant: options.layoutVariant ?? null,
            options,
        }),
    });

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return data ?? { ok: false, error: 'No pudimos publicar en Instagram.' };
}

export async function generateSmartTemplates(listingId: string): Promise<{
    ok: boolean;
    recommendedTemplate?: InstagramTemplateView;
    alternatives?: InstagramTemplateView[];
    adaptations?: {
        colors: boolean;
        layout: boolean;
        content: boolean;
    };
    score?: number;
    error?: string;
}> {
    const { status, data } = await apiRequest<{
        ok: boolean;
        recommendedTemplate?: InstagramTemplateView;
        alternatives?: InstagramTemplateView[];
        adaptations?: {
            colors: boolean;
            layout: boolean;
            content: boolean;
        };
        score?: number;
        error?: string;
    }>('/api/integrations/instagram/templates', {
        method: 'POST',
        body: JSON.stringify({
            vertical: 'propiedades',
            listingId,
        }),
    });

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return data ?? { ok: false, error: 'No se pudieron generar los templates.' };
}
