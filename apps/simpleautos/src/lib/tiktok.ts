import { API_BASE } from './api-config';

export type TikTokAccountView = {
    id: string;
    vertical: 'autos';
    openId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    status: 'connected' | 'error' | 'disconnected';
    lastError: string | null;
    lastSyncedAt: number | null;
    lastPublishedAt: number | null;
};

export type TikTokIntegrationStatus = {
    ok?: boolean;
    configured: boolean;
    eligible: boolean;
    currentPlanId: string;
    account: TikTokAccountView | null;
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

export async function fetchTikTokIntegrationStatus(): Promise<TikTokIntegrationStatus | null> {
    const { data } = await apiRequest<TikTokIntegrationStatus & { ok: boolean }>(
        '/api/integrations/tiktok?vertical=autos',
        { method: 'GET' },
    );
    return data?.ok ? data : null;
}

export function buildTikTokConnectUrl(returnTo: string): string {
    return `${API_BASE}/api/integrations/tiktok/connect?vertical=autos&returnTo=${encodeURIComponent(returnTo)}`;
}

export async function disconnectTikTok(): Promise<{ ok: boolean; error?: string }> {
    const { status, data } = await apiRequest<{ ok: boolean; error?: string }>(
        '/api/integrations/tiktok/disconnect',
        {
            method: 'POST',
            body: JSON.stringify({ vertical: 'autos' }),
        },
    );

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return data ?? { ok: false, error: 'No pudimos desconectar TikTok.' };
}
