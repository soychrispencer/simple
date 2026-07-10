import { describe, expect, it } from 'vitest';
import {
    optimizeListingImageUrl,
    resolveAccountAvatarUrl,
    resolveAppMediaUrl,
} from './media-url.js';

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

describe('optimizeListingImageUrl', () => {
    it('envuelve custom domain con /cdn-cgi/image', () => {
        expect(
            optimizeListingImageUrl('https://media.simpleplataforma.app/listings/a.webp', { width: 720 }),
        ).toBe('https://media.simpleplataforma.app/cdn-cgi/image/width=720,quality=72,fit=scale-down,format=auto/listings/a.webp');
    });

    it('no transforma r2.dev ni data URLs', () => {
        const r2 = 'https://pub-abc.r2.dev/listings/a.webp';
        expect(optimizeListingImageUrl(r2)).toBe(r2);
        expect(optimizeListingImageUrl('data:image/webp;base64,aaa')).toBe('data:image/webp;base64,aaa');
    });

    it('no doble-envuelve', () => {
        const already = 'https://media.simpleplataforma.app/cdn-cgi/image/width=400,quality=70,format=auto/listings/a.webp';
        expect(optimizeListingImageUrl(already, { width: 720 })).toBe(already);
    });
});
