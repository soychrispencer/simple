import { API_BASE } from '@simple/config';
import { apiFetch } from './api-client.js';

export type MercadoPagoIntegrationVertical = 'agenda' | 'autos' | 'propiedades' | 'serenatas';

export type MercadoPagoIntegrationStatus = {
    ok?: boolean;
    vertical: MercadoPagoIntegrationVertical;
    configured: boolean;
    eligible: boolean;
    hasTarget: boolean;
    currentPlanId: string;
    connected: boolean;
    userId: string | null;
    connectUrl: string | null;
    error?: string;
};

export async function fetchMercadoPagoIntegrationStatus(
    vertical: MercadoPagoIntegrationVertical,
): Promise<MercadoPagoIntegrationStatus | null> {
    const { data } = await apiFetch<MercadoPagoIntegrationStatus & { ok: boolean }>(
        `/api/integrations/mercadopago?vertical=${encodeURIComponent(vertical)}`,
        { method: 'GET' },
    );
    return data?.ok ? data : null;
}

export function buildMercadoPagoConnectUrl(
    vertical: MercadoPagoIntegrationVertical,
    returnTo: string,
): string {
    return `${API_BASE}/api/integrations/mercadopago/connect?vertical=${encodeURIComponent(vertical)}&returnTo=${encodeURIComponent(returnTo)}`;
}

export async function disconnectMercadoPagoIntegration(
    vertical: MercadoPagoIntegrationVertical,
): Promise<{ ok: boolean; error?: string }> {
    const { status, data } = await apiFetch<{ ok: boolean; error?: string }>(
        '/api/integrations/mercadopago/disconnect',
        {
            method: 'POST',
            body: JSON.stringify({ vertical }),
        },
    );
    if (status === 401) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    return data ?? { ok: false, error: 'No pudimos desconectar MercadoPago.' };
}
