import { createHmac, timingSafeEqual } from 'node:crypto';

const STATE_TTL_SECONDS = 10 * 60;

type AgendaOAuthStatePayload = {
    profileId: string;
    userId: string;
    accountId: string | null;
    nonce: string;
    expiresAt: number;
};

export type AgendaOAuthStateContext = Pick<AgendaOAuthStatePayload, 'profileId' | 'userId' | 'accountId'>;

export function buildAgendaOAuthState(
    sessionSecret: string,
    context: AgendaOAuthStateContext,
    nonce: string,
): string {
    const payload: AgendaOAuthStatePayload = {
        ...context,
        nonce,
        expiresAt: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', sessionSecret).update(body).digest('base64url');
    return `${body}.${signature}`;
}

export function verifyAgendaOAuthState(sessionSecret: string, state: string): AgendaOAuthStateContext | null {
    const [body, suppliedSignature, ...extra] = state.split('.');
    if (!body || !suppliedSignature || extra.length > 0) return null;

    const expectedSignature = createHmac('sha256', sessionSecret).update(body).digest('base64url');
    const expectedBytes = Buffer.from(expectedSignature);
    const suppliedBytes = Buffer.from(suppliedSignature);
    if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) return null;

    try {
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Partial<AgendaOAuthStatePayload>;
        const now = Math.floor(Date.now() / 1000);
        if (
            typeof payload.profileId !== 'string'
            || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.profileId)
            || typeof payload.userId !== 'string'
            || !payload.userId.trim()
            || (payload.accountId !== null && typeof payload.accountId !== 'string')
            || typeof payload.nonce !== 'string'
            || !/^[0-9a-f]{32}$/.test(payload.nonce)
            || typeof payload.expiresAt !== 'number'
            || payload.expiresAt <= now
            || payload.expiresAt > now + STATE_TTL_SECONDS + 30
        ) return null;

        return {
            profileId: payload.profileId,
            userId: payload.userId,
            accountId: payload.accountId,
        };
    } catch {
        return null;
    }
}
