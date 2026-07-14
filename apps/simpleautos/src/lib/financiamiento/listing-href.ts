import type { TipoVehiculo } from './calculadora';

/** Ruta pública del simulador de crédito automotriz. */
export const SIMULADOR_CREDITO_PATH = '/simulador-credito-automotriz';

export function resolveTipoVehiculoFromCondition(condition?: string | null): TipoVehiculo {
    const value = (condition || '').trim().toLowerCase();
    if (!value) return 'usado';
    if (value.includes('nuevo') || value.includes('0 km') || value.includes('0km')) {
        return 'nuevo';
    }
    return 'usado';
}

export function buildSimuladorCreditoHrefFromListing(item: {
    id: string;
    title: string;
    price: string;
    summary: string[];
    year?: string | null;
    condition?: string | null;
}): string {
    const params = new URLSearchParams();
    const priceDigits = item.price.replace(/[^\d]/g, '');
    if (priceDigits) params.set('precio', priceDigits);
    params.set('titulo', item.title);
    params.set('listingId', item.id);

    const yearFromField = item.year?.replace(/\D/g, '').slice(0, 4);
    const yearFromSummary = item.summary.find((tag) => /^\d{4}$/.test(tag));
    const year = yearFromField && yearFromField.length === 4 ? yearFromField : yearFromSummary;
    if (year) params.set('anio', year);

    const tipo = resolveTipoVehiculoFromCondition(item.condition);
    params.set('tipo', tipo);

    return `${SIMULADOR_CREDITO_PATH}?${params.toString()}`;
}
