import { describe, expect, it } from 'vitest';
import { resolveAvatarAfterGoogleOAuth } from './google-oauth-avatar.js';

const asString = (value: unknown) => (value === null || value === undefined ? '' : String(value));

describe('resolveAvatarAfterGoogleOAuth', () => {
    it('keeps an existing uploaded avatar when Google returns a picture', () => {
        expect(
            resolveAvatarAfterGoogleOAuth(
                'https://cdn.example/avatar.webp',
                'https://lh3.googleusercontent.com/a/abc',
                asString,
            ),
        ).toBe('https://cdn.example/avatar.webp');
    });

    it('uses Google picture when the user has no avatar', () => {
        expect(
            resolveAvatarAfterGoogleOAuth(null, 'https://lh3.googleusercontent.com/a/abc', asString),
        ).toBe('https://lh3.googleusercontent.com/a/abc');
    });

    it('returns null when neither side has an avatar', () => {
        expect(resolveAvatarAfterGoogleOAuth('', null, asString)).toBeNull();
        expect(resolveAvatarAfterGoogleOAuth(undefined, '', asString)).toBeNull();
    });
});
