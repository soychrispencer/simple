import { describe, expect, it } from 'vitest';
import { resolveAccountAvatarUrl, resolveAppMediaUrl } from './media-url.js';

describe('resolveAppMediaUrl', () => {
    it('deja rutas same-origin /uploads sin prefijo de API', () => {
        expect(resolveAppMediaUrl('/uploads/user/temp/photo.webp')).toBe('/uploads/user/temp/photo.webp');
    });

    it('convierte URLs absolutas de la API a /uploads same-origin', () => {
        expect(
            resolveAppMediaUrl('http://localhost:4000/uploads/c7d7c400/temp/photo.webp'),
        ).toBe('/uploads/c7d7c400/temp/photo.webp');
    });

    it('conserva URLs externas (Google, R2)', () => {
        const google = 'https://lh3.googleusercontent.com/a/abc';
        const r2 = 'https://pub-abc.r2.dev/avatars/user.webp';
        expect(resolveAppMediaUrl(google)).toBe(google);
        expect(resolveAppMediaUrl(r2)).toBe(r2);
    });

    it('resolveAccountAvatarUrl es alias de resolveAppMediaUrl', () => {
        expect(resolveAccountAvatarUrl('http://localhost:4000/uploads/x.webp')).toBe('/uploads/x.webp');
    });
});
