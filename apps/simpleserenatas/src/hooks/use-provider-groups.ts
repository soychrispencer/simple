'use client';

import useSWR from 'swr';
import { serenatasApi, type ProviderGroup } from '@/lib/serenatas-api';

const SWR_KEY = 'serenatas-provider-groups';

type ProviderGroupsCache = {
    groups: ProviderGroup[];
    error: string | null;
};

async function fetchProviderGroups(): Promise<ProviderGroupsCache> {
    const groupsResponse = await serenatasApi.myProviderGroups();
    return {
        groups: groupsResponse.ok ? groupsResponse.items.slice(0, 1) : [],
        error: groupsResponse.ok ? null : groupsResponse.error ?? 'No pudimos cargar tu mariachi.',
    };
}

/** Cache compartida de grupos del mariachi (Mi Negocio). */
export function useProviderGroups(options?: { enabled?: boolean }) {
    const enabled = options?.enabled !== false;
    const { data, error, isLoading, mutate } = useSWR(
        enabled ? SWR_KEY : null,
        fetchProviderGroups,
        { revalidateOnFocus: false, dedupingInterval: 30_000 },
    );

    return {
        groups: data?.groups ?? [],
        loading: enabled && isLoading && !data,
        error: error instanceof Error ? error.message : data?.error ?? null,
        refresh: async () => {
            await mutate();
        },
        mutate,
    };
}

export function providerGroupsSwrKey() {
    return SWR_KEY;
}
