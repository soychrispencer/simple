import type { OwnerProfile, Profiles } from '@/lib/serenatas-api';

/** Modo de la app: cliente o operación de grupo/músico. */
export type AppMode = 'client' | 'work';

export const APP_MODE_STORAGE_KEY = 'serenatas-app-mode';
/** Clave legada (`musician` / `owner` / perfiles antiguos); se migra al guardar modo. */
const LEGACY_PROFILE_STORAGE_KEY = 'serenatas-active-profile';

/** Perfil dueño; la suscripción ya no restringe el panel. */
export function isOwnerSubscriptionActive(
    owner: OwnerProfile | null | undefined,
): boolean {
    return Boolean(owner);
}

export function ownerFeaturesEnabled(profiles: Profiles): boolean {
    return Boolean(profiles.owner);
}

export function hasWorkProfile(profiles: Profiles): boolean {
    return Boolean(profiles.musician) || Boolean(profiles.owner);
}

export function hasClientProfile(profiles: Profiles): boolean {
    return Boolean(profiles.client);
}

/** Preferencia de ?as= para API en modo trabajo (usa owner si tiene perfil de dueño). */
export function workApiAs(profiles: Profiles): 'musician' | 'owner' {
    if (ownerFeaturesEnabled(profiles)) return 'owner';
    if (profiles.musician) return 'musician';
    return 'musician';
}

export function readStoredAppMode(): AppMode {
    if (typeof window === 'undefined') return 'client';
    const appMode = window.localStorage.getItem(APP_MODE_STORAGE_KEY);
    if (appMode === 'client' || appMode === 'work') return appMode;
    if (appMode === 'musician' || appMode === 'owner') return 'work';

    const legacyProfile = window.localStorage.getItem(LEGACY_PROFILE_STORAGE_KEY);
    if (legacyProfile === 'musician' || (legacyProfile === 'owner' || legacyProfile === 'admin') || legacyProfile === 'coordinator') {
        return 'work';
    }

    return 'client';
}

export function persistAppMode(mode: AppMode) {
    window.localStorage.setItem(APP_MODE_STORAGE_KEY, mode);
    window.localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
}

/** true si la preferencia guardada aplica a los perfiles actuales del usuario. */
export function isStoredAppModeValid(profiles: Profiles, stored: AppMode = readStoredAppMode()): boolean {
    if (stored === 'work') return hasWorkProfile(profiles);
    if (stored === 'client') return hasClientProfile(profiles);
    return false;
}

export function resolveAppModeFromProfiles(
    profiles: Profiles,
    options?: { syncStorage?: boolean },
): AppMode {
    const stored = readStoredAppMode();
    const canWork = hasWorkProfile(profiles);
    const canClient = hasClientProfile(profiles);

    let mode: AppMode;

    if (stored === 'work' && canWork) {
        mode = 'work';
    } else if (stored === 'client' && canClient) {
        mode = 'client';
    } else if (canWork && !canClient) {
        mode = 'work';
    } else if (canClient && !canWork) {
        mode = 'client';
    } else if (canWork) {
        mode = 'work';
    } else if (canClient) {
        mode = 'client';
    } else {
        mode = 'client';
    }

    if (options?.syncStorage && stored !== mode) {
        persistAppMode(mode);
    }

    return mode;
}
