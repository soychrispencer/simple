import { describe, expect, it } from 'vitest';
import { SESSION_COOKIE_NAME, buildSessionCookieOptions } from './session-cookie.js';

describe('session cookie (auth smoke)', () => {
    it('usa el nombre de cookie esperado por el frontend', () => {
        expect(SESSION_COOKIE_NAME).toBe('simple_session');
    });

    it('genera opciones HttpOnly seguras en producción', () => {
        const opts = buildSessionCookieOptions(true);
        expect(opts.httpOnly).toBe(true);
        expect(opts.secure).toBe(true);
        expect(opts.sameSite).toBe('Lax');
        expect(opts.path).toBe('/');
        expect(opts.maxAge).toBeGreaterThan(0);
    });

    it('permite secure=false en desarrollo local', () => {
        const opts = buildSessionCookieOptions(false);
        expect(opts.secure).toBe(false);
        expect(opts.httpOnly).toBe(true);
    });
});
