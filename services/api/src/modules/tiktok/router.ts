import { Hono } from 'hono';
import type { Context } from 'hono';
import {
    buildTikTokAuthorizationUrl,
    exchangeTikTokCode,
    fetchTikTokUserProfile,
    isTikTokConfigured,
} from './service.js';
import {
    consumeIntegrationOAuthCookie,
    setIntegrationOAuthCookie,
} from '../integrations/oauth-cookie.js';
import { getIntegrationFallbackReturn, resolveInstagramOAuthState, decodeOAuthStateParam, finalizeIntegrationReturnUrl, resolveIntegrationRequestHost } from '../integrations/app-origin.js';
import { makeInstagramStatePayload, parseInstagramStatePayload } from '../instagram/oauth-state.js';
import { isSocialIntegrationAccessError } from '../integrations/social-write-access.js';
import { canManageAccountRole } from '../accounts/permissions.js';

export interface TikTokRouterDeps {
    authUser: (c: Context) => Promise<{ id: string; role?: string } | null>;
    parseVertical: (v: string | undefined) => import('@simple/types').VerticalType;
    asString: (v: unknown) => string;
    resolveBrowserOrigin: (c: Context) => string | null;
    userCanUseInstagram: (user: { id: string; role?: string }, vertical: import('@simple/types').VerticalType, accountId?: string | null) => boolean;
    getEffectivePlanId: (user: { id: string; role?: string }, vertical: import('@simple/types').VerticalType, accountId?: string | null) => string;
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>;
    getAccountMembershipFromDb?: (userId: string, accountId?: string) => Promise<{ accountId: string; role: string } | null>;
    canManageIntegration: (userId: string, accountId: string | null) => boolean;
    getInstagramRequiredPlanIds: () => string[];
    getTikTokAccount: (userId: string, vertical: import('@simple/types').VerticalType, accountId?: string | null) => unknown;
    tiktokAccountToResponse: (account: unknown) => unknown;
    sanitizeBrowserReturnUrl: (url: string, fallback: string) => string;
    randomBytes: (size: number) => Buffer;
    defaultOrigin: string;
    safeEqualStrings: (a: string, b: string) => boolean;
    getUserById: (id: string) => Promise<{ id: string } | null>;
    canAuthenticateUser: (user: { id: string }) => boolean;
    upsertTikTokAccountRecord: (input: Record<string, unknown>) => Promise<unknown>;
    disconnectTikTokAccount: (userId: string, vertical: import('@simple/types').VerticalType, accountId?: string | null) => Promise<void>;
    tiktokStateCookie: string;
    authCookieSameSite: 'Lax' | 'Strict' | 'None';
    authCookieSecure: boolean;
}

