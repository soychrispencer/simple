import type { OwnerProfile, Profiles } from '@/lib/serenatas-api';

/** Vistas disponibles dentro de una sola cuenta SimpleSerenatas. */
export type AppMode = 'client' | 'work';
export type SerenataRole = 'client' | 'musician' | 'owner';

/** Claves legadas; se eliminan al cargar perfiles. */
export const APP_MODE_STORAGE_KEY = 'serenatas-app-mode';
const LEGACY_PROFILE_STORAGE_KEY = 'serenatas-active-profile';
export const ACTIVE_SERENATA_ROLE_STORAGE_KEY = 'simpleserenatas:active-role';

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

export function availableSerenataRoles(profiles: Profiles | null | undefined): SerenataRole[] {
    if (!profiles) return [];
    return (['client', 'musician', 'owner'] as const).filter((role) => Boolean(profiles[role]));
}

export function resolveActiveSerenataRole(
    profiles: Profiles | null | undefined,
    preferred?: SerenataRole | string | null,
): SerenataRole {
    const available = availableSerenataRoles(profiles);
    if (preferred && available.includes(preferred as SerenataRole)) return preferred as SerenataRole;
    if (available.includes('owner')) return 'owner';
    if (available.includes('musician')) return 'musician';
    return 'client';
}

export function modeForSerenataRole(role: SerenataRole): AppMode {
    return role === 'client' ? 'client' : 'work';
}

/** El actor seleccionado viaja explícitamente en las consultas de la API. */
export function workApiAs(
    profiles: Profiles,
    activeRole?: SerenataRole,
): 'musician' | 'owner' {
    if (activeRole === 'owner' && profiles.owner) return 'owner';
    if (activeRole === 'musician' && profiles.musician) return 'musician';
    if (ownerFeaturesEnabled(profiles)) return 'owner';
    return 'musician';
}

/** Modo inicial inferido desde los perfiles disponibles. */
export function resolveAppModeFromProfiles(profiles: Profiles | null | undefined): AppMode {
    if (hasWorkProfile(profiles)) return 'work';
    return 'client';
}

/** Quita preferencias antiguas de cambio de modo/perfil. */
export function clearLegacyAppModeStorage(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(APP_MODE_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
    window.localStorage.removeItem('account_tab');
}
