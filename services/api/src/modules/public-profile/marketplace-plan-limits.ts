import type { VerticalType } from './types.js';

export function isMarketplaceVertical(vertical: VerticalType): boolean {
    return vertical === 'autos' || vertical === 'propiedades';
}