export function createTikTokRouter(deps: TikTokRouterDeps) {
    const app = new Hono();

    async function getCurrentAccountId(userId: string) {
        if (deps.getAccountMembershipFromDb) {
            return (await deps.getAccountMembershipFromDb(userId))?.accountId ?? null;
        }
        return deps.getPrimaryAccountIdForUser(userId);
    }

    async function canManageCurrentIntegration(userId: string, accountId: string | null) {
        if (deps.getAccountMembershipFromDb) {
            if (!accountId) return false;
            return canManageAccountRole((await deps.getAccountMembershipFromDb(userId, accountId))?.role);
        }
        return deps.canManageIntegration(userId, accountId);
    }

    app.get('/', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = deps.parseVertical(c.req.query('vertical'));
        const accountId = await getCurrentAccountId(user.id);
        const canManageIntegration = await canManageCurrentIntegration(user.id, accountId);
        const origin = deps.resolveBrowserOrigin(c);
        const fallbackReturn = origin ? `${origin}/panel/mi-cuenta/integraciones` : null;

        return c.json({
            ok: true,
            vertical,
            configured: isTikTokConfigured(),
            eligible: deps.userCanUseInstagram(user, vertical, accountId),
            currentPlanId: deps.getEffectivePlanId(user, vertical, accountId),
            requiredPlanIds: deps.getInstagramRequiredPlanIds(),
            canManageIntegration,
            connectUrl: fallbackReturn && canManageIntegration && deps.userCanUseInstagram(user, vertical, accountId)
                ? `/api/integrations/tiktok/connect?vertical=${encodeURIComponent(vertical)}&returnTo=${encodeURIComponent(fallbackReturn)}`
                : null,
            account: deps.tiktokAccountToResponse(deps.getTikTokAccount(user.id, vertical, accountId)),
        });
    });

    app.get('/connect', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);
        const vertical = deps.parseVertical(c.req.query('vertical'));
        const accountId = await getCurrentAccountId(user.id);
        if (!await canManageCurrentIntegration(user.id, accountId)) {
            return c.json({ ok: false, error: 'Solo quien administra este espacio puede conectar TikTok.' }, 403);
        }
        if (!deps.userCanUseInstagram(user, vertical, accountId)) {
            return c.json({ ok: false, error: 'TikTok está disponible solo para planes Pro y Empresa.' }, 403);
        }
        if (!isTikTokConfigured()) {
            return c.json({ ok: false, error: 'TikTok no está configurado en este entorno.' }, 503);
        }

        const nonce = deps.randomBytes(24).toString('hex');
        const statePayload = makeInstagramStatePayload({
            nonce,
            userId: user.id,
            accountId,
            vertical,
        });
        setIntegrationOAuthCookie(c, deps.tiktokStateCookie, statePayload, { sameSite: deps.authCookieSameSite, secure: deps.authCookieSecure });

        return c.redirect(buildTikTokAuthorizationUrl({ state: statePayload }));
    });

    app.get('/callback', async (c) => {
        const requestHost = resolveIntegrationRequestHost({
            host: c.req.header('host'),
            forwardedHost: c.req.header('x-forwarded-host'),
        });
        const stateParam = decodeOAuthStateParam(deps.asString(c.req.query('state')));
        const parseState = (raw: string) => parseInstagramStatePayload(raw, {
            asString: deps.asString,
            parseVertical: deps.parseVertical,
        });
        const statePayload = resolveInstagramOAuthState(
            stateParam,
            consumeIntegrationOAuthCookie(c, deps.tiktokStateCookie),
            parseState,
            deps.safeEqualStrings,
        );
        const vertical = statePayload?.vertical ?? 'autos';
        const returnTo = finalizeIntegrationReturnUrl(
            statePayload?.returnTo ?? getIntegrationFallbackReturn(vertical),
            vertical,
            requestHost,
        );

        const redirectWithStatus = (status: 'connected' | 'error', message?: string) => {
            const target = new URL(returnTo);
            target.searchParams.set('tiktok', status);
            if (message) target.searchParams.set('tiktokMessage', message);
            return c.redirect(target.toString());
        };

        const code = deps.asString(c.req.query('code'));
        const errorReason = deps.asString(c.req.query('error_description')) || deps.asString(c.req.query('error'));

        if (errorReason) return redirectWithStatus('error', errorReason);
        if (!statePayload) {
            return redirectWithStatus('error', 'La sesión de conexión con TikTok expiró. Intenta nuevamente.');
        }
        if (!code) return redirectWithStatus('error', 'TikTok no devolvió un código de autorización válido.');

        const user = await deps.getUserById(statePayload.userId);
        if (!user || !deps.canAuthenticateUser(user)) {
            return redirectWithStatus('error', 'No pudimos validar tu sesión para conectar TikTok.');
        }
        const accountId = statePayload.accountId ?? await getCurrentAccountId(user.id);
        if (!accountId || !await canManageCurrentIntegration(user.id, accountId)) {
            return redirectWithStatus('error', 'Solo quien administra este espacio puede conectar TikTok.');
        }
        if (!deps.userCanUseInstagram(user, statePayload.vertical, accountId)) {
            return redirectWithStatus('error', 'TikTok no está habilitado para el plan de este espacio.');
        }

        try {
            const exchanged = await exchangeTikTokCode(code);
            const profile = await fetchTikTokUserProfile(exchanged.accessToken);
            await deps.upsertTikTokAccountRecord({
                userId: user.id,
                accountId,
                vertical: statePayload.vertical,
                openId: profile.openId || exchanged.openId,
                username: profile.username,
                displayName: profile.displayName,
                avatarUrl: profile.avatarUrl,
                accessToken: exchanged.accessToken,
                refreshToken: exchanged.refreshToken,
                tokenExpiresAt: exchanged.expiresInSeconds ? Date.now() + exchanged.expiresInSeconds * 1000 : null,
                scopes: exchanged.scopes,
                status: 'connected',
                lastSyncedAt: Date.now(),
                lastError: null,
            });
            return redirectWithStatus('connected', `Cuenta @${profile.username} conectada correctamente.`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo conectar con TikTok.';
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
        const accountId = await getCurrentAccountId(user.id);
        if (!await canManageCurrentIntegration(user.id, accountId)) {
            return c.json({ ok: false, error: 'Solo quien administra este espacio puede desconectar TikTok.' }, 403);
        }
        try {
            await deps.disconnectTikTokAccount(user.id, vertical, accountId);
        } catch (error) {
            if (isSocialIntegrationAccessError(error)) {
                return c.json({ ok: false, error: error.message }, 403);
            }
            throw error;
        }
        return c.json({ ok: true });
    });

    return app;
}
