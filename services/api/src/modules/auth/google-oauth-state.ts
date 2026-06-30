import { createHash } from 'crypto';

export type GoogleOAuthMode = 'link' | 'login';

export type GoogleOAuthStatePayload = {
    nonce: string;
    ts: number;
    origin: string;
    mode: GoogleOAuthMode;
    userId?: string;
    returnTo?: string;
};

const STATE_TTL_SECONDS = 600;

function signPayload(sessionSecret: string, payload: string): string {
    return createHash('sha256').update(`${sessionSecret}:${payload}`).digest('hex').slice(0, 32);
}

export function buildGoogleOAuthState(
    sessionSecret: string,
    input: {
        nonce: string;
        origin: string;
        mode?: GoogleOAuthMode;
        userId?: string;
        returnTo?: string;
    },
): string {
    const ts = Math.floor(Date.now() / 1000);
    const mode = input.mode ?? 'login';
    const userId = mode === 'link' ? (input.userId ?? '') : '';
    const returnTo = input.returnTo ?? '';
    const payload = `${input.nonce}~${ts}~${input.origin}~${mode}~${userId}~${returnTo}`;
    const sig = signPayload(sessionSecret, payload);
    return Buffer.from(`${payload}~${sig}`).toString('base64url');
}

export function verifyGoogleOAuthState(
    state: string,
    sessionSecret: string,
    safeEqualStrings: (a: string, b: string) => boolean,
): GoogleOAuthStatePayload | null {
    if (!state) return null;
    try {
        const decoded = Buffer.from(state, 'base64url').toString('utf8');
        const lastTilde = decoded.lastIndexOf('~');
        if (lastTilde === -1) return null;

        const sig = decoded.slice(lastTilde + 1);
        const body = decoded.slice(0, lastTilde);
        const parts = body.split('~');
        if (parts.length !== 3 && parts.length !== 6) return null;

        const [nonce, tsStr, origin, modeRaw, userIdRaw, returnToRaw] =
            parts.length === 6
                ? parts
                : [...parts, 'login', '', ''];

        const ts = parseInt(tsStr, 10);
        if (!nonce || !origin || Number.isNaN(ts) || Date.now() / 1000 - ts > STATE_TTL_SECONDS) {
            return null;
        }

        const expectedSig = signPayload(sessionSecret, body);
        if (!safeEqualStrings(sig, expectedSig)) return null;

        const mode: GoogleOAuthMode = modeRaw === 'link' ? 'link' : 'login';
        const userId = userIdRaw?.trim() || undefined;
        const returnTo = returnToRaw?.trim() || undefined;

        if (mode === 'link' && !userId) return null;

        return { nonce, ts, origin, mode, userId, returnTo };
    } catch {
        return null;
    }
}

export function googleOAuthErrorCode(error: string, status: number): string | null {
    if (status === 409 && /no coincide/i.test(error)) return 'email_mismatch';
    if (status === 409 && /ya está registrado/i.test(error)) return 'email_taken';
    return null;
}
