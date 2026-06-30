import type { ProviderGroup, ProviderGroupCatalog, ProviderGroupService } from '@/lib/serenatas-api';

export type MarketplaceGroupData = {
    group: ProviderGroup;
    services: ProviderGroupService[];
    packs: ProviderGroupCatalog['packs'];
    promotions: ProviderGroupCatalog['promotions'];
};

function apiOrigin() {
    return (
        process.env.API_INTERNAL_URL
        ?? process.env.NEXT_PUBLIC_API_URL
        ?? 'http://127.0.0.1:4000'
    ).replace(/\/$/, '');
}

/** Fetch SSR (server) para metadata y datos iniciales del perfil público. */
export async function fetchMarketplaceGroupServer(slug: string): Promise<MarketplaceGroupData | null> {
    const origin = apiOrigin();
    const groupRes = await fetch(
        `${origin}/api/serenatas/marketplace/groups/${encodeURIComponent(slug)}`,
        { headers: { accept: 'application/json' }, next: { revalidate: 30 } },
    );
    if (!groupRes.ok) return null;
    const groupBody = (await groupRes.json()) as { ok?: boolean; item?: ProviderGroup };
    if (!groupBody.ok || !groupBody.item) return null;

    const catalogRes = await fetch(
        `${origin}/api/serenatas/marketplace/groups/${encodeURIComponent(groupBody.item.id)}/catalog`,
        { headers: { accept: 'application/json' }, next: { revalidate: 30 } },
    );
    if (!catalogRes.ok) {
        return { group: groupBody.item, services: [], packs: [], promotions: [] };
    }
    const catalogBody = (await catalogRes.json()) as {
        ok?: boolean;
        services?: ProviderGroupService[];
        packs?: MarketplaceGroupData['packs'];
        promotions?: MarketplaceGroupData['promotions'];
    };
    return {
        group: groupBody.item,
        services: catalogBody.ok && catalogBody.services ? catalogBody.services : [],
        packs: catalogBody.ok && catalogBody.packs ? catalogBody.packs : [],
        promotions: catalogBody.ok && catalogBody.promotions ? catalogBody.promotions : [],
    };
}
