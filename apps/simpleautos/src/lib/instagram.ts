const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type InstagramPlanId = 'free' | 'basic' | 'pro' | 'enterprise';

// Nuevos tipos para Instagram Intelligence
export type InstagramTone = 'professional' | 'casual' | 'excited' | 'luxury' | 'urgent';
export type InstagramTargetAudience = 'young' | 'professional' | 'investors' | 'families' | 'general';
export type InstagramPriority = 'low' | 'medium' | 'high' | 'urgent';

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

export type InstagramAIContentView = {
    caption: string;
    hashtags: string[];
    callToAction: string;
    emojiSet: string[];
    tone: InstagramTone;
    targetAudience: string;
    predictedEngagement: number;
};

export type InstagramAnalyticsView = {
    id: string;
    publicationId: string;
    listingId: string;
    vertical: 'autos' | 'propiedades' | 'agenda';
    impressions: number;
    reach: number;
    engagement: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    clicksToWebsite: number;
    leadsGenerated: number;
    inquiries: number;
    publishedAt: string;
    engagementRate: number;
    performanceScore: number;
    hashtagPerformance: Record<string, {
        reach: number;
        engagement: number;
        clicks: number;
    }>;
};

export type InstagramABTestView = {
    id: string;
    listingId: string;
    name: string;
    status: 'draft' | 'active' | 'completed' | 'paused';
    variants: Array<{
        id: string;
        name: string;
        content: InstagramAIContentView;
        testWeight: number;
    }>;
    startDate: string;
    endDate?: string;
    targetSampleSize: number;
    currentSampleSize: number;
    winner?: {
        variantId: string;
        confidence: number;
        improvement: number;
    };
};

export type InstagramScheduledPostView = {
    id: string;
    listingId: string;
    content: {
        caption: string;
        hashtags: string[];
        images: string[];
    };
    scheduledTime: string;
    status: 'scheduled' | 'published' | 'failed' | 'cancelled';
    priority: InstagramPriority;
    timezone: string;
    createdAt: string;
    publishedAt?: string;
    errorMessage?: string;
};

export type InstagramSchedulingInsights = {
    bestTimes: Array<{
        dayOfWeek: string;
        hour: number;
        avgEngagement: number;
        avgReach: number;
        confidence: number;
    }>;
    worstTimes: Array<{
        dayOfWeek: string;
        hour: number;
        avgEngagement: number;
        reason: string;
    }>;
    recommendations: string[];
    seasonalPatterns: Array<{
        month: string;
        performanceMultiplier: number;
        notes: string;
    }>;
};

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
    const { data } = await apiRequest<InstagramIntegrationStatus>('/api/integrations/instagram?vertical=autos', {
        method: 'GET',
    });
    return data?.ok ? data : null;
}

export function buildInstagramConnectUrl(returnTo: string): string {
    return `${API_BASE}/api/integrations/instagram/connect?vertical=autos&returnTo=${encodeURIComponent(returnTo)}`;
}

