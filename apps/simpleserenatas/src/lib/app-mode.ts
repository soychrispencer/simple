import type { OwnerProfile, Profiles } from '@/lib/serenatas-api';

/** Modo de la app: cliente o operación de grupo/músico (derivado del perfil, sin alternar). */
export type AppMode = 'client' | 'work';

/** Clave legada; se elimina al cargar perfiles. */
export const APP_MODE_STORAGE_KEY = 'serenatas-app-mode';
const LEGACY_PROFILE_STORAGE_KEY = 'serenatas-active-profile';

/** Perfil dueño; la prueba/Pro se evalúa en funciones comerciales, no al resolver el modo base. */
export function isOwnerSubscriptionActive(
    owner: OwnerProfile | null | undefined,
): boolean {
    return Boolean(owner);
}

export function ownerFeaturesEnabled(profiles: Profiles | null | undefined): boolean {
    return Boolean(profiles?.owner);
}

export function hasWorkProfile(profiles: Profiles | null | undefined): boolean {
    return Boolean(profiles?.musician) || Boolean(profiles?.owner);
}

export function hasClientProfile(profiles: Profiles | null | undefined): boolean {
    return Boolean(profiles?.client);
}

export function hasAnySerenataProfile(profiles: Profiles | null | undefined): boolean {
    return Boolean(profiles?.client || profiles?.musician || profiles?.owner);
}

/** Preferencia de ?as= para API en modo trabajo (usa owner si tiene perfil de dueño). */
export function workApiAs(profiles: Profiles): 'musician' | 'owner' {
    if (ownerFeaturesEnabled(profiles)) return 'owner';
    if (profiles?.musician) return 'musician';
    return 'musician';
}

/** Modo fijado por los perfiles de la cuenta (sin localStorage ni switch). */
export function resolveAppModeFromProfiles(profiles: Profiles | null | undefined): AppMode {
    if (hasWorkProfile(profiles)) return 'work';
    return 'client';
}

/** Quita preferencias antiguas de cambio de modo/perfil. */
export function clearLegacyAppModeStorage(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(APP_MODE_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
}
