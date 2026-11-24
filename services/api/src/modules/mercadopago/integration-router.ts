import { Hono } from 'hono';
import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { isAllowedBrowserOrigin } from '../../lib/cors.js';
import { canManageAccountRole } from '../accounts/permissions.js';
import { isSocialIntegrationAccessError } from '../integrations/social-write-access.js';
import {
    consumeIntegrationOAuthCookie,
    setIntegrationOAuthCookie,
} from '../integrations/oauth-cookie.js';
import {
    buildMercadoPagoOperatorAuthorizationUrl,
    exchangeMercadoPagoOperatorOAuthCode,
    getMercadoPagoOperatorAppOrigin,
    isMercadoPagoOperatorOAuthConfigured,
    MercadoPagoOperatorOAuthError,
} from './operator-oauth.js';
import {
    disconnectMercadoPagoOperator,
    getMercadoPagoOperatorStatus,
    saveMercadoPagoOperatorTokens,
    userHasMercadoPagoOperatorTarget,
} from './operator-store.js';
import {
    createMercadoPagoOAuthAttempt,
    parseMercadoPagoOperatorVertical,
    readMercadoPagoOAuthAttempt,
    verifyMercadoPagoOAuthState,
    type MercadoPagoOperatorVertical,
} from './oauth-state.js';

export const MERCADOPAGO_STATE_COOKIE = 'mp_oauth_state';
const MERCADOPAGO_COMPLETE_PATH = '/api/integrations/mercadopago/complete';

export type MercadoPagoIntegrationRouterDeps = {
    authUser: (c: Context) => Promise<{ id: string; role?: string } | null>;
    asString: (value: unknown) => string;
    resolveBrowserOrigin: (c: Context) => string | null;
    sanitizeBrowserReturnUrl: (url: string, fallback: string) => string;
    randomBytes: (size: number) => Buffer;
    sessionSecret: string;
    userCanConnectMercadoPago: (user: { id: string; role?: string }, vertical: MercadoPagoOperatorVertical, accountId?: string | null) => boolean | Promise<boolean>;
    getCurrentPlanId: (user: { id: string; role?: string }, vertical: MercadoPagoOperatorVertical, accountId?: string | null) => string | Promise<string>;
    getPrimaryAccountIdForUser: (userId: string) => Promise<string | null>;
    getAccountMembershipsForUser: (userId: string) => any[];
    getAccountMembershipFromDb?: (userId: string, accountId?: string) => Promise<{ accountId: string; role: string } | null>;
    ensureMercadoPagoOperatorTarget?: (userId: string, vertical: MercadoPagoOperatorVertical, accountId?: string | null) => Promise<void>;
    onMercadoPagoOperatorConnected?: (userId: string, vertical: MercadoPagoOperatorVertical, accountId?: string | null) => Promise<void>;
    authCookieSameSite: 'Lax' | 'Strict' | 'None';
    authCookieSecure: boolean;
};

function parseVerticalQuery(raw: string | undefined): MercadoPagoOperatorVertical | null {
    return parseMercadoPagoOperatorVertical(raw);
}

