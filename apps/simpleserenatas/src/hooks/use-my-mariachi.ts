'use client';

import { useProviderGroups } from '@/hooks/use-provider-groups';

/** Un dueño = un mariachi comercial (primer provider group). */
export function useMyMariachi(options?: { enabled?: boolean }) {
    const { groups, loading, error, refresh, mutate } = useProviderGroups(options);
    const mariachi = groups[0] ?? null;

    return {
        mariachi,
        hasMariachi: mariachi != null,
        loading,
        error,
        refresh,
        mutate,
    };
}
