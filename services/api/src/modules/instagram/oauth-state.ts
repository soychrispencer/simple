import type { VerticalType } from '../../lib/domain-types.js';

export type InstagramOAuthStateDeps = {
    asString: (value: unknown) => string;
    parseVertical: (raw: string | undefined) => VerticalType;
};

export function makeInstagramStatePayload(
    input: {
        nonce: string;
        userId: string;
        vertical: VerticalType;
        returnTo: string;
    },
): string {
    return Buffer.from(JSON.stringify(input)).toString('base64url');
}

export function parseInstagramStatePayload(
    value: string,
    deps: InstagramOAuthStateDeps,
): {
    nonce: string;
    userId: string;
    vertical: VerticalType;
    returnTo: string;
} | null {
    if (!value) return null;
    try {
        const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Record<string, unknown>;
        const nonce = deps.asString(decoded.nonce);
        const userId = deps.asString(decoded.userId);
        const vertical = deps.parseVertical(deps.asString(decoded.vertical));
        const returnTo = deps.asString(decoded.returnTo);
        if (!nonce || !userId || !returnTo) return null;
        return { nonce, userId, vertical, returnTo };
    } catch {
        return null;
    }
}