export function createMercadoPagoIntegrationRouter(deps: MercadoPagoIntegrationRouterDeps) {
    const app = new Hono();

    async function getCurrentAccountId(userId: string) {
        if (deps.getAccountMembershipFromDb) {
            return (await deps.getAccountMembershipFromDb(userId))?.accountId ?? null;
        }
        return deps.getPrimaryAccountIdForUser(userId);
    }

    async function canManageIntegration(
        user: { id: string; role?: string },
        vertical: MercadoPagoOperatorVertical,
        accountId: string | null,
    ): Promise<boolean> {
        if (vertical !== 'autos' && vertical !== 'propiedades') return true;
        if (!accountId) return false;
        const membership = deps.getAccountMembershipFromDb
            ? await deps.getAccountMembershipFromDb(user.id, accountId)
            : deps.getAccountMembershipsForUser(user.id).find((item: any) => item.accountId === accountId);
        return canManageAccountRole(membership?.role);
    }

    app.get('/', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVerticalQuery(deps.asString(c.req.query('vertical')));
        if (!vertical) return c.json({ ok: false, error: 'Vertical no soportada' }, 400);

        const accountId = await getCurrentAccountId(user.id);
        const origin = deps.resolveBrowserOrigin(c);
        const fallbackReturn = origin ? `${origin}/panel/mi-cuenta/integraciones` : null;
        const status = await getMercadoPagoOperatorStatus(user.id, vertical, accountId);
        const eligible = await deps.userCanConnectMercadoPago(user, vertical, accountId);
        const hasTarget = await userHasMercadoPagoOperatorTarget(user.id, vertical, accountId);
        const canManage = await canManageIntegration(user, vertical, accountId);

        return c.json({
            ok: true,
            vertical,
            configured: isMercadoPagoOperatorOAuthConfigured(),
            eligible,
            canManageIntegration: canManage,
            hasTarget,
            currentPlanId: await deps.getCurrentPlanId(user, vertical, accountId),
            connected: status.connected,
            userId: canManage ? status.userId : null,
            connectUrl: canManage && fallbackReturn
                ? `/api/integrations/mercadopago/connect?vertical=${encodeURIComponent(vertical)}&returnTo=${encodeURIComponent(fallbackReturn)}`
                : null,
        });
    });

    app.get('/connect', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVerticalQuery(deps.asString(c.req.query('vertical')));
        if (!vertical) return c.json({ ok: false, error: 'Vertical no soportada' }, 400);

        const accountId = await getCurrentAccountId(user.id);
        if (!await canManageIntegration(user, vertical, accountId)) {
            return c.json({ ok: false, error: 'Solo dueños y administradores pueden conectar MercadoPago para este espacio.' }, 403);
        }
        const eligible = await deps.userCanConnectMercadoPago(user, vertical, accountId);
        if (!eligible) {
            const origin = deps.resolveBrowserOrigin(c) ?? getMercadoPagoOperatorAppOrigin(vertical);
            const target = new URL(`${origin}/panel/mi-cuenta/integraciones`);
            target.searchParams.set('mp', 'upgrade');
            return c.redirect(target.toString());
        }

        if (!isMercadoPagoOperatorOAuthConfigured()) {
            return c.json({ ok: false, error: 'MercadoPago no está configurado en este entorno.' }, 503);
        }

        if (deps.ensureMercadoPagoOperatorTarget) {
            await deps.ensureMercadoPagoOperatorTarget(user.id, vertical, accountId);
        }

        const hasTarget = await userHasMercadoPagoOperatorTarget(user.id, vertical, accountId);
        if (!hasTarget) {
            return c.json({ ok: false, error: 'Completa tu perfil de negocio antes de conectar MercadoPago.' }, 400);
        }

        const origin = deps.resolveBrowserOrigin(c);
        if (!origin) return c.json({ ok: false, error: 'Origin no autorizado' }, 403);

        const fallbackReturn = `${origin}/panel/mi-cuenta/integraciones`;
        const returnTo = deps.sanitizeBrowserReturnUrl(
            deps.asString(c.req.query('returnTo')) || fallbackReturn,
            fallbackReturn,
        );
        const { cookie, state } = createMercadoPagoOAuthAttempt(deps.sessionSecret, origin, {
            nonce: deps.randomBytes(24).toString('hex'),
            userId: user.id,
            vertical,
            returnTo,
            accountId: vertical === 'serenatas' ? null : accountId,
        });
        setIntegrationOAuthCookie(
            c,
            MERCADOPAGO_STATE_COOKIE,
            cookie,
            { sameSite: deps.authCookieSameSite, secure: deps.authCookieSecure },
        );

        c.header('Cache-Control', 'no-store');
        return c.redirect(buildMercadoPagoOperatorAuthorizationUrl(state));
    });

    // The panel's same-origin proxy owns its cookies. Mercado Pago returns to the
    // shared API host, which relays the result back to the browser that started it.
    async function handleOAuthReturn(c: Context, relayToPanel: boolean) {
        c.header('Cache-Control', 'no-store');
        c.header('Referrer-Policy', 'no-referrer');

        const stateValue = deps.asString(c.req.query('state'));
        const verified = verifyMercadoPagoOAuthState(deps.sessionSecret, stateValue);
        const state = verified && isAllowedBrowserOrigin(verified.origin) ? verified : null;
        const attempt = readMercadoPagoOAuthAttempt(state, getCookie(c, MERCADOPAGO_STATE_COOKIE));
        const code = deps.asString(c.req.query('code'));
        const providerError = Boolean(c.req.query('error') || c.req.query('error_description'));

        if (relayToPanel && state && !attempt) {
            const target = new URL(MERCADOPAGO_COMPLETE_PATH, state.origin);
            target.searchParams.set('state', stateValue);
            if (providerError) target.searchParams.set('error', 'access_denied');
            else if (code) target.searchParams.set('code', code);
            return c.redirect(target.toString());
        }

        const vertical = attempt?.vertical ?? state?.vertical ?? 'agenda';
        const fallbackOrigin = state?.origin ?? getMercadoPagoOperatorAppOrigin(vertical);
        const fallbackReturn = new URL('/panel/mi-cuenta/integraciones', fallbackOrigin).toString();
        const returnTo = attempt?.returnTo ?? fallbackReturn;

        const redirectWithStatus = (status: 'connected' | 'error' | 'upgrade', message?: string) => {
            const target = new URL(deps.sanitizeBrowserReturnUrl(returnTo, fallbackReturn));
            target.searchParams.set('mp', status);
            if (message) target.searchParams.set('mpMessage', message);
            return c.redirect(target.toString());
        };

        if (!attempt) {
            return redirectWithStatus('error', 'La sesión de conexión con MercadoPago expiró. Intenta nuevamente.');
        }
        consumeIntegrationOAuthCookie(c, MERCADOPAGO_STATE_COOKIE);
        if (providerError) return redirectWithStatus('error', 'Mercado Pago no autorizó la conexión. Intenta nuevamente.');
        if (!code) return redirectWithStatus('error', 'MercadoPago no devolvió un código de autorización válido.');

        const user = await deps.authUser(c);
        if (!user || user.id !== attempt.userId) {
            return redirectWithStatus('error', 'No pudimos validar tu sesión para conectar MercadoPago.');
        }
        if (attempt.accountId && !(deps.getAccountMembershipFromDb
            ? await deps.getAccountMembershipFromDb(user.id, attempt.accountId)
            : deps.getAccountMembershipsForUser(user.id).some((membership) => membership.accountId === attempt.accountId))) {
            return redirectWithStatus('error', 'Ya no tienes acceso al espacio desde el que iniciaste la conexión.');
        }
        if (!await canManageIntegration(user, vertical, attempt.accountId)) {
            return redirectWithStatus('error', 'Solo dueños y administradores pueden conectar MercadoPago para este espacio.');
        }

        const eligible = await deps.userCanConnectMercadoPago(user, vertical, attempt.accountId);
        if (!eligible) return redirectWithStatus('upgrade');

        try {
            const tokens = await exchangeMercadoPagoOperatorOAuthCode(code);
            await saveMercadoPagoOperatorTokens(user.id, vertical, tokens, attempt.accountId);
            if (deps.onMercadoPagoOperatorConnected) {
                try {
                    await deps.onMercadoPagoOperatorConnected(user.id, vertical, attempt.accountId);
                } catch (error) {
                    console.warn('[mercadopago] OAuth connected, but workspace cache refresh failed', {
                        vertical,
                        errorType: error instanceof Error ? error.name : 'UnknownError',
                    });
                }
            }
            return redirectWithStatus('connected', 'MercadoPago conectado correctamente.');
        } catch (error) {
            const message = error instanceof MercadoPagoOperatorOAuthError || isSocialIntegrationAccessError(error)
                ? error.message
                : 'No pudimos guardar la conexión con Mercado Pago. Inténtalo nuevamente; si el problema continúa, contacta a soporte.';
            if (!(error instanceof MercadoPagoOperatorOAuthError) && !isSocialIntegrationAccessError(error)) {
                console.error('[mercadopago] OAuth token save failed', {
                    vertical,
                    errorType: error instanceof Error ? error.name : 'UnknownError',
                });
            }
            return redirectWithStatus('error', message);
        }
    }

    app.get('/callback', (c) => handleOAuthReturn(c, true));
    app.get('/complete', (c) => handleOAuthReturn(c, false));

    app.post('/disconnect', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const payload = await c.req.json().catch(() => null);
        const verticalRaw = payload && typeof payload === 'object'
            ? deps.asString((payload as Record<string, unknown>).vertical)
            : '';
        const vertical = parseVerticalQuery(verticalRaw || deps.asString(c.req.query('vertical')));
        if (!vertical) return c.json({ ok: false, error: 'Vertical no soportada' }, 400);

        const accountId = await getCurrentAccountId(user.id);
        if (!await canManageIntegration(user, vertical, accountId)) {
            return c.json({ ok: false, error: 'Solo dueños y administradores pueden desconectar MercadoPago para este espacio.' }, 403);
        }
        try {
            await disconnectMercadoPagoOperator(user.id, vertical, accountId);
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
