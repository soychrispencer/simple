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
    window.history.replaceState(null, '', `/panel/mi-negocio/agenda?${query}#cobros`);
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

    await waitFor(() => expect(screen.getByRole('button', { name: 'Conectar cuenta' })).toBeEnabled());
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(window.location.search).toBe('');
});

it('shows the linked account as status with a disconnect action, not another switch', async () => {
    vi.mocked(fetchMercadoPagoIntegrationStatus).mockResolvedValue({
        vertical: 'agenda',
        configured: true,
        eligible: true,
        canManageIntegration: true,
        hasTarget: true,
        currentPlanId: 'pro',
        connected: true,
        userId: '28295773',
        connectUrl: null,
    });

    render(<MercadoPagoIntegrationCard vertical="agenda" />);

    expect(await screen.findByText('Cuenta #28295773')).toBeInTheDocument();
    expect(screen.getByText('Conectado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desconectar' })).toBeEnabled();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
});

it('shows clear guidance if Mercado Pago OAuth is not configured', async () => {
    vi.mocked(fetchMercadoPagoIntegrationStatus).mockResolvedValue({
        vertical: 'agenda',
        configured: false,
        eligible: true,
        canManageIntegration: true,
        hasTarget: true,
        currentPlanId: 'pro',
        connected: false,
        userId: null,
        connectUrl: null,
    });

    render(<MercadoPagoIntegrationCard vertical="agenda" />);

    expect(await screen.findByText(
        'No se pudo iniciar la conexión con Mercado Pago. Contacta a soporte para habilitarla.',
    )).toBeInTheDocument();
    expect(screen.queryByText(/aún no está disponible/i)).not.toBeInTheDocument();
});
