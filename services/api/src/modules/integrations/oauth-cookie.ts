import type { VerticalType } from '@simple/types';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Context } from 'hono';
import { asString } from '../shared/index.js';

export function integrationAccountKey(userId: string, vertical: VerticalType): string {
    return `${userId}:${vertical}`;
}

export function setIntegrationOAuthCookie(
    c: Context,
    cookieName: string,
    payload: string,
    options: { sameSite: 'Lax' | 'Strict' | 'None'; secure: boolean },
): void {
    setCookie(c, cookieName, payload, {
        httpOnly: true,
        sameSite: options.sameSite,
        secure: options.secure,
        path: '/',
        maxAge: 60 * 10,
    });
}

export function consumeIntegrationOAuthCookie(c: Context, cookieName: string): string {
    const value = asString(getCookie(c, cookieName));
    deleteCookie(c, cookieName, { path: '/' });
    return value;
}
