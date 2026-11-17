import type { Profiles, ProviderGroup } from '@/lib/serenatas-api';

export type MarketplaceRequestBlock =
    | { allowed: true }
    | { allowed: false; reason: string };

export function resolveMarketplaceRequestBlock(
    _profiles: Profiles | null | undefined,
    options?: {
        isLoggedIn?: boolean;
        profilesReady?: boolean;
        userId?: string | null;
        group?: Pick<ProviderGroup, 'ownerUserId' | 'isDemo'> | null;
    },
): MarketplaceRequestBlock {
    if (options?.group?.isDemo) {
        return { allowed: false, reason: 'Este mariachi no recibe solicitudes desde la web en este momento.' };
    }

    if (options?.isLoggedIn === false) {
        return { allowed: true };
    }

    if (options?.profilesReady === false) {
        return { allowed: false, reason: 'Verificando tu cuenta…' };
    }

    const userId = options?.userId?.trim();
    const ownerUserId = options?.group?.ownerUserId;
    if (userId && ownerUserId && userId === ownerUserId) {
        return {
            allowed: false,
            reason: 'No puedes solicitar serenatas de tu propio mariachi.',
        };
    }

    return { allowed: true };
}

export function canRequestMarketplaceAsClient(
    profiles: Profiles | null | undefined,
    options?: Parameters<typeof resolveMarketplaceRequestBlock>[1],
): boolean {
    return resolveMarketplaceRequestBlock(profiles, options).allowed;
}
