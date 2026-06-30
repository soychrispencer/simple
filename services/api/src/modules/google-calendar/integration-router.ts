import { Hono } from 'hono';
import type { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { google } from 'googleapis';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { getGoogleOAuth2Client } from '../../lib/google-auth.js';
import {
    consumeIntegrationOAuthCookie,
    setIntegrationOAuthCookie,
} from '../integrations/oauth-cookie.js';

export const GOOGLE_CALENDAR_STATE_COOKIE = 'gc_oauth_state';

export type GoogleCalendarMarketplaceVertical = 'autos' | 'propiedades';

export type GoogleCalendarIntegrationRouterDeps = {
    authUser: (c: Context) => Promise<{ id: string } | null>;
    asString: (value: unknown) => string;
    resolveBrowserOrigin: (c: Context) => string | null;
    sanitizeBrowserReturnUrl: (url: string, fallback: string) => string;
    randomBytes: (size: number) => Buffer;
    safeEqualStrings: (a: string, b: string) => boolean;
    getUserById: (id: string) => Promise<{ id: string } | null>;
    authCookieSameSite: 'Lax' | 'Strict' | 'None';
    authCookieSecure: boolean;
};

function parseVertical(raw: string | undefined): GoogleCalendarMarketplaceVertical | null {
    if (raw === 'autos' || raw === 'propiedades') return raw;
    return null;
}

function getAppOrigin(vertical: GoogleCalendarMarketplaceVertical): string {
    if (vertical === 'autos') {
        return (process.env.AUTOS_APP_URL ?? process.env.MERCADO_PAGO_PUBLIC_ORIGIN_AUTOS ?? 'http://localhost:3002').replace(/\/$/, '');
    }
    return (process.env.PROPIEDADES_APP_URL ?? process.env.MERCADO_PAGO_PUBLIC_ORIGIN_PROPIEDADES ?? 'http://localhost:3003').replace(/\/$/, '');
}

export function isGoogleCalendarOAuthConfigured(): boolean {
    return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

function makeGoogleCalendarStatePayload(opts: {
    nonce: string;
    userId: string;
    vertical: GoogleCalendarMarketplaceVertical;
    returnTo: string;
}): string {
    return JSON.stringify(opts);
}

function parseGoogleCalendarStatePayload(raw: string) {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const vertical = parseVertical(typeof parsed.vertical === 'string' ? parsed.vertical : undefined);
        const nonce = typeof parsed.nonce === 'string' ? parsed.nonce : '';
        const userId = typeof parsed.userId === 'string' ? parsed.userId : '';
        const returnTo = typeof parsed.returnTo === 'string' ? parsed.returnTo : '';
        if (!vertical || !nonce || !userId) return null;
        return { nonce, userId, vertical, returnTo };
    } catch {
        return null;
    }
}

export function createGoogleCalendarIntegrationRouter(deps: GoogleCalendarIntegrationRouterDeps) {
    const app = new Hono();

    app.get('/', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(deps.asString(c.req.query('vertical')));
        if (!vertical) return c.json({ ok: false, error: 'Vertical no soportada' }, 400);

        const row = await db.query.users.findFirst({
            where: eq(users.id, user.id),
            columns: {
                googleCalendarId: true,
                googleCalendarAccessToken: true,
            },
        });

        return c.json({
            ok: true,
            vertical,
            configured: isGoogleCalendarOAuthConfigured(),
            connected: Boolean(row?.googleCalendarAccessToken),
            calendarId: row?.googleCalendarId ?? null,
        });
    });

    app.get('/connect', async (c) => {
        const user = await deps.authUser(c);
        if (!user) return c.json({ ok: false, error: 'No autenticado' }, 401);

        const vertical = parseVertical(deps.asString(c.req.query('vertical')));
        if (!vertical) return c.json({ ok: false, error: 'Vertical no soportada' }, 400);

        if (!isGoogleCalendarOAuthConfigured()) {
            return c.json({ ok: false, error: 'Google Calendar no está configurado en este entorno.' }, 503);
        }

        const origin = deps.resolveBrowserOrigin(c) ?? getAppOrigin(vertical);
        const fallbackReturn = `${origin}/panel/mi-cuenta/integraciones`;
        const returnTo = deps.sanitizeBrowserReturnUrl(
            deps.asString(c.req.query('returnTo')) || fallbackReturn,
            fallbackReturn,
        );
        const nonce = deps.randomBytes(24).toString('hex');
        setIntegrationOAuthCookie(
            c,
            GOOGLE_CALENDAR_STATE_COOKIE,
            makeGoogleCalendarStatePayload({
                nonce,
                userId: user.id,
                vertical,
                returnTo,
            }),
            { sameSite: deps.authCookieSameSite, secure: deps.authCookieSecure },
        );

        const oauth2Client = getGoogleOAuth2Client(
            '/api/integrations/google-calendar/callback',
            getAppOrigin(vertical),
        );
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/calendar'],
            state: nonce,
            prompt: 'consent',
        });
        return c.redirect(url);
    });

    app.get('/callback', async (c) => {
        const statePayload = parseGoogleCalendarStatePayload(
            consumeIntegrationOAuthCookie(c, GOOGLE_CALENDAR_STATE_COOKIE),
        );
        const vertical = statePayload?.vertical ?? 'autos';
        const fallbackReturn = `${getAppOrigin(vertical)}/panel/mi-cuenta/integraciones`;

        const redirectWithStatus = (status: 'connected' | 'error', message?: string) => {
            const returnTo = statePayload?.returnTo || fallbackReturn;
            const target = new URL(deps.sanitizeBrowserReturnUrl(returnTo, fallbackReturn));
            target.searchParams.set('gc', status);
            if (message) target.searchParams.set('message', message);
            return c.redirect(target.toString());
        };

        const code = deps.asString(c.req.query('code'));
        const state = deps.asString(c.req.query('state'));
        const errorReason = deps.asString(c.req.query('error_description')) || deps.asString(c.req.query('error'));

        if (errorReason) return redirectWithStatus('error', errorReason);
        if (!statePayload || !state || !deps.safeEqualStrings(statePayload.nonce, state)) {
            return redirectWithStatus('error', 'La sesión de conexión con Google Calendar expiró. Intenta nuevamente.');
        }
        if (!code) return redirectWithStatus('error', 'Google no devolvió un código de autorización válido.');

        const user = await deps.getUserById(statePayload.userId);
        if (!user) return redirectWithStatus('error', 'No pudimos validar tu sesión para conectar Google Calendar.');

        try {
            const oauth2Client = getGoogleOAuth2Client(
                '/api/integrations/google-calendar/callback',
                getAppOrigin(statePayload.vertical),
            );
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);
            const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });
            const calList = await calendarApi.calendarList.list({ minAccessRole: 'owner' });
            const primaryCal = calList.data.items?.find((item) => item.primary) ?? calList.data.items?.[0];

            await db.update(users).set({
                googleCalendarId: primaryCal?.id ?? null,
                googleCalendarAccessToken: tokens.access_token ?? null,
                googleCalendarRefreshToken: tokens.refresh_token ?? null,
                googleCalendarTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                updatedAt: new Date(),
            }).where(eq(users.id, user.id));

            return redirectWithStatus('connected');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo conectar con Google Calendar.';
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
        const vertical = parseVertical(verticalRaw || deps.asString(c.req.query('vertical')));
        if (!vertical) return c.json({ ok: false, error: 'Vertical no soportada' }, 400);

        await db.update(users).set({
            googleCalendarId: null,
            googleCalendarAccessToken: null,
            googleCalendarRefreshToken: null,
            googleCalendarTokenExpiry: null,
            updatedAt: new Date(),
        }).where(eq(users.id, user.id));

        return c.json({ ok: true });
    });

    return app;
}
