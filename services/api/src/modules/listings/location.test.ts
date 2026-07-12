import { describe, expect, it } from 'vitest';
import {
    buildLocationPublicLabel,
    geocodeListingLocation,
    humanizePublicLocationFallback,
    type ListingLocation,
} from './location.js';

function baseLocation(overrides: Partial<ListingLocation> = {}): ListingLocation {
    return {
        sourceMode: 'custom',
        sourceAddressId: null,
        countryCode: 'CL',
        regionId: 'rm',
        regionName: 'Región Metropolitana',
        communeId: 'rm-providencia',
        communeName: 'Providencia',
        neighborhood: null,
        addressLine1: null,
        addressLine2: null,
        postalCode: null,
        geoPoint: { latitude: null, longitude: null, precision: 'none' },
        visibilityMode: 'commune_only',
        publicMapEnabled: true,
        publicGeoPoint: { latitude: null, longitude: null, precision: 'none' },
        publicLabel: '',
        ...overrides,
    };
}

describe('geocodeListingLocation', () => {
    it('usa centro de comuna cuando no hay dirección ni geo confiable', () => {
        const result = geocodeListingLocation(baseLocation());
        expect(result.geoPoint.precision).toBe('commune');
        expect(result.geoPoint.provider).toBe('catalog_seed');
        expect(result.geoPoint.latitude).toBeCloseTo(-33.4262, 3);
    });

    it('oculta coordenadas públicas en modo hidden', () => {
        const result = geocodeListingLocation(baseLocation({ visibilityMode: 'hidden', publicMapEnabled: false }));
        expect(result.publicGeoPoint.latitude).toBeNull();
        expect(buildLocationPublicLabel(result)).toBe('');
    });
});

describe('buildLocationPublicLabel', () => {
    it('prioriza etiqueta explícita', () => {
        expect(buildLocationPublicLabel(baseLocation({ publicLabel: 'Sector Oriente, Providencia' }))).toBe(
            'Sector Oriente, Providencia',
        );
    });

    it('en commune_only solo expone la comuna', () => {
        expect(buildLocationPublicLabel(baseLocation({
            publicLabel: '',
            visibilityMode: 'commune_only',
            communeName: 'Providencia',
            regionName: 'Región Metropolitana',
        }))).toBe('Providencia');
    });
});

describe('humanizePublicLocationFallback', () => {
    it('humaniza slug de comuna', () => {
        expect(humanizePublicLocationFallback('rm-providencia')).toBe('Providencia');
    });
});
