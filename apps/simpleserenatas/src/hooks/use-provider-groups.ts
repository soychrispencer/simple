'use client';

import useSWR from 'swr';
import {
    serenatasApi,
    type ProviderGroup,
    type ProviderGroupApplication,
} from '@/lib/serenatas-api';

const SWR_KEY = 'serenatas-provider-groups';

type ProviderGroupsCache = {
    groups: ProviderGroup[];
    applications: ProviderGroupApplication[];
    error: string | null;
};

async function fetchProviderGroups(): Promise<ProviderGroupsCache> {
    const [groupsResponse, applicationsResponse] = await Promise.all([
        serenatasApi.myProviderGroups(),
        serenatasApi.myProviderGroupApplications(),
    ]);
    return {
        groups: groupsResponse.ok ? groupsResponse.items : [],
        applications: applicationsResponse.ok ? applicationsResponse.items : [],
        error: groupsResponse.ok ? null : groupsResponse.error ?? 'No pudimos cargar tus grupos.',
    };
}

/** Cache compartida de grupos proveedor (Mi Negocio). */
export function useProviderGroups(options?: { enabled?: boolean }) {
    const enabled = options?.enabled !== false;
    const { data, error, isLoading, mutate } = useSWR(
        enabled ? SWR_KEY : null,
        fetchProviderGroups,
        { revalidateOnFocus: false, dedupingInterval: 30_000 },
    );

    return {
        groups: data?.groups ?? [],
        applications: data?.applications ?? [],
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
