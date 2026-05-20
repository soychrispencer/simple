export const GROUP_INVITE_TOKEN_KEY = 'serenatas-group-invite-token';

export function persistGroupInviteToken(token: string) {
    if (typeof window === 'undefined') return;
    const trimmed = token.trim();
    if (!trimmed) return;
    window.sessionStorage.setItem(GROUP_INVITE_TOKEN_KEY, trimmed);
}

export function readGroupInviteToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(GROUP_INVITE_TOKEN_KEY)?.trim() || null;
}

export function consumeGroupInviteToken(): string | null {
    const value = readGroupInviteToken();
    if (value && typeof window !== 'undefined') {
        window.sessionStorage.removeItem(GROUP_INVITE_TOKEN_KEY);
    }
    return value;
}