export async function updateInstagramSettings(input: {
    autoPublishEnabled: boolean;
    captionTemplate: string | null;
}): Promise<{ ok: boolean; account?: InstagramAccountView; error?: string }> {
    const { status, data } = await apiRequest<{ ok: boolean; account?: InstagramAccountView; error?: string }>('/api/integrations/instagram/settings', {
        method: 'POST',
        body: JSON.stringify({
            vertical: 'autos',
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
        body: JSON.stringify({ vertical: 'autos' }),
    });

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return data ?? { ok: false, error: 'No pudimos desconectar Instagram.' };
}

// ==========================================
// NUEVAS FUNCIONES DE INSTAGRAM INTELLIGENCE
// ==========================================

// Publicación con IA mejorada
export async function publishListingToInstagramEnhanced(listingId: string, options: {
    useAI?: boolean;
    enableABTesting?: boolean;
    schedulePost?: boolean;
    useTemplates?: boolean;
    optimizeContent?: boolean;
    preferredTime?: Date;
    tone?: InstagramTone;
    targetAudience?: InstagramTargetAudience;
    priority?: InstagramPriority;
    captionOverride?: string | null;
    templateId?: string | null;
    layoutVariant?: 'square' | 'portrait' | null;
} = {}): Promise<{
    ok: boolean;
    result?: any;
    publication?: InstagramPublicationView;
    aiContent?: InstagramAIContentView;
    template?: InstagramTemplateView;
    scheduledPost?: InstagramScheduledPostView;
    testCampaign?: InstagramABTestView;
    optimizations?: any;
    insights?: any;
    error?: string;
}> {
    const { status, data } = await apiRequest<{
        ok: boolean;
        result?: any;
        publication?: InstagramPublicationView;
        aiContent?: InstagramAIContentView;
        template?: InstagramTemplateView;
        scheduledPost?: InstagramScheduledPostView;
        testCampaign?: InstagramABTestView;
        optimizations?: any;
        insights?: any;
        error?: string;
    }>('/api/integrations/instagram/publish-enhanced', {
        method: 'POST',
        body: JSON.stringify({
            vertical: 'autos',
            listingId,
            captionOverride: options.captionOverride ?? null,
            templateId: options.templateId ?? null,
            layoutVariant: options.layoutVariant ?? null,
            options
        }),
    });

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return data ?? { ok: false, error: 'No pudimos publicar en Instagram.' };
}

// Generar templates inteligentes
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
            vertical: 'autos',
            listingId,
        }),
    });

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return data ?? { ok: false, error: 'No se pudieron generar los templates.' };
}
// Obtener insights de Instagram
export async function getInstagramInsights(listingId?: string, dateRange?: { from: Date; to: Date }): Promise<{
    ok: boolean;
    analytics?: InstagramAnalyticsView[];
    summary?: any;
    insights?: any;
    recommendations?: string[];
    error?: string;
}> {
    const params = new URLSearchParams();
    if (listingId) params.append('listingId', listingId);
    if (dateRange) {
        params.append('from', dateRange.from.toISOString());
        params.append('to', dateRange.to.toISOString());
    }

    const { status, data } = await apiRequest<{
        ok: boolean;
        analytics?: InstagramAnalyticsView[];
        summary?: any;
        insights?: any;
        recommendations?: string[];
        error?: string;
    }>(`/api/integrations/instagram/insights?${params.toString()}`, {
        method: 'GET',
    });

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return data ?? { ok: false, error: 'No pudimos obtener insights.' };
}

// Crear campaña de A/B testing
export async function createABTestCampaign(listingId: string, baseContent: InstagramAIContentView, variations: Partial<{
    tone: InstagramTone;
    targetAudience: InstagramTargetAudience;
    includeEmojis: boolean;
    maxLength: number;
    focusOn: 'speed' | 'luxury' | 'value' | 'reliability' | 'innovation';
}>[]): Promise<{
    ok: boolean;
    campaign?: InstagramABTestView;
    error?: string;
}> {
    const { status, data } = await apiRequest<{
        ok: boolean;
        campaign?: InstagramABTestView;
        error?: string;
    }>('/api/integrations/instagram/ab-test/create', {
        method: 'POST',
        body: JSON.stringify({
            vertical: 'autos',
            listingId,
            baseContent,
            variations
        }),
    });

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return data ?? { ok: false, error: 'No pudimos crear campaña de A/B testing.' };
}

// Analizar resultados de A/B test
export async function analyzeABTestResults(campaignId: string): Promise<{
    ok: boolean;
    insights?: any;
    winner?: any;
    recommendations?: string[];
    statisticalSignificance?: boolean;
    error?: string;
}> {
    const { status, data } = await apiRequest<{
        ok: boolean;
        insights?: any;
        winner?: any;
        recommendations?: string[];
        statisticalSignificance?: boolean;
        error?: string;
    }>(`/api/integrations/instagram/ab-test/${campaignId}/analyze`, {
        method: 'POST',
    });

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return data ?? { ok: false, error: 'No pudimos analizar resultados.' };
}

