import { API_BASE } from '@simple/config';

export type YouTubeAccountView = {
    id: string;
    vertical: 'propiedades';
    channelId: string;
    channelTitle: string;
    channelHandle: string | null;
    avatarUrl: string | null;
    status: 'connected' | 'error' | 'disconnected';
    lastError: string | null;
    lastSyncedAt: number | null;
    lastPublishedAt: number | null;
};

export type YouTubeIntegrationStatus = {
    ok?: boolean;
    configured: boolean;
    eligible: boolean;
    currentPlanId: string;
    account: YouTubeAccountView | null;
    connectUrl: string | null;
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

export async function fetchYouTubeIntegrationStatus(): Promise<YouTubeIntegrationStatus | null> {
    const { data } = await apiRequest<YouTubeIntegrationStatus & { ok: boolean }>(
        '/api/integrations/youtube?vertical=propiedades',
        { method: 'GET' },
    );
    return data?.ok ? data : null;
}

export function buildYouTubeConnectUrl(returnTo: string): string {
    return `${API_BASE}/api/integrations/youtube/connect?vertical=propiedades&returnTo=${encodeURIComponent(returnTo)}`;
}

export async function disconnectYouTube(): Promise<{ ok: boolean; error?: string }> {
    const { status, data } = await apiRequest<{ ok: boolean; error?: string }>(
        '/api/integrations/youtube/disconnect',
        {
            method: 'POST',
            body: JSON.stringify({ vertical: 'propiedades' }),
        },
    );

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return data ?? { ok: false, error: 'No pudimos desconectar YouTube.' };
}
