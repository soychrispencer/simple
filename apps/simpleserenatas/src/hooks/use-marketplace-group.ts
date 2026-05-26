'use client';

import useSWR from 'swr';
import { serenatasApi, type ProviderGroup, type ProviderGroupService } from '@/lib/serenatas-api';

export type MarketplaceGroupData = {
    group: ProviderGroup;
    services: ProviderGroupService[];
};

async function fetchMarketplaceGroup(slug: string): Promise<MarketplaceGroupData> {
    const groupResponse = await serenatasApi.marketplaceGroupBySlug(slug);
    if (!groupResponse.ok || !groupResponse.item) {
        throw new Error(groupResponse.error ?? 'Mariachi no encontrado');
    }
    const servicesResponse = await serenatasApi.marketplaceGroupServices(groupResponse.item.id);
    if (!servicesResponse.ok) {
        throw new Error(servicesResponse.error ?? 'No pudimos cargar servicios');
    }
    return { group: groupResponse.item, services: servicesResponse.items };
}

export function marketplaceGroupSwrKey(slug: string | null | undefined) {
    return slug ? `marketplace-group-${slug}` : null;
}

export function useMarketplaceGroup(slug: string | null | undefined) {
    const key = marketplaceGroupSwrKey(slug);
    const { data, error, isLoading, mutate } = useSWR(key, () => fetchMarketplaceGroup(slug!), {
        revalidateOnFocus: false,
        dedupingInterval: 30_000,
    });

    return {
        group: data?.group ?? null,
        services: data?.services ?? [],
        loading: Boolean(key) && isLoading && !data,
        error: error?.message ?? null,
        refresh: mutate,
    };
}
