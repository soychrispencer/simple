import { randomBytes } from 'node:crypto';
import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMercadoPagoIntegrationRouter } from './integration-router.js';
import { exchangeMercadoPagoOperatorOAuthCode } from './operator-oauth.js';
import { saveMercadoPagoOperatorTokens } from './operator-store.js';

vi.mock('./operator-store.js', () => ({
    disconnectMercadoPagoOperator: vi.fn(),
    getMercadoPagoOperatorStatus: vi.fn(),
    saveMercadoPagoOperatorTokens: vi.fn(),
    userHasMercadoPagoOperatorTarget: vi.fn(async () => true),
}));

vi.mock('./operator-oauth.js', async (importOriginal) => ({
    ...await importOriginal<typeof import('./operator-oauth.js')>(),
    exchangeMercadoPagoOperatorOAuthCode: vi.fn(),
}));

const INTEGRATION_PATH = '/api/integrations/mercadopago';
const PANEL_ORIGIN = 'https://simpleagenda.app';
const PANEL_PAGE = `${PANEL_ORIGIN}/panel/mi-cuenta/integraciones`;
const CALLBACK_URL = `https://api.simpleplataforma.app${INTEGRATION_PATH}/callback`;
const SESSION_COOKIE = 'test_session=editor';
const TOKENS = { accessToken: 'token', publicKey: null, userId: 'merchant', refreshToken: 'refresh' };

function createTestApi() {
    let activeAccountId = 'workspace-at-start';
    const app = new Hono();
    app.route(INTEGRATION_PATH, createMercadoPagoIntegrationRouter({
        authUser: async (c) => getCookie(c, 'test_session') === 'editor' ? { id: 'editor' } : null,
        asString: (value) => typeof value === 'string' ? value : '',
        resolveBrowserOrigin: () => PANEL_ORIGIN,
        sanitizeBrowserReturnUrl: (url) => url,
        randomBytes,
        sessionSecret: 'test-state-signing-secret',
        userCanConnectMercadoPago: async () => true,
        getCurrentPlanId: async () => 'pro',
        getPrimaryAccountIdForUser: async () => activeAccountId,
        getAccountMembershipsForUser: () => [],
        getAccountMembershipFromDb: async (_userId, accountId) => ({
            accountId: accountId ?? activeAccountId,
            role: 'owner',
        }),
        authCookieSameSite: 'None',
        authCookieSecure: true,
    }));
    return {
        app,
        selectOtherWorkspace: () => { activeAccountId = 'different-workspace'; },
    };
}

async function beginConnection(app: Hono) {
    const url = new URL(`${INTEGRATION_PATH}/connect`, PANEL_ORIGIN);
    url.searchParams.set('vertical', 'agenda');
    url.searchParams.set('returnTo', PANEL_PAGE);
    const response = await app.request(url.href, { headers: { Cookie: SESSION_COOKIE } });
    expect(response.status).toBe(302);
    const authorization = new URL(response.headers.get('Location')!);
    expect(authorization.searchParams.get('redirect_uri')).toBe(CALLBACK_URL);
    const cookie = response.headers.get('Set-Cookie')!.split(';', 1)[0];
    return { cookie, state: authorization.searchParams.get('state')! };
}

describe('Mercado Pago OAuth across the API and panel domains', () => {
    beforeEach(() => {
        vi.stubEnv('MP_OPERATOR_APP_ID', 'test-app-id');
        vi.stubEnv('MP_OPERATOR_APP_SECRET', 'test-app-secret');
        vi.stubEnv('MP_OPERATOR_REDIRECT_URI', CALLBACK_URL);
        vi.mocked(exchangeMercadoPagoOperatorOAuthCode).mockResolvedValue(TOKENS);
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
    });

    it('does not send users to Mercado Pago when the app credentials are placeholders', async () => {
        vi.stubEnv('MP_OPERATOR_APP_ID', 'YOUR_MP_OPERATOR_APP_ID');
        vi.stubEnv('MP_OPERATOR_APP_SECRET', 'YOUR_MP_OPERATOR_APP_SECRET');
        vi.stubEnv('MP_AGENDA_APP_ID', 'YOUR_MP_AGENDA_APP_ID');
        vi.stubEnv('MP_AGENDA_APP_SECRET', 'YOUR_MP_AGENDA_APP_SECRET');

        const { app } = createTestApi();
        const response = await app.request(
            `${INTEGRATION_PATH}/connect?vertical=agenda&returnTo=${encodeURIComponent(PANEL_PAGE)}`,
            { headers: { Cookie: SESSION_COOKIE } },
        );

        expect(response.status).toBe(503);
        expect(response.headers.get('Location')).toBeNull();
        expect(response.headers.get('Set-Cookie')).toBeNull();
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            error: 'MercadoPago no está configurado en este entorno.',
        });
    });

    it('completes from the panel that holds the browser cookies and keeps the original workspace', async () => {
        const { app, selectOtherWorkspace } = createTestApi();
        const { cookie, state } = await beginConnection(app);
        selectOtherWorkspace();
        const returned = await app.request(`${CALLBACK_URL}?code=test-code&state=${state}`);
        expect(returned.status).toBe(302);
        expect(returned.headers.get('Referrer-Policy')).toBe('no-referrer');
        const completion = new URL(returned.headers.get('Location')!);
        expect(completion.origin).toBe(PANEL_ORIGIN);
        expect(completion.pathname).toBe(`${INTEGRATION_PATH}/complete`);
        expect(exchangeMercadoPagoOperatorOAuthCode).not.toHaveBeenCalled();

        const finished = await app.request(completion.href, { headers: { Cookie: `${SESSION_COOKIE}; ${cookie}` } });
        expect(finished.status).toBe(302);
        const panel = new URL(finished.headers.get('Location')!);
        expect(panel.pathname).toBe(new URL(PANEL_PAGE).pathname);
        expect(panel.searchParams.get('mp')).toBe('connected');
        expect(panel.searchParams.has('code')).toBe(false);
        expect(exchangeMercadoPagoOperatorOAuthCode).toHaveBeenCalledOnce();
        expect(exchangeMercadoPagoOperatorOAuthCode).toHaveBeenCalledWith('test-code');
        expect(saveMercadoPagoOperatorTokens).toHaveBeenCalledWith('editor', 'agenda', TOKENS, 'workspace-at-start');
    });

    it('does not save a connection when the browser session ended before the return', async () => {
        const { app } = createTestApi();
        const { cookie, state } = await beginConnection(app);
        const returned = await app.request(`${CALLBACK_URL}?code=test-code&state=${state}`);
        const finished = await app.request(returned.headers.get('Location')!, { headers: { Cookie: cookie } });
        expect(new URL(finished.headers.get('Location')!).searchParams.get('mp')).toBe('error');
        expect(exchangeMercadoPagoOperatorOAuthCode).not.toHaveBeenCalled();
        expect(saveMercadoPagoOperatorTokens).not.toHaveBeenCalled();
    });

    it('finishes directly when the provider callback receives the cookies', async () => {
        const { app } = createTestApi();
        const { cookie, state } = await beginConnection(app);
        const finished = await app.request(`${CALLBACK_URL}?code=test-code&state=${state}`, {
            headers: { Cookie: `${SESSION_COOKIE}; ${cookie}` },
        });
        expect(new URL(finished.headers.get('Location')!).searchParams.get('mp')).toBe('connected');
        expect(saveMercadoPagoOperatorTokens).toHaveBeenCalledOnce();
    });
});
