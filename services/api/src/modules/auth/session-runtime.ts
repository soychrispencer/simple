import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import jwt from 'jsonwebtoken';
import { asString } from '../shared/index.js';
import { isLocalOrigin } from '../../lib/cors.js';
import type { AppUser } from '../../lib/domain-types.js';

export type AuthSessionRuntimeDeps = {
    sessionCookie: string;
    oauthStateCookie: string;
    instagramStateCookie: string;
    sessionSecret: string;
    authCookieSameSite: 'Lax' | 'Strict' | 'None';
    authCookieSecure: boolean;
    isProduction: boolean;
    getUserById: (id: string) => Promise<AppUser | null>;
    canAuthenticateUser: (user: AppUser) => boolean;
    ensurePrimaryAccountForUser: (user: AppUser) => Promise<{ id: string }>;
    applyRuntimeRole: (user: AppUser) => AppUser;
};

export function createAuthSessionRuntime(deps: AuthSessionRuntimeDeps) {
    async function authUser(c: Context): Promise<AppUser | null> {
        const token = getCookie(c, deps.sessionCookie);
        if (!token) return null;
        let userId: string | null = null;
        try {
            const payload = jwt.verify(token, deps.sessionSecret) as jwt.JwtPayload;
            userId = typeof payload.sub === 'string' ? payload.sub : null;
        } catch {
            userId = null;
        }
        if (!userId) return null;
        const user = await deps.getUserById(userId);
        if (!user || !deps.canAuthenticateUser(user)) return null;
        const account = await deps.ensurePrimaryAccountForUser(user);
        return deps.applyRuntimeRole({
            ...user,
            primaryAccountId: account.id,
        });
    }

    function isVerifiedUser(user: AppUser): boolean {
        return user.status === 'verified';
    }

    function emailVerificationRequiredResponse(c: Context) {
        return c.json(
            {
                ok: false,
                error: 'Debes verificar tu correo para acceder a esta seccion del panel.',
                code: 'EMAIL_VERIFICATION_REQUIRED',
            },
            403,
        );
    }

    async function requireVerifiedSession(c: Context, next: () => Promise<void>) {
        const user = await authUser(c);
        if (!user) {
            return c.json({ ok: false, error: 'No autenticado' }, 401);
        }
        if (!isVerifiedUser(user)) {
            return emailVerificationRequiredResponse(c);
        }
        await next();
    }

    function setSession(c: Context, userId: string): void {
        const sessionToken = jwt.sign({ sub: userId }, deps.sessionSecret, { expiresIn: '14d' });
        const origin = c.req.header('origin');
        const isLocalDev = !origin || isLocalOrigin(origin);

        setCookie(c, deps.sessionCookie, sessionToken, {
            httpOnly: true,
            sameSite: isLocalDev ? 'none' as const : deps.authCookieSameSite,
            secure: isLocalDev ? true : deps.authCookieSecure,
            path: '/',
            maxAge: 60 * 60 * 24 * 14,
        });
    }

    function clearSession(c: Context): void {
        deleteCookie(c, deps.sessionCookie, { path: '/' });
    }

    function setOAuthState(c: Context, state: string): void {
        setCookie(c, deps.oauthStateCookie, state, {
            httpOnly: true,
            sameSite: deps.authCookieSameSite,
            secure: deps.authCookieSecure,
            path: '/',
            maxAge: 60 * 10,
        });
    }

    function consumeOAuthState(c: Context): string {
        const cookieState = asString(getCookie(c, deps.oauthStateCookie));
        deleteCookie(c, deps.oauthStateCookie, { path: '/' });
        return cookieState;
    }

    function setInstagramState(c: Context, payload: string): void {
        setCookie(c, deps.instagramStateCookie, payload, {
            httpOnly: true,
            sameSite: deps.authCookieSameSite,
            secure: deps.authCookieSecure,
            path: '/',
            maxAge: 60 * 10,
        });
    }

    function consumeInstagramState(c: Context): string {
        const cookieState = asString(getCookie(c, deps.instagramStateCookie));
        deleteCookie(c, deps.instagramStateCookie, { path: '/' });
        return cookieState;
    }

    return {
        authUser,
        requireVerifiedSession,
        setSession,
        clearSession,
        setOAuthState,
        consumeOAuthState,
        setInstagramState,
        consumeInstagramState,
    };
}
