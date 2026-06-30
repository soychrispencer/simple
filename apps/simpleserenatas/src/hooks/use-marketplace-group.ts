'use client';

import useSWR from 'swr';
import { serenatasApi } from '@/lib/serenatas-api';
import type { MarketplaceGroupData } from '@/lib/marketplace-group-fetch';

export type { MarketplaceGroupData } from '@/lib/marketplace-group-fetch';

export async function fetchMarketplaceGroupClient(slug: string): Promise<MarketplaceGroupData> {
    const groupResponse = await serenatasApi.marketplaceGroupBySlug(slug);
    if (!groupResponse.ok || !groupResponse.item) {
        throw new Error(groupResponse.error ?? 'Mariachi no encontrado');
    }
    const catalogResponse = await serenatasApi.marketplaceGroupCatalog(groupResponse.item.id);
    if (!catalogResponse.ok) {
        throw new Error(catalogResponse.error ?? 'No pudimos cargar el catálogo');
    }
    return {
        group: groupResponse.item,
        services: catalogResponse.services ?? [],
        packs: catalogResponse.packs ?? [],
        promotions: catalogResponse.promotions ?? [],
    };
}

export function marketplaceGroupSwrKey(slug: string | null | undefined) {
    return slug ? `marketplace-group-${slug}` : null;
}

export function useMarketplaceGroup(
    slug: string | null | undefined,
    options?: { fallbackData?: MarketplaceGroupData },
) {
    const key = marketplaceGroupSwrKey(slug);
    const { data, error, isLoading, mutate } = useSWR(
        key,
        () => fetchMarketplaceGroupClient(slug!),
        {
            revalidateOnFocus: false,
            dedupingInterval: 30_000,
            fallbackData: options?.fallbackData,
        },
    );

    return {
        group: data?.group ?? null,
        services: data?.services ?? [],
        packs: data?.packs ?? [],
        promotions: data?.promotions ?? [],
        loading: Boolean(key) && isLoading && !data,
        error: error?.message ?? null,
        refresh: mutate,
    };
}