// Programar publicación inteligente
export async function scheduleInstagramPost(listingId: string, content: {
    caption: string;
    hashtags: string[];
    images: string[];
}, options: {
    preferredTimes?: Array<{ dayOfWeek: number; hour: number; minute: number }>;
    timezone?: string;
    priority?: InstagramPriority;
    publishImmediately?: boolean;
} = {}): Promise<{
    ok: boolean;
    scheduledPost?: InstagramScheduledPostView;
    error?: string;
}> {
    const { status, data } = await apiRequest<{
        ok: boolean;
        scheduledPost?: InstagramScheduledPostView;
        error?: string;
    }>('/api/integrations/instagram/schedule', {
        method: 'POST',
        body: JSON.stringify({
            vertical: 'autos',
            listingId,
            content,
            options
        }),
    });

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return data ?? { ok: false, error: 'No pudimos programar publicación.' };
}

// Obtener insights de scheduling
export async function getSchedulingInsights(): Promise<{
    ok: boolean;
    bestTimes?: Array<{
        dayOfWeek: string;
        hour: number;
        avgEngagement: number;
        confidence: number;
    }>;
    worstTimes?: Array<{
        dayOfWeek: string;
        hour: number;
        avgEngagement: number;
        reason: string;
    }>;
    recommendations?: string[];
    seasonalPatterns?: Array<{
        month: string;
        performanceMultiplier: number;
        notes: string;
    }>;
    error?: string;
}> {
    const { status, data } = await apiRequest<{
        ok: boolean;
        bestTimes?: Array<{
            dayOfWeek: string;
            hour: number;
            avgEngagement: number;
            confidence: number;
        }>;
        worstTimes?: Array<{
            dayOfWeek: string;
            hour: number;
            avgEngagement: number;
            reason: string;
        }>;
        recommendations?: string[];
        seasonalPatterns?: Array<{
            month: string;
            performanceMultiplier: number;
            notes: string;
        }>;
        error?: string;
    }>('/api/integrations/instagram/scheduling-insights', {
        method: 'GET',
    });

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return data ?? { ok: false, error: 'No pudimos obtener insights de scheduling.' };
}

// Obtener publicaciones programadas
export async function getScheduledPosts(hoursAhead: number = 24): Promise<{
    ok: boolean;
    posts?: InstagramScheduledPostView[];
    error?: string;
}> {
    const { status, data } = await apiRequest<{
        ok: boolean;
        posts?: InstagramScheduledPostView[];
        error?: string;
    }>(`/api/integrations/instagram/scheduled?hoursAhead=${hoursAhead}`, {
        method: 'GET',
    });

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return data ?? { ok: false, error: 'No pudimos obtener publicaciones programadas.' };
}

// Optimizar contenido existente
export async function optimizeInstagramContent(publicationId: string, currentContent: InstagramAIContentView, listingId: string): Promise<{
    ok: boolean;
    optimizedContent?: InstagramAIContentView;
    improvements?: string[];
    expectedImprovement?: { engagement: number; reach: number; clicks: number };
    error?: string;
}> {
    const { status, data } = await apiRequest<{
        ok: boolean;
        optimizedContent?: InstagramAIContentView;
        improvements?: string[];
        expectedImprovement?: { engagement: number; reach: number; clicks: number };
        error?: string;
    }>('/api/integrations/instagram/optimize', {
        method: 'POST',
        body: JSON.stringify({
            vertical: 'autos',
            publicationId,
            currentContent,
            listingId
        }),
    });

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return data ?? { ok: false, error: 'No pudimos optimizar contenido.' };
}

export async function publishListingToInstagram(listingId: string, captionOverride?: string | null): Promise<{
    ok: boolean;
    publication?: InstagramPublicationView;
    error?: string;
}> {
    const { status, data } = await apiRequest<{ ok: boolean; publication?: InstagramPublicationView; error?: string }>('/api/integrations/instagram/publish', {
        method: 'POST',
        body: JSON.stringify({
            vertical: 'autos',
            listingId,
            captionOverride: captionOverride ?? null,
        }),
    });

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return data ?? { ok: false, error: 'No pudimos publicar en Instagram.' };
}
