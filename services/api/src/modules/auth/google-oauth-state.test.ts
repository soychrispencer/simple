import { describe, expect, it } from 'vitest';
import {
    buildGoogleOAuthState,
    googleOAuthErrorCode,
    verifyGoogleOAuthState,
} from './google-oauth-state.js';

const SECRET = 'test-session-secret';

function safeEqualStrings(a: string, b: string): boolean {
    return a === b;
}

describe('google-oauth-state', () => {
    it('round-trips login state (legacy 3-field body)', () => {
        const state = buildGoogleOAuthState(SECRET, {
            nonce: 'abc123',
            origin: 'http://localhost:3005',
            mode: 'login',
        });
        const parsed = verifyGoogleOAuthState(state, SECRET, safeEqualStrings);
        expect(parsed).toMatchObject({
            nonce: 'abc123',
            origin: 'http://localhost:3005',
            mode: 'login',
        });
        expect(parsed?.userId).toBeUndefined();
    });

    it('round-trips link state with userId and returnTo', () => {
        const state = buildGoogleOAuthState(SECRET, {
            nonce: 'link-nonce',
            origin: 'https://serenatas.example',
            mode: 'link',
            userId: 'user-uuid-1',
            returnTo: 'https://serenatas.example/panel/cuenta?account_tab=data',
        });
        const parsed = verifyGoogleOAuthState(state, SECRET, safeEqualStrings);
        expect(parsed).toEqual({
            nonce: 'link-nonce',
            origin: 'https://serenatas.example',
            mode: 'link',
            userId: 'user-uuid-1',
            returnTo: 'https://serenatas.example/panel/cuenta?account_tab=data',
            ts: expect.any(Number),
        });
    });

    it('rejects tampered signature', () => {
        const state = buildGoogleOAuthState(SECRET, {
            nonce: 'n',
            origin: 'http://localhost:3005',
            mode: 'link',
            userId: 'u1',
        });
        const tampered = `${state}x`;
        expect(verifyGoogleOAuthState(tampered, SECRET, safeEqualStrings)).toBeNull();
    });

    it('rejects link mode without userId', () => {
        const state = buildGoogleOAuthState(SECRET, {
            nonce: 'n',
            origin: 'http://localhost:3005',
            mode: 'link',
            userId: '',
        });
        expect(verifyGoogleOAuthState(state, SECRET, safeEqualStrings)).toBeNull();
    });

    it('maps email mismatch to google_error code', () => {
        expect(
            googleOAuthErrorCode(
                'La cuenta de Google (b@x.com) no coincide con el correo de esta cuenta (a@x.com).',
                409,
            ),
        ).toBe('email_mismatch');
    });
});
