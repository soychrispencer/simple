import type { VerticalType } from '../../lib/domain-types.js';
import { getIntegrationFallbackReturn } from '../integrations/app-origin.js';

export type InstagramOAuthStateDeps = {
    asString: (value: unknown) => string;
    parseVertical: (raw: string | undefined) => VerticalType;
};

type InstagramOAuthStateRecord = {
    nonce: string;
    userId: string;
    vertical: VerticalType;
    returnTo: string;
};

function decodeStateJson(value: string): Record<string, unknown> | null {
    if (!value) return null;
    const attempts = [
        () => Buffer.from(value, 'base64url').toString('utf8'),
        () => Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
        () => value,
    ];

    for (const attempt of attempts) {
        try {
            const decoded = attempt();
            const parsed = JSON.parse(decoded) as Record<string, unknown>;
            if (parsed && typeof parsed === 'object') return parsed;
        } catch {
            // try next encoding
        }
    }

    return null;
}

export function makeInstagramStatePayload(
    input: {
        nonce: string;
        userId: string;
        vertical: VerticalType;
        returnTo?: string;
    },
): string {
    return Buffer.from(JSON.stringify({
        n: input.nonce,
        u: input.userId,
        v: input.vertical,
    })).toString('base64url');
}

export function parseInstagramStatePayload(
    value: string,
    deps: InstagramOAuthStateDeps,
): InstagramOAuthStateRecord | null {
    const decoded = decodeStateJson(value);
    if (!decoded) return null;

    const nonce = deps.asString(decoded.n ?? decoded.nonce);
    const userId = deps.asString(decoded.u ?? decoded.userId);
    const vertical = deps.parseVertical(deps.asString(decoded.v ?? decoded.vertical));
    if (!nonce || !userId) return null;

    const returnTo = deps.asString(decoded.returnTo) || getIntegrationFallbackReturn(vertical);
    return { nonce, userId, vertical, returnTo };
}
