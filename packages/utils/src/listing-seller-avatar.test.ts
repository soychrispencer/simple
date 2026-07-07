import { describe, expect, it } from 'vitest';
import { resolveListingSellerAvatarUrl } from './listing-seller-avatar.js';

describe('resolveListingSellerAvatarUrl', () => {
    it('prioriza avatarUrl del seller', () => {
        expect(resolveListingSellerAvatarUrl({ avatarUrl: '/uploads/logo.webp' })).toBe('/uploads/logo.webp');
    });

    it('usa fallback cuando seller no tiene avatar', () => {
        expect(resolveListingSellerAvatarUrl(null, '/uploads/user.webp')).toBe('/uploads/user.webp');
    });

    it('devuelve undefined sin imagen', () => {
        expect(resolveListingSellerAvatarUrl(null)).toBeUndefined();
    });
});
