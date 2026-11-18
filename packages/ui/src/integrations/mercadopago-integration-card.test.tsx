import { render, screen, waitFor } from '@testing-library/react';
import { fetchMercadoPagoIntegrationStatus } from '@simple/utils';
import { afterEach, expect, it, vi } from 'vitest';
import { MercadoPagoIntegrationCard } from './mercadopago-integration-card';

vi.mock('@simple/utils', () => ({
    buildMercadoPagoConnectUrl: vi.fn(),
    disconnectMercadoPagoIntegration: vi.fn(),
    fetchMercadoPagoIntegrationStatus: vi.fn(),
}));

afterEach(() => {
    window.history.replaceState(null, '', '/');
    vi.resetAllMocks();
});

it('keeps the connection error visible after loading the integration status', async () => {
    const message = 'Mercado Pago no autorizó la conexión. Intenta nuevamente.';
    const query = new URLSearchParams({ mp: 'error', mpMessage: message });
    window.history.replaceState(null, '', `/panel/mi-cuenta/integraciones?${query}`);
    vi.mocked(fetchMercadoPagoIntegrationStatus).mockResolvedValue({
        vertical: 'agenda',
        configured: true,
        eligible: true,
        canManageIntegration: true,
        hasTarget: true,
        currentPlanId: 'pro',
        connected: false,
        userId: null,
        connectUrl: null,
    });

    render(<MercadoPagoIntegrationCard vertical="agenda" />);

    await waitFor(() => expect(screen.getByRole('switch', { name: 'Conectar MercadoPago' })).toBeEnabled());
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(window.location.search).toBe('');
});
