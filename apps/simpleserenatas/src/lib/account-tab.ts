import type { AppMode, SerenataRole } from '@/lib/app-mode';
import type { Profiles } from '@/lib/serenatas-api';

function ownerFeaturesEnabled(profiles: Profiles): boolean {
    return Boolean(profiles.owner);
}
import { profilePanelHref } from '@/lib/panel-routes';

export const ACCOUNT_TAB_VALUES = [
    'data',
    'security',
    'musician',
    'ubicacion',
    'notifications',
    'appearance',
    'integrations',
    'subscription',
] as const;

export type AccountTab = (typeof ACCOUNT_TAB_VALUES)[number];

const ACCOUNT_TAB_STORAGE_KEY = 'simple-serenatas:account-tab';

const LEGACY_ACCOUNT_TAB_ALIASES: Record<string, AccountTab> = {
    plan: 'subscription',
    seguridad: 'security',
    suscripcion: 'subscription',
    suscripciones: 'subscription',
    addresses: 'ubicacion',
    direcciones: 'ubicacion',
    musico: 'musician',
    'perfil-publico': 'musician',
    'datos-musico': 'musician',
    'datos-personales': 'data',
    personal: 'data',
    cuenta: 'data',
    notificaciones: 'notifications',
    apariencia: 'appearance',
    appearance: 'appearance',
    integraciones: 'integrations',
};

export function normalizeAccountTab(value: string | null | undefined): AccountTab | null {
    if (!value) return null;
    const legacy = LEGACY_ACCOUNT_TAB_ALIASES[value];
    if (legacy) return legacy;
    return isAccountTab(value) ? value : null;
}

export function isAccountTab(value: string | null | undefined): value is AccountTab {
    return Boolean(value && (ACCOUNT_TAB_VALUES as readonly string[]).includes(value));
}

function accountTabStorageKey(userId: string | null | undefined, role: SerenataRole | undefined): string | null {
    return userId ? `${ACCOUNT_TAB_STORAGE_KEY}:${userId}:${role ?? 'client'}` : null;
}

export function readStoredAccountTab(userId?: string | null, role?: SerenataRole): AccountTab | null {
    if (typeof window === 'undefined') return null;
    const key = accountTabStorageKey(userId, role);
    if (!key) return null;
    try {
        return normalizeAccountTab(window.localStorage.getItem(key));
    } catch {
        return null;
    }
}

export function storeAccountTab(tab: AccountTab, userId?: string | null, role?: SerenataRole): void {
    if (typeof window === 'undefined') return;
    const key = accountTabStorageKey(userId, role);
    if (!key) return;
    try {
        window.localStorage.setItem(key, tab);
    } catch {
        // La preferencia no debe bloquear la navegación.
    }
}

export function resolveAccountTab(
    urlTab: string | null | undefined,
    userId?: string | null,
    role?: SerenataRole,
): AccountTab {
    return normalizeAccountTab(urlTab) ?? readStoredAccountTab(userId, role) ?? 'data';
}

export function profileSectionHref(accountTab?: AccountTab): string {
    return profilePanelHref(accountTab);
}

/** Pestañas visibles según el perfil de trabajo activo y las capacidades disponibles. */
export function getAccountPillItems(
    mode: AppMode,
    profiles: Profiles,
    activeRole?: SerenataRole,
): { key: AccountTab; label: string }[] {
    const role = activeRole ?? (profiles.owner ? 'owner' : profiles.musician ? 'musician' : 'client');
    const items: { key: AccountTab; label: string }[] = [
        { key: 'data', label: 'Datos personales' },
        ...(mode === 'work' && role === 'musician' && Boolean(profiles.musician)
            ? [{ key: 'musician' as const, label: 'Perfil público' }]
            : []),
        { key: 'ubicacion', label: 'Ubicación' },
        { key: 'notifications', label: 'Notificaciones' },
        { key: 'appearance', label: 'Apariencia' },
        { key: 'integrations', label: 'Integraciones' },
    ];
    if (mode === 'work' && (
        (role === 'owner' && ownerFeaturesEnabled(profiles))
        || (role === 'musician' && Boolean(profiles.musician))
    )) {
        items.push({ key: 'subscription', label: 'Suscripción' });
    }
    items.push({ key: 'security', label: 'Seguridad' });
    return items;
}

export function isAccountTabVisible(
    tab: AccountTab,
    mode: AppMode,
    profiles: Profiles,
    activeRole?: SerenataRole,
): boolean {
    return getAccountPillItems(mode, profiles, activeRole).some((item) => item.key === tab);
}

/** Rutas legacy /panel/mi-negocio/* → pestaña de Mi cuenta */
export const CONFIG_SLUG_TO_ACCOUNT_TAB: Record<string, AccountTab> = {
    cuenta: 'data',
    'datos-personales': 'data',
    personal: 'data',
    seguridad: 'security',
    musico: 'musician',
    'perfil-publico': 'musician',
    'datos-musico': 'musician',
    direcciones: 'ubicacion',
    ubicacion: 'ubicacion',
    addresses: 'ubicacion',
    integraciones: 'integrations',
    suscripciones: 'subscription',
    suscripcion: 'subscription',
    subscription: 'subscription',
    plan: 'subscription',
    notificaciones: 'notifications',
    apariencia: 'appearance',
    appearance: 'appearance',
};
