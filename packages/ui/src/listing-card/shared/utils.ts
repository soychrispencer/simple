import type { ListingAccent, ListingBadgeTone, ListingPrice, ListingVariant, OwnerListingStatus } from '../types';

const AUTOS_GRADIENTS: Array<[string, string]> = [
    ['#0f172a', '#1d4ed8'],
    ['#111827', '#334155'],
    ['#292524', '#44403c'],
    ['#1f2937', '#374151'],
];

const PROPIEDADES_GRADIENTS: Array<[string, string]> = [
    ['#172554', '#1e3a8a'],
    ['#111827', '#1f2937'],
    ['#0f172a', '#334155'],
    ['#312e81', '#4338ca'],
];

export function makeSeededGradients(seed: string, accent: ListingAccent, count = 3): string[] {
    const palette = accent === 'propiedades' ? PROPIEDADES_GRADIENTS : AUTOS_GRADIENTS;
    const value = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return Array.from({ length: count }).map((_, index) => {
        const [a, b] = palette[(value + index) % palette.length];
        return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
    });
}

export function initialsFromName(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0] ?? '')
        .join('')
        .toUpperCase();
}

export function formatChileanPeso(amount: number): string {
    if (!Number.isFinite(amount)) return '$0';
    return '$' + Math.round(amount).toLocaleString('es-CL');
}

export function formatMetric(value: number): string {
    if (value >= 1000) {
        const units = Math.round(value / 100) / 10;
        return `${units}k`;
    }
    return value.toLocaleString('es-CL');
}

export function variantBadgeTone(variant: ListingVariant): ListingBadgeTone {
    if (variant === 'rent') return 'warning';
    if (variant === 'auction') return 'info';
    if (variant === 'project') return 'info';
    return 'success';
}

export function variantBadgeLabel(variant: ListingVariant): string {
    if (variant === 'rent') return 'Arriendo';
    if (variant === 'auction') return 'Subasta';
    if (variant === 'project') return 'Proyecto';
    return 'Venta';
}

export function defaultCtaByVariant(variant: ListingVariant): string {
    if (variant === 'rent') return 'Ver disponibilidad';
    if (variant === 'auction') return 'Entrar';
    if (variant === 'project') return 'Ver proyecto';
    return 'Ver detalle';
}

export type StatusPalette = {
    tone: ListingBadgeTone;
    borderColor: string;
    label: string;
};

export function ownerStatusPalette(status: OwnerListingStatus, explicitLabel?: string): StatusPalette {
    switch (status) {
        case 'active':
            return { tone: 'success', borderColor: 'var(--color-success)', label: explicitLabel ?? 'Activa' };
        case 'paused':
            return { tone: 'warning', borderColor: 'var(--color-warning)', label: explicitLabel ?? 'Pausada' };
        case 'expired':
            return { tone: 'danger', borderColor: 'var(--color-error)', label: explicitLabel ?? 'Expirada' };
        case 'sold':
            return { tone: 'neutral', borderColor: 'var(--fg-muted)', label: explicitLabel ?? 'Vendida' };
        case 'review_required':
            return { tone: 'info', borderColor: '#2563eb', label: explicitLabel ?? 'Revisar' };
        case 'draft':
        default:
            return { tone: 'neutral', borderColor: 'var(--border-strong)', label: explicitLabel ?? 'Borrador' };
    }
}

export function priceHero(price: ListingPrice): { primary: string; original?: string; discount?: string } {
    return {
        primary: formatChileanPeso(price.amount),
        original: price.original != null ? formatChileanPeso(price.original) : undefined,
        discount: price.discountLabel,
    };
}
