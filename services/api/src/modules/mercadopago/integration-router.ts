import { Hono } from 'hono';
import type { Context } from 'hono';
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
} from './operator-oauth.js';
import {
    disconnectMercadoPagoOperator,
    getMercadoPagoOperatorStatus,
    saveMercadoPagoOperatorTokens,
    userHasMercadoPagoOperatorTarget,
} from './operator-store.js';
import {
    makeMercadoPagoOAuthStatePayload,
    parseMercadoPagoOAuthStatePayload,
    parseMercadoPagoOperatorVertical,
    type MercadoPagoOperatorVertical,
} from './oauth-state.js';

export const MERCADOPAGO_STATE_COOKIE = 'mp_oauth_state';

export type MercadoPagoIntegrationRouterDeps = {
    authUser: (c: Context) => Promise<{ id: string; role?: string } | null>;
    asString: (value: unknown) => string;
    resolveBrowserOrigin: (c: Context) => string | null;
    sanitizeBrowserReturnUrl: (url: string, fallback: string) => string;
    randomBytes: (size: number) => Buffer;
    safeEqualStrings: (a: string, b: string) => boolean;
    getUserById: (id: string) => Promise<{ id: string } | null>;
    canAuthenticateUser: (user: { id: string }) => boolean;
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
        const nonce = deps.randomBytes(24).toString('hex');
        setIntegrationOAuthCookie(
            c,
            MERCADOPAGO_STATE_COOKIE,
            makeMercadoPagoOAuthStatePayload({
                nonce,
                userId: user.id,
                vertical,
                returnTo,
                accountId: vertical === 'serenatas' ? null : accountId,
            }),
            { sameSite: deps.authCookieSameSite, secure: deps.authCookieSecure },
        );

        return c.redirect(buildMercadoPagoOperatorAuthorizationUrl(nonce));
    });

    app.get('/callback', async (c) => {
        const statePayload = parseMercadoPagoOAuthStatePayload(
            consumeIntegrationOAuthCookie(c, MERCADOPAGO_STATE_COOKIE),
        );
        const vertical = statePayload?.vertical ?? 'agenda';
        const fallbackReturn = `${getMercadoPagoOperatorAppOrigin(vertical)}/panel/mi-cuenta/integraciones`;
        const returnTo = statePayload?.returnTo || fallbackReturn;

        const redirectWithStatus = (status: 'connected' | 'error' | 'upgrade', message?: string) => {
            const target = new URL(deps.sanitizeBrowserReturnUrl(returnTo, fallbackReturn));
            target.searchParams.set('mp', status);
            if (message) target.searchParams.set('mpMessage', message);
            return c.redirect(target.toString());
        };

        const code = deps.asString(c.req.query('code'));
        const state = deps.asString(c.req.query('state'));
        const errorReason = deps.asString(c.req.query('error_description')) || deps.asString(c.req.query('error'));

        if (errorReason) return redirectWithStatus('error', errorReason);
        if (!statePayload || !state || !deps.safeEqualStrings(statePayload.nonce, state)) {
            return redirectWithStatus('error', 'La sesión de conexión con MercadoPago expiró. Intenta nuevamente.');
        }
        if (!code) return redirectWithStatus('error', 'MercadoPago no devolvió un código de autorización válido.');

        const user = await deps.getUserById(statePayload.userId);
        if (!user || !deps.canAuthenticateUser(user)) {
            return redirectWithStatus('error', 'No pudimos validar tu sesión para conectar MercadoPago.');
        }
        if (statePayload.accountId && !(deps.getAccountMembershipFromDb
            ? await deps.getAccountMembershipFromDb(user.id, statePayload.accountId)
            : deps.getAccountMembershipsForUser(user.id).some((membership) => membership.accountId === statePayload.accountId))) {
            return redirectWithStatus('error', 'Ya no tienes acceso al espacio desde el que iniciaste la conexión.');
        }
        if (!await canManageIntegration(user, statePayload.vertical, statePayload.accountId)) {
            return redirectWithStatus('error', 'Solo dueños y administradores pueden conectar MercadoPago para este espacio.');
        }

        const eligible = await deps.userCanConnectMercadoPago(user, statePayload.vertical, statePayload.accountId);
        if (!eligible) return redirectWithStatus('upgrade');

        try {
            const tokens = await exchangeMercadoPagoOperatorOAuthCode(code);
            await saveMercadoPagoOperatorTokens(user.id, statePayload.vertical, tokens, statePayload.accountId);
            if (deps.onMercadoPagoOperatorConnected) {
                await deps.onMercadoPagoOperatorConnected(user.id, statePayload.vertical, statePayload.accountId);
            }
            return redirectWithStatus('connected', 'MercadoPago conectado correctamente.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo conectar con MercadoPago.';
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
