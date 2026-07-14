import { describe, expect, it } from 'vitest';
import {
    buildSimuladorCreditoHrefFromListing,
    resolveTipoVehiculoFromCondition,
    SIMULADOR_CREDITO_PATH,
} from './listing-href';

describe('listing-href simulador', () => {
    it('arma la URL con precio, año, tipo y título', () => {
        const href = buildSimuladorCreditoHrefFromListing({
            id: 'abc',
            title: 'Toyota Corolla 2020',
            price: '$12.500.000',
            year: '2020',
            condition: 'Usado',
            summary: ['2020', 'Automática'],
        });

        expect(href.startsWith(`${SIMULADOR_CREDITO_PATH}?`)).toBe(true);
        const params = new URLSearchParams(href.split('?')[1]);
        expect(params.get('precio')).toBe('12500000');
        expect(params.get('anio')).toBe('2020');
        expect(params.get('tipo')).toBe('usado');
        expect(params.get('titulo')).toBe('Toyota Corolla 2020');
        expect(params.get('listingId')).toBe('abc');
    });

    it('detecta vehículo nuevo por condición', () => {
        expect(resolveTipoVehiculoFromCondition('Nuevo')).toBe('nuevo');
        expect(resolveTipoVehiculoFromCondition('0 km')).toBe('nuevo');
        expect(resolveTipoVehiculoFromCondition('Seminuevo')).toBe('usado');
    });
});
