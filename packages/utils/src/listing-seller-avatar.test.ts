import { describe, expect, it } from 'vitest';
import { resolveListingSellerAvatarUrl } from './listing-seller-avatar.js';

describe('resolveListingSellerAvatarUrl', () => {
    it('usa avatarUrl del seller (logo de negocio)', () => {
        expect(resolveListingSellerAvatarUrl({ avatarUrl: '/uploads/logo.webp' })).toBe('/uploads/logo.webp');
    });

    it('no usa fallback de avatar personal', () => {
        expect(resolveListingSellerAvatarUrl(null, '/uploads/user.webp')).toBeUndefined();
    });

    it('devuelve undefined sin logo de negocio', () => {
        expect(resolveListingSellerAvatarUrl(null)).toBeUndefined();
    });
});
