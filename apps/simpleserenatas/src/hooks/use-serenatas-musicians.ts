'use client';

import useSWR from 'swr';
import { serenatasApi, type MusicianDirectoryItem } from '@/lib/serenatas-api';

const SWR_KEY = 'serenatas-musicians-directory';

async function fetchMusicians(): Promise<MusicianDirectoryItem[]> {
    const response = await serenatasApi.musicians();
    return response.ok ? response.items : [];
}

/** Directorio de músicos del owner (para la vista de Grupos). */
export function useSerenatasMusicians() {
    const { data, error, isLoading, mutate } = useSWR(SWR_KEY, fetchMusicians, {
        revalidateOnFocus: false,
        dedupingInterval: 30_000,
    });

    return {
        musicians: data ?? [],
        loading: isLoading && !data,
        error: error instanceof Error ? error.message : null,
        refresh: async () => {
            await mutate();
        },
    };
}
