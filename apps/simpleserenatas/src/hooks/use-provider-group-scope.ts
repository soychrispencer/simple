'use client';

import { useCallback } from 'react';
import { ensureProviderGroupDraft } from '@/lib/ensure-provider-group';
import { useMyMariachi } from '@/hooks/use-my-mariachi';
import type { ProviderGroup } from '@/lib/serenatas-api';

export function useProviderGroupScope(refreshPanel?: () => Promise<void>) {
    const { mariachi, loading, error, refresh: refreshMariachi } = useMyMariachi();

    const refreshAll = useCallback(async () => {
        await refreshMariachi();
        await refreshPanel?.();
    }, [refreshMariachi, refreshPanel]);

    const ensureGroup = useCallback(
        async (name?: string): Promise<ProviderGroup | null> => {
            const result = await ensureProviderGroupDraft({
                name,
                refresh: refreshAll,
            });
            if (!result.ok) return null;
            return result.item;
        },
        [refreshAll],
    );

    return {
        group: mariachi,
        loading,
        error,
        refresh: refreshAll,
        ensureGroup,
    };
}
