import type { BusinessSetupStep, PanelBillingAccess } from '@simple/ui/panel';
import { resolvePanelBillingFromCatalog } from '@simple/ui/panel';
import { fetchAccountPublicProfile } from '@simple/utils';
import { fetchMyPanelListings } from '@/lib/panel-listings';
import { fetchSubscriptionCatalog } from '@/lib/payments';

export type MarketplaceBusinessSetupStatus = {
    steps: BusinessSetupStep[];
    billing: PanelBillingAccess;
};

export async function fetchAutosBusinessSetupStatus(): Promise<MarketplaceBusinessSetupStatus> {
    const [profileResponse, listingsResponse, catalog] = await Promise.all([
        fetchAccountPublicProfile('autos'),
        fetchMyPanelListings(),
        fetchSubscriptionCatalog(),
    ]);

    const billing = resolvePanelBillingFromCatalog(catalog, '/panel/mi-cuenta/suscripcion');
    const featureEnabled = profileResponse?.featureEnabled ?? false;

    if (!featureEnabled && billing.status === 'free') {
        return { steps: [], billing };
    }

    const profile = profileResponse?.profile ?? null;
    const hasProfile = Boolean(
        profile?.displayName?.trim()
        && (profile.publicPhone?.trim() || profile.publicWhatsapp?.trim()),
    );
    const hasListing = listingsResponse.items.length > 0;

    const steps: BusinessSetupStep[] = [
        {
            id: 'perfil',
            label: 'Perfil público',
            description: 'Nombre y contacto visibles en tu ficha de vendedor.',
            href: '/panel/mi-negocio',
            complete: hasProfile,
        },
        {
            id: 'publicacion',
            label: 'Primera publicación',
            description: 'Sube tu primer vehículo al marketplace.',
            href: '/panel/publicar',
            complete: hasListing,
        },
    ];

    return { steps, billing };
}
