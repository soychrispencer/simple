import type { ProviderBookingMode, ProviderGroup, ProviderGroupService } from '@/lib/serenatas-api';

function bookingModeLabel(mode: ProviderBookingMode | null | undefined): string {
    switch (mode) {
        case 'auto_if_available':
            return 'Automático si hay cupo';
        case 'auto_decline':
            return 'Automático o rechazar sin cupo';
        case 'manual':
        default:
            return 'Manual — revisar cada solicitud';
    }
}

export type MarketplaceGroupSort = 'recommended' | 'price_asc' | 'name_asc';

export const MARKETPLACE_SORT_OPTIONS: { value: MarketplaceGroupSort; label: string }[] = [
    { value: 'recommended', label: 'Recomendados' },
    { value: 'price_asc', label: 'Menor precio' },
    { value: 'name_asc', label: 'Nombre (A–Z)' },
];

export function profileLocation(group: ProviderGroup) {
    return [group.comunaBase, group.region].filter(Boolean).join(', ') || 'Zona por confirmar';
}

export function zonesLabel(group: ProviderGroup, maxVisible = 3) {
    if (group.serviceComunas.length === 0) return 'Zonas por publicar';
    const visible = group.serviceComunas.slice(0, maxVisible).join(', ');
    return group.serviceComunas.length > maxVisible
        ? `${visible} +${group.serviceComunas.length - maxVisible}`
        : visible;
}

export function zonesText(group: ProviderGroup) {
    return group.serviceComunas.length > 0
        ? group.serviceComunas.join(', ')
        : 'Zonas de atención por publicar.';
}

/** Texto breve para perfil: pocas comunas nombradas, el resto resumido. */
export function profileZonesSummary(group: ProviderGroup, maxVisible = 4): string | null {
    const comunas = group.serviceComunas ?? [];
    if (comunas.length === 0) return null;
    if (comunas.length <= maxVisible) return comunas.join(', ');
    const visible = comunas.slice(0, maxVisible).join(', ');
    const rest = comunas.length - maxVisible;
    return `${visible} y ${rest} comuna${rest === 1 ? '' : 's'} más`;
}

export function formatGroupRating(group: ProviderGroup): string | null {
    if (group.ratingCount <= 0) return null;
    return `${group.ratingAverage.toFixed(1)} (${group.ratingCount})`;
}

export function verificationBadgeLabel(group: ProviderGroup): string | null {
    if (group.isVerified) return 'Verificado';
    return null;
}

export function groupDescriptionFallback(group: ProviderGroup) {
    return group.description?.trim() || 'Este mariachi aún no publica descripción comercial.';
}

export function contactAvailabilityLabel(group: ProviderGroup) {
    if (group.whatsapp || group.phone) {
        return 'Teléfono y WhatsApp al confirmar la solicitud';
    }
    return 'Por definir';
}

export function formatPaymentMethods(group: ProviderGroup): string[] {
    const methods: string[] = [];
    if (group.acceptsCash) methods.push('Efectivo');
    if (group.acceptsTransfer) methods.push('Transferencia');
    if (group.acceptsMp) methods.push('Mercado Pago');
    if (group.acceptsPaymentLink && group.paymentLinkUrl) methods.push('Link de pago');
    if (group.requiresAdvancePayment) methods.push('Anticipo requerido');
    return methods;
}

export function policySlaLabel(hours: number | null | undefined) {
    const value = hours ?? 24;
    return `${value} h para responder`;
}

export function filterMarketplaceGroupsByName(items: ProviderGroup[], query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((group) => {
        const haystack = [group.name, group.description ?? '', group.comunaBase ?? '', group.region ?? ''].join(' ').toLowerCase();
        return haystack.includes(q);
    });
}

export function sortMarketplaceGroups(items: ProviderGroup[], sort: MarketplaceGroupSort) {
    const copy = [...items];
    if (sort === 'price_asc') {
        return copy.sort((a, b) => (a.startingPrice ?? Number.MAX_SAFE_INTEGER) - (b.startingPrice ?? Number.MAX_SAFE_INTEGER));
    }
    if (sort === 'name_asc') {
        return copy.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }
    return copy.sort((a, b) => {
        if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
        return a.name.localeCompare(b.name, 'es');
    });
}

export function cheapestService(services: ProviderGroupService[]): ProviderGroupService | null {
    if (services.length === 0) return null;
    return services.reduce((min, service) => (service.price < min.price ? service : min));
}

export function extraServicesCount(group: ProviderGroup) {
    const preview = group.servicesPreview?.length ?? 0;
    const total = group.activeServicesCount ?? preview;
    return Math.max(0, total - preview);
}

export function bookingPolicySummary(group: ProviderGroup) {
    return {
        sla: policySlaLabel(group.slaHours),
        mode: bookingModeLabel(group.bookingMode),
    };
}
