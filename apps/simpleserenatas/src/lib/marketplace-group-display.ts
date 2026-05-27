import type { ProviderBookingMode, ProviderGroup, ProviderGroupService, ProviderGroupStatus } from '@/lib/serenatas-api';

export function providerGroupStatusLabel(status: ProviderGroupStatus | null | undefined): string {
    switch (status) {
        case 'active':
            return 'Publicado';
        case 'paused':
            return 'Pausado (oculto)';
        case 'rejected':
            return 'Rechazado';
        case 'draft':
        default:
            return 'Borrador';
    }
}

export function bookingModeLabel(mode: ProviderBookingMode | null | undefined): string {
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
    { value: 'recommended', label: 'Más valorados' },
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

/** Cobertura en tarjetas (texto corto + tooltip con detalle). */
export function zonesCoverageChip(group: ProviderGroup): { label: string; title: string } | null {
    const comunas = group.serviceComunas ?? [];
    if (comunas.length === 0) return null;
    if (comunas.length === 1) {
        return {
            label: comunas[0]!,
            title: `Puede ir a serenatas en ${comunas[0]}`,
        };
    }
    return {
        label: `${comunas.length} comunas`,
        title: `Puede ir a serenatas en ${comunas.length} comunas: ${comunas.join(', ')}`,
    };
}

export function profileBaseLocationLines(group: ProviderGroup) {
    const comuna = group.comunaBase?.trim() || 'Zona por confirmar';
    const region = group.region?.trim() || '';
    const full = profileLocation(group);
    return { comuna, region, full };
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

export function normalizeGroupRating(group: Pick<ProviderGroup, 'ratingAverage' | 'ratingCount'>): {
    average: number;
    count: number;
} {
    const count = Math.max(0, Number(group.ratingCount) || 0);
    if (count <= 0) return { average: 0, count: 0 };
    const average = Number(group.ratingAverage);
    return {
        average: Number.isFinite(average) ? Math.min(5, Math.max(0, average)) : 0,
        count,
    };
}

export function isRecentlyCreatedGroup(
    group: Pick<ProviderGroup, 'createdAt'>,
    days = 45,
    now = Date.now(),
): boolean {
    const createdAt = Date.parse(group.createdAt);
    if (!Number.isFinite(createdAt)) return false;
    return now - createdAt >= 0 && now - createdAt <= days * 24 * 60 * 60 * 1000;
}

export function providerPublicMediaMissing(group: Pick<ProviderGroup, 'logoUrl' | 'coverUrl'>): string[] {
    const missing: string[] = [];
    if (!group.logoUrl?.trim()) missing.push('logo');
    if (!group.coverUrl?.trim()) missing.push('portada');
    return missing;
}

export function hasProviderPublicMedia(group: Pick<ProviderGroup, 'logoUrl' | 'coverUrl'>) {
    return providerPublicMediaMissing(group).length === 0;
}

export function formatGroupRating(group: Pick<ProviderGroup, 'ratingAverage' | 'ratingCount'>): string | null {
    const { average, count } = normalizeGroupRating(group);
    if (count <= 0) return null;
    return `${average.toFixed(1)} (${count})`;
}

export function formatGroupRatingShort(group: Pick<ProviderGroup, 'ratingAverage' | 'ratingCount'>): string | null {
    const { average, count } = normalizeGroupRating(group);
    if (count <= 0) return null;
    return average.toFixed(1);
}

export function groupDescriptionFallback(group: ProviderGroup) {
    return group.description?.trim() || 'Este mariachi aún no publica descripción comercial.';
}

export function hasCustomGroupDescription(group: ProviderGroup) {
    return Boolean(group.description?.trim());
}

export function baseLocationMetaLine(group: ProviderGroup) {
    const { comuna, region } = profileBaseLocationLines(group);
    return region ? `${comuna} · ${region}` : comuna;
}

export function cardFeaturedService(group: ProviderGroup) {
    const service = group.servicesPreview?.[0];
    if (!service) return null;
    const details = [
        service.musiciansCount > 0 ? `${service.musiciansCount} músicos` : null,
        service.durationMinutes > 0 ? `${service.durationMinutes} min` : null,
        service.songsIncluded > 0 ? `${service.songsIncluded} canciones` : null,
    ].filter(Boolean);
    return {
        name: service.name,
        details: details.join(' · '),
        price: service.price,
    };
}

export function extraServicesLabel(group: ProviderGroup) {
    const total = group.activeServicesCount ?? group.servicesPreview?.length ?? 0;
    if (total <= 1) return null;
    const extra = total - 1;
    return `+${extra} servicio${extra === 1 ? '' : 's'} más`;
}

export function contactAvailabilityLabel(group: ProviderGroup) {
    if (group.whatsapp || group.phone) {
        return 'Teléfono y WhatsApp al confirmar la solicitud';
    }
    return 'Por definir';
}

/** Métodos de cobro directo del mariachi (panel / uso interno). No mostrar en ficha pública del marketplace. */
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
        const ratingDiff = (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
        if (ratingDiff !== 0) return ratingDiff;
        const avgDiff = (b.ratingAverage ?? 0) - (a.ratingAverage ?? 0);
        if (avgDiff !== 0) return avgDiff;
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
