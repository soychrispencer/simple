import { API_BASE } from '@simple/config';
import { apiRequest } from '@simple/utils';

export type YouTubeAccountView = {
    id: string;
    vertical: 'autos';
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

export async function fetchYouTubeIntegrationStatus(): Promise<YouTubeIntegrationStatus | null> {
    const { data } = await apiRequest<YouTubeIntegrationStatus & { ok: boolean }>(
        '/api/integrations/youtube?vertical=autos',
        { method: 'GET' },
    );
    return data?.ok ? data : null;
}

export function buildYouTubeConnectUrl(returnTo: string): string {
    return `${API_BASE}/api/integrations/youtube/connect?vertical=autos&returnTo=${encodeURIComponent(returnTo)}`;
}

export async function disconnectYouTube(): Promise<{ ok: boolean; error?: string }> {
    const { status, data } = await apiRequest<{ ok: boolean; error?: string }>(
        '/api/integrations/youtube/disconnect',
        {
            method: 'POST',
            body: JSON.stringify({ vertical: 'autos' }),
        },
    );

    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return data ?? { ok: false, error: 'No pudimos desconectar YouTube.' };
}
