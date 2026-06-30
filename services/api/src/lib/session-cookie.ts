/**
 * Constantes de cookie de sesión compartidas entre index y tests.
 */

export const SESSION_COOKIE_NAME = 'simple_session';

export type SessionCookieOptions = {
    httpOnly: true;
    secure: boolean;
    sameSite: 'Lax' | 'Strict' | 'None';
    path: string;
    maxAge: number;
};

export function buildSessionCookieOptions(secure: boolean): SessionCookieOptions {
    return {
        httpOnly: true,
        secure,
        sameSite: 'Lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
    };
}
