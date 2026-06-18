import { Hono } from 'hono';
import type { Context } from 'hono';
import {
    buildYouTubeAuthorizationUrl,
    exchangeYouTubeCode,
    fetchYouTubeChannelProfile,
    isYouTubeConfigured,
} from './service.js';
import {
    consumeIntegrationOAuthCookie,
    setIntegrationOAuthCookie,
} from '../integrations/oauth-cookie.js';
import { makeInstagramStatePayload, parseInstagramStatePayload } from '../instagram/oauth-state.js';

export interface YouTubeRouterDeps {
    authUser: (c: Context) => Promise<{ id: string; role?: string } | null>;
    parseVertical: (v: string | undefined) => import('@simple/types').VerticalType;
    asString: (v: unknown) => string;
    resolveBrowserOrigin: (c: Context) => string | null;
    userCanUseInstagram: (user: { id: string; role?: string }, vertical: import('@simple/types').VerticalType) => boolean;
    getEffectivePlanId: (user: { id: string; role?: string }, vertical: import('@simple/types').VerticalType) => string;
    getInstagramRequiredPlanIds: () => string[];
    getYouTubeAccount: (userId: string, vertical: import('@simple/types').VerticalType) => unknown;
    youtubeAccountToResponse: (account: unknown) => unknown;
    sanitizeBrowserReturnUrl: (url: string, fallback: string) => string;
    randomBytes: (size: number) => Buffer;
    defaultOrigin: string;
    safeEqualStrings: (a: string, b: string) => boolean;
    getUserById: (id: string) => Promise<{ id: string } | null>;
    canAuthenticateUser: (user: { id: string }) => boolean;
    upsertYouTubeAccountRecord: (input: Record<string, unknown>) => Promise<unknown>;
    disconnectYouTubeAccount: (userId: string, vertical: import('@simple/types').VerticalType) => Promise<void>;
    youtubeStateCookie: string;
    authCookieSameSite: 'Lax' | 'Strict' | 'None';
    authCookieSecure: boolean;
}

export function createYouTubeRouter(deps: YouTubeRouterDeps) {
    const app = new Hono();

    app.get('/', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        const origin = deps.resolveBrowserOrigin(c);
        const fallbackReturn = origin ? `${origin}/panel/mi-cuenta/integraciones` : null;

        return c.json({
            ok: true,
            vertical,
            configured: isYouTubeConfigured(),
            eligible: deps.userCanUseInstagram(user, vertical),
            currentPlanId: deps.getEffectivePlanId(user, vertical),
            requiredPlanIds: deps.getInstagramRequiredPlanIds(),
            connectUrl: fallbackReturn
                ? `/api/integrations/youtube/connect?vertical=${encodeURIComponent(vertical)}&returnTo=${encodeURIComponent(fallbackReturn)}`
                : null,
            account: deps.youtubeAccountToResponse(deps.getYouTubeAccount(user.id, vertical)),
        });
    });

    app.get('/connect', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const vertical = deps.parseVertical(c.req.query('vertical'));
        if (!deps.userCanUseInstagram(user, vertical)) {
            return c.json({ ok: false, error: 'YouTube está disponible solo para planes Pro y Empresa.' }, 403);
        }
        if (!isYouTubeConfigured()) {
            return c.json({ ok: false, error: 'YouTube no está configurado en este entorno.' }, 503);
        }

        const origin = deps.resolveBrowserOrigin(c);
        if (!origin) return c.json({ ok: false, error: 'Origin no autorizado' }, 403);

        const fallbackReturn = `${origin}/panel/mi-cuenta/integraciones`;
        const returnTo = deps.sanitizeBrowserReturnUrl(deps.asString(c.req.query('returnTo')) || fallbackReturn, fallbackReturn);
        const nonce = deps.randomBytes(24).toString('hex');
        setIntegrationOAuthCookie(c, deps.youtubeStateCookie, makeInstagramStatePayload({
            nonce,
            userId: user.id,
            vertical,
            returnTo,
        }), { sameSite: deps.authCookieSameSite, secure: deps.authCookieSecure });

        return c.redirect(buildYouTubeAuthorizationUrl({ state: nonce }));
    });

    app.get('/callback', async (c) => {
        const statePayload = parseInstagramStatePayload(consumeIntegrationOAuthCookie(c, deps.youtubeStateCookie), {
            asString: deps.asString,
            parseVertical: deps.parseVertical,
        });
        const fallbackReturn = `${deps.defaultOrigin}/panel/mi-cuenta/integraciones`;
        const returnTo = statePayload?.returnTo || fallbackReturn;

        const redirectWithStatus = (status: 'connected' | 'error', message?: string) => {
            const target = new URL(deps.sanitizeBrowserReturnUrl(returnTo, fallbackReturn));
            target.searchParams.set('youtube', status);
            if (message) target.searchParams.set('youtubeMessage', message);
            return c.redirect(target.toString());
        };

        const code = deps.asString(c.req.query('code'));
        const state = deps.asString(c.req.query('state'));
        const errorReason = deps.asString(c.req.query('error_description')) || deps.asString(c.req.query('error'));

        if (errorReason) return redirectWithStatus('error', errorReason);
        if (!statePayload || !state || !deps.safeEqualStrings(statePayload.nonce, state)) {
            return redirectWithStatus('error', 'La sesión de conexión con YouTube expiró. Intenta nuevamente.');
        }
        if (!code) return redirectWithStatus('error', 'YouTube no devolvió un código de autorización válido.');

        const user = await deps.getUserById(statePayload.userId);
        if (!user || !deps.canAuthenticateUser(user)) {
            return redirectWithStatus('error', 'No pudimos validar tu sesión para conectar YouTube.');
        }

        try {
            const exchanged = await exchangeYouTubeCode(code);
            const profile = await fetchYouTubeChannelProfile(exchanged.accessToken);
            await deps.upsertYouTubeAccountRecord({
                userId: user.id,
                vertical: statePayload.vertical,
                channelId: profile.channelId,
                channelTitle: profile.channelTitle,
                channelHandle: profile.channelHandle,
                avatarUrl: profile.avatarUrl,
                accessToken: exchanged.accessToken,
                refreshToken: exchanged.refreshToken,
                tokenExpiresAt: exchanged.expiresInSeconds ? Date.now() + exchanged.expiresInSeconds * 1000 : null,
                scopes: exchanged.scopes,
                status: 'connected',
                lastSyncedAt: Date.now(),
                lastError: null,
            });
            return redirectWithStatus('connected', `Canal ${profile.channelTitle} conectado correctamente.`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo conectar con YouTube.';
            return redirectWithStatus('error', message);
        }
    });

    app.post('/disconnect', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const payload = await c.req.json().catch(() => null);
        const verticalRaw = payload && typeof payload === 'object'
            ? deps.asString((payload as Record<string, unknown>).vertical)
            : '';
        const vertical = deps.parseVertical(verticalRaw || c.req.query('vertical'));
        await deps.disconnectYouTubeAccount(user.id, vertical);
        return c.json({ ok: true });
    });

    return app;
}
