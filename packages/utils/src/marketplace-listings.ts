import { apiFetch } from './api-client.js';
import type { PublicProfileVertical } from './public-profile-settings.js';

type MarketplaceListingItem = {
    status?: string;
};

type ListingsMineResponse = {
    ok?: boolean;
    items?: MarketplaceListingItem[];
};

/** Indica si el error de API corresponde al límite de avisos del plan. */
export function isMarketplaceListingPlanLimitError(error: string | null | undefined): boolean {
    if (!error) return false;
    return /plan.*permite hasta|mejora tu plan/i.test(error);
}

/** Cantidad de avisos activos del usuario en marketplace (Autos / Propiedades). */
export async function fetchMyMarketplaceListingCount(vertical: PublicProfileVertical): Promise<number> {
    const { data } = await apiFetch<ListingsMineResponse>(
        `/api/listings?vertical=${vertical}&mine=true`,
        { method: 'GET' },
    );
    if (!data?.ok || !Array.isArray(data.items)) return 0;
    return data.items.filter((item) => item.status !== 'archived').length;
}
