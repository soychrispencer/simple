import type { ProviderGroup, ProviderGroupService } from '@/lib/serenatas-api';
import { panelMiNegocioHref } from '@/lib/panel-routes';
import { providerPublicMediaMissing } from '@/lib/marketplace-group-display';

export type ProviderGroupPublishInput = Pick<
    ProviderGroup,
    'name' | 'logoUrl' | 'coverUrl' | 'region' | 'comunaBase' | 'serviceComunas'
>;

export type PublishRequirement = {
    id: string;
    label: string;
    met: boolean;
    href: string;
};

export function countPricedActiveServices(services: ProviderGroupService[]): number {
    return services.filter((service) => service.isActive !== false && Number(service.price) > 0).length;
}

export function providerGroupPublishMissing(
    group: ProviderGroupPublishInput,
    activeServiceCount: number,
): string[] {
    const missing: string[] = [];
    if (!group.name?.trim() || group.name.trim().length < 2) {
        missing.push('nombre del mariachi');
    }
    missing.push(...providerPublicMediaMissing(group));
    if (!group.region?.trim()) missing.push('región');
    if (!group.comunaBase?.trim()) missing.push('comuna base');
    if (!group.serviceComunas?.length) missing.push('zonas de trabajo');
    if (activeServiceCount < 1) missing.push('al menos un servicio con precio');
    return missing;
}

export function canPublishProviderGroup(group: ProviderGroupPublishInput, activeServiceCount: number): boolean {
    return providerGroupPublishMissing(group, activeServiceCount).length === 0;
}

export function publishBlockersErrorMessage(missing: string[]): string {
    if (missing.length === 0) return '';
    return `Antes de publicar completa: ${missing.join(', ')}.`;
}

export function getProviderGroupPublishRequirements(
    group: ProviderGroupPublishInput | null,
    activeServiceCount: number,
): PublishRequirement[] {
    if (!group) return [];

    const items: PublishRequirement[] = [
        {
            id: 'name',
            label: 'Nombre del mariachi',
            met: Boolean(group.name?.trim() && group.name.trim().length >= 2),
            href: panelMiNegocioHref('datos'),
        },
        {
            id: 'logo',
            label: 'Logo',
            met: Boolean(group.logoUrl?.trim()),
            href: panelMiNegocioHref('datos'),
        },
        {
            id: 'cover',
            label: 'Portada (16:9)',
            met: Boolean(group.coverUrl?.trim()),
            href: panelMiNegocioHref('datos'),
        },
        {
            id: 'region',
            label: 'Región y comuna base',
            met: Boolean(group.region?.trim() && group.comunaBase?.trim()),
            href: panelMiNegocioHref('datos'),
        },
        {
            id: 'zones',
            label: 'Zonas de trabajo',
            met: (group.serviceComunas?.length ?? 0) > 0,
            href: panelMiNegocioHref('datos'),
        },
        {
            id: 'services',
            label: 'Al menos un servicio con precio',
            met: activeServiceCount > 0,
            href: panelMiNegocioHref('servicios'),
        },
    ];

    return items;
}
