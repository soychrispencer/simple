import { describe, expect, it } from 'vitest';
import {
    buildListingHrefCandidates,
    listingHrefPrefix,
    normalizeListingHref,
} from './href-slug.js';

describe('listing href slug helpers', () => {
    it('normaliza slugs relativos con prefijo de vertical', () => {
        expect(normalizeListingHref('propiedades', 'lst-1', 'depto-las-condes')).toBe('/propiedad/depto-las-condes');
        expect(normalizeListingHref('autos', 'lst-2', 'corolla-2020')).toBe('/vehiculo/corolla-2020');
    });

    it('conserva rutas absolutas', () => {
        expect(normalizeListingHref('propiedades', 'lst-1', '/propiedad/mi-depto')).toBe('/propiedad/mi-depto');
    });

    it('usa href por id cuando no hay slug', () => {
        expect(normalizeListingHref('propiedades', 'lst-abc', undefined)).toBe('/propiedad/lst-abc');
    });

    it('genera candidatos de búsqueda para slug y ruta completa', () => {
        expect(buildListingHrefCandidates('/propiedad/depto-centro')).toEqual([
            '/propiedad/depto-centro',
            'depto-centro',
            '/vehiculo/depto-centro',
        ]);
    });

    it('expone prefijo por vertical', () => {
        expect(listingHrefPrefix('propiedades')).toBe('/propiedad/');
        expect(listingHrefPrefix('autos')).toBe('/vehiculo/');
    });
});
