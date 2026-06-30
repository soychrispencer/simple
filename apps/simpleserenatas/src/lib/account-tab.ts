import type { AppMode } from '@/lib/app-mode';
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
    'integrations',
    'subscription',
] as const;

export type AccountTab = (typeof ACCOUNT_TAB_VALUES)[number];

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

export function readStoredAccountTab(): AccountTab | null {
    if (typeof window === 'undefined') return null;
    const stored = window.localStorage.getItem('account_tab');
    return normalizeAccountTab(stored);
}

export function resolveAccountTab(urlTab: string | null | undefined): AccountTab {
    return normalizeAccountTab(urlTab) ?? readStoredAccountTab() ?? 'data';
}

export function profileSectionHref(accountTab?: AccountTab): string {
    return profilePanelHref(accountTab);
}

/** Pestañas visibles según modo y perfiles. La suscripción solo aplica a dueños. */
export function getAccountPillItems(mode: AppMode, profiles: Profiles): { key: AccountTab; label: string }[] {
    const items: { key: AccountTab; label: string }[] = [
        { key: 'data', label: 'Datos personales' },
        ...(mode === 'work' && profiles.musician
            ? [{ key: 'musician' as const, label: 'Perfil público' }]
            : []),
        { key: 'ubicacion', label: 'Ubicación' },
        { key: 'notifications', label: 'Notificaciones' },
        { key: 'integrations', label: 'Integraciones' },
    ];
    if (mode === 'work' && ownerFeaturesEnabled(profiles)) {
        items.push({ key: 'subscription', label: 'Suscripción' });
    }
    items.push({ key: 'security', label: 'Seguridad' });
    return items;
}

export function isAccountTabVisible(tab: AccountTab, mode: AppMode, profiles: Profiles): boolean {
    return getAccountPillItems(mode, profiles).some((item) => item.key === tab);
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
};
