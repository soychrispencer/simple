import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export type MercadoPagoOperatorVertical = 'agenda' | 'autos' | 'propiedades' | 'serenatas';

type MercadoPagoOAuthAttempt = {
    nonce: string;
    userId: string;
    vertical: MercadoPagoOperatorVertical;
    returnTo: string;
    accountId: string | null;
};

type MercadoPagoOAuthState = {
    origin: string;
    vertical: MercadoPagoOperatorVertical;
    cookieHash: string;
    expiresAt: number;
};

const STATE_TTL_MS = 10 * 60 * 1000;

export function parseMercadoPagoOperatorVertical(raw: string | undefined): MercadoPagoOperatorVertical | null {
    if (raw === 'agenda' || raw === 'autos' || raw === 'propiedades' || raw === 'serenatas') {
        return raw;
    }
    return null;
}

function hashCookie(cookie: string): string {
    return createHash('sha256').update(cookie).digest('base64url');
}

function signState(secret: string, body: string): Buffer {
    return createHmac('sha256', secret).update('mercadopago:').update(body).digest();
}

export function createMercadoPagoOAuthAttempt(secret: string, origin: string, attempt: MercadoPagoOAuthAttempt) {
    const cookie = Buffer.from(JSON.stringify(attempt)).toString('base64url');
    const state: MercadoPagoOAuthState = {
        origin,
        vertical: attempt.vertical,
        cookieHash: hashCookie(cookie),
        expiresAt: Date.now() + STATE_TTL_MS,
    };
    const body = Buffer.from(JSON.stringify(state)).toString('base64url');
    return { cookie, state: `${body}.${signState(secret, body).toString('base64url')}` };
}

export function verifyMercadoPagoOAuthState(secret: string, value: string): MercadoPagoOAuthState | null {
    const match = /^([a-zA-Z0-9_-]{1,1500})\.([a-zA-Z0-9_-]{43})$/.exec(value);
    if (!match) return null;
    const [, body, signature] = match;

    const expected = signState(secret, body);
    const supplied = Buffer.from(signature, 'base64url');
    if (!timingSafeEqual(expected, supplied)) return null;

    try {
        const state = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as MercadoPagoOAuthState;
        if (
            !parseMercadoPagoOperatorVertical(state.vertical)
            || typeof state.origin !== 'string'
            || new URL(state.origin).origin !== state.origin
            || !Number.isFinite(state.expiresAt)
            || state.expiresAt <= Date.now()
        ) return null;
        return state;
    } catch {
        return null;
    }
}

export function readMercadoPagoOAuthAttempt(
    state: MercadoPagoOAuthState | null,
    cookie: string | undefined,
): MercadoPagoOAuthAttempt | null {
    if (!state || !cookie || hashCookie(cookie) !== state.cookieHash) return null;
    try {
        return JSON.parse(Buffer.from(cookie, 'base64url').toString('utf8')) as MercadoPagoOAuthAttempt;
    } catch {
        return null;
    }
}
