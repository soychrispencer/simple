// @vitest-environment jsdom
import { StrictMode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ConfirmEmailPage } from './confirm-email-page';

const refreshSession = vi.hoisted(() => vi.fn().mockResolvedValue(null));
vi.mock('./auth-context', () => ({ useAuth: () => ({ refreshSession }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@simple/config', () => ({ API_BASE: '', getSimpleAppBrand: () => ({ name: 'SimpleAgenda' }) }));
vi.mock('@simple/ui/brand', () => ({ BrandLogo: () => null }));
vi.mock('@simple/ui/panel', () => ({
    PanelButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    PanelNotice: ({ children }: any) => <div>{children}</div>,
}));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

it('confirms a single-use token only once during Strict Mode effect replay', async () => {
    window.history.replaceState({}, '', '/auth/confirmar-correo?token=test-token');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<StrictMode><ConfirmEmailPage appId="simpleagenda" /></StrictMode>);
    await waitFor(() => expect(screen.getByText('Correo confirmado')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(refreshSession).toHaveBeenCalledTimes(1);
});

it('explains recovery for an expired token', async () => {
    window.history.replaceState({}, '', '/auth/confirmar-correo?token=expired-token');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Enlace expirado' }) }));
    render(<ConfirmEmailPage appId="simpleagenda" />);
    await waitFor(() => expect(screen.getByText('Enlace expirado')).toBeTruthy());
    expect(screen.getByText(/mensaje más reciente/)).toBeTruthy();
    expect(refreshSession).not.toHaveBeenCalled();
});
