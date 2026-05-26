import { describe, expect, it } from 'vitest';
import { isReservedPublicSlug, previewSlugFromName, publicMariachiPath } from './public-mariachi-routes';

describe('public-mariachi-routes', () => {
    it('reserva rutas del sistema', () => {
        expect(isReservedPublicSlug('panel')).toBe(true);
        expect(isReservedPublicSlug('auth')).toBe(true);
        expect(isReservedPublicSlug('mariachis')).toBe(true);
        expect(isReservedPublicSlug('mariachis-santiago')).toBe(false);
    });

    it('genera slug de vista previa', () => {
        expect(previewSlugFromName('Mariachis Santiago')).toBe('mariachis-santiago');
    });

    it('arma path público', () => {
        expect(publicMariachiPath('mariachi-sol')).toBe('/mariachi-sol');
    });
});
