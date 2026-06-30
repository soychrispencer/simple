import { API_BASE } from '@simple/config';
import { apiRequest } from '@simple/utils';

export type TikTokAccountView = {
    id: string;
    vertical: 'propiedades';
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

export async function fetchTikTokIntegrationStatus(): Promise<TikTokIntegrationStatus | null> {
    const { data } = await apiRequest<TikTokIntegrationStatus & { ok: boolean }>(
        '/api/integrations/tiktok?vertical=propiedades',
        { method: 'GET' },
    );
    return data?.ok ? data : null;
}

export function buildTikTokConnectUrl(returnTo: string): string {
    return `${API_BASE}/api/integrations/tiktok/connect?vertical=propiedades&returnTo=${encodeURIComponent(returnTo)}`;
}

export async function disconnectTikTok(): Promise<{ ok: boolean; error?: string }> {
    const { status, data } = await apiRequest<{ ok: boolean; error?: string }>(
        '/api/integrations/tiktok/disconnect',
        {
            method: 'POST',
            body: JSON.stringify({ vertical: 'propiedades' }),
        },
    );

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return data ?? { ok: false, error: 'No pudimos desconectar TikTok.' };
}
