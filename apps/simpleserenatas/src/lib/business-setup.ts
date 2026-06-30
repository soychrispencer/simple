import type { BusinessSetupStep, PanelBillingAccess } from '@simple/ui/panel';
import { resolveSerenatasBillingAccess, resolveSerenatasBillingAccessFromCatalog } from '@/lib/billing-access';
import { fetchSubscriptionCatalog } from '@/lib/payments';
import { serenatasApi, type ProviderGroup } from '@/lib/serenatas-api';
import { countPricedActiveServices } from '@/lib/provider-group-publish';
import { panelMiNegocioHref } from '@/lib/panel-routes';

export type SerenatasBusinessSetupStatus = {
    steps: BusinessSetupStep[];
    billing: PanelBillingAccess;
};

function hasProviderProfile(group: ProviderGroup | null): boolean {
    if (!group) return false;
    return Boolean(
        group.name?.trim()
        && group.region?.trim()
        && group.comunaBase?.trim(),
    );
}

function hasProviderPayments(group: ProviderGroup | null): boolean {
    if (!group) return false;
    return Boolean(
        group.acceptsTransfer
        || group.acceptsMp
        || group.acceptsPaymentLink,
    );
}

export async function fetchSerenatasBusinessSetupStatus(): Promise<SerenatasBusinessSetupStatus> {
    const [catalog, planResponse, groupsResponse] = await Promise.all([
        fetchSubscriptionCatalog(),
        serenatasApi.mePlan(),
        serenatasApi.myProviderGroups(),
    ]);

    const billing: PanelBillingAccess = catalog
        ? resolveSerenatasBillingAccessFromCatalog(catalog)
        : planResponse.ok
            ? resolveSerenatasBillingAccess(planResponse)
            : {
                status: 'free',
                daysRemaining: null,
                subscriptionHref: '/panel/mi-cuenta?account_tab=subscription',
            };

    const mariachi = groupsResponse.ok && groupsResponse.items.length > 0
        ? groupsResponse.items[0]
        : null;

    let activeServiceCount = 0;
    let hasAvailability = false;

    if (mariachi) {
        const [servicesResponse, availabilityResponse] = await Promise.all([
            serenatasApi.providerGroupServices(mariachi.id),
            serenatasApi.providerGroupAvailability(mariachi.id),
        ]);
        if (servicesResponse.ok) {
            activeServiceCount = countPricedActiveServices(servicesResponse.items);
        }
        if (availabilityResponse.ok) {
            hasAvailability = availabilityResponse.item.rules.some(
                (rule) => rule.isActive !== false && Boolean(rule.startTime) && Boolean(rule.endTime),
            );
        }
    }

    const steps: BusinessSetupStep[] = [
        {
            id: 'perfil',
            label: 'Perfil público',
            description: 'Nombre, zona y datos visibles en el catálogo.',
            href: panelMiNegocioHref('datos'),
            complete: hasProviderProfile(mariachi),
        },
        {
            id: 'servicios',
            label: 'Servicios',
            description: 'Paquetes con precio para que te contraten.',
            href: panelMiNegocioHref('servicios'),
            complete: activeServiceCount > 0,
        },
        {
            id: 'horarios',
            label: 'Horario',
            description: 'Horarios y reglas para recibir solicitudes.',
            href: panelMiNegocioHref('horarios'),
            complete: hasAvailability,
        },
        {
            id: 'cobros',
            label: 'Medios de pago',
            description: 'Cómo cobras por tus serenatas.',
            href: panelMiNegocioHref('configuraciones'),
            complete: hasProviderPayments(mariachi),
        },
        {
            id: 'publicar',
            label: 'Publicar perfil',
            description: 'Aparece en el marketplace y recibe solicitudes.',
            href: panelMiNegocioHref('configuraciones'),
            complete: mariachi?.status === 'active',
        },
    ];

    return { steps, billing };
}
