import { API_BASE } from '@simple/config';
import { apiFetch } from './api-client.js';

export type GoogleCalendarMarketplaceVertical = 'autos' | 'propiedades';

export type GoogleCalendarIntegrationStatus = {
    ok?: boolean;
    vertical: GoogleCalendarMarketplaceVertical;
    configured: boolean;
    connected: boolean;
    calendarId: string | null;
};

export async function fetchGoogleCalendarIntegrationStatus(
    vertical: GoogleCalendarMarketplaceVertical,
): Promise<GoogleCalendarIntegrationStatus | null> {
    const { data } = await apiFetch<GoogleCalendarIntegrationStatus & { ok: boolean }>(
        `/api/integrations/google-calendar?vertical=${encodeURIComponent(vertical)}`,
        { method: 'GET' },
    );
    return data?.ok ? data : null;
}

export function buildGoogleCalendarConnectUrl(
    vertical: GoogleCalendarMarketplaceVertical,
    returnTo: string,
): string {
    return `${API_BASE}/api/integrations/google-calendar/connect?vertical=${encodeURIComponent(vertical)}&returnTo=${encodeURIComponent(returnTo)}`;
}

export async function disconnectGoogleCalendarIntegration(
    vertical: GoogleCalendarMarketplaceVertical,
): Promise<{ ok: boolean; error?: string }> {
    const { status, data } = await apiFetch<{ ok: boolean; error?: string }>(
        '/api/integrations/google-calendar/disconnect',
        {
            method: 'POST',
            body: JSON.stringify({ vertical }),
        },
    );
    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return data ?? { ok: false, error: 'No pudimos desconectar Google Calendar.' };
}
