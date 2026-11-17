import type { Profiles } from '@/lib/serenatas-api';

export type SerenataProfileKind = 'client' | 'musician' | 'owner';

/** Tipo de perfil preferido para etiquetas; no implica que la identidad solo tenga ese rol. */
export function resolveSerenataProfileKind(profiles: Profiles | null | undefined): SerenataProfileKind | null {
    if (!profiles) return null;
    if (profiles.owner) return 'owner';
    if (profiles.musician) return 'musician';
    if (profiles.client) return 'client';
    return null;
}

export function isMusicianAccount(profiles: Profiles): boolean {
    return Boolean(profiles.musician);
}

export function isOwnerAccount(profiles: Profiles): boolean {
    return Boolean(profiles.owner);
}

export function isClientAccount(profiles: Profiles): boolean {
    return Boolean(profiles.client);
}
