import type { AppMode } from '@/lib/app-mode';
import type { Profiles } from '@/lib/serenatas-api';

function ownerFeaturesEnabled(profiles: Profiles): boolean {
    return Boolean(profiles.owner);
}
import { profilePanelHref } from '@/lib/panel-routes';

export const ACCOUNT_TAB_VALUES = [
    'data',
    'musician',
    'addresses',
    'notifications',
    'integrations',
    'subscription',
] as const;

export type AccountTab = (typeof ACCOUNT_TAB_VALUES)[number];

const LEGACY_ACCOUNT_TAB_ALIASES: Record<string, AccountTab> = {
    plan: 'subscription',
    suscripcion: 'subscription',
    suscripciones: 'subscription',
};

export function normalizeAccountTab(value: string | null | undefined): AccountTab | null {
    if (!value) return null;
    if (value === 'security') return 'data';
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

/** Pestañas visibles según modo y perfiles (suscripción e integraciones solo dueño en trabajo). */
export function getAccountPillItems(mode: AppMode, profiles: Profiles): { key: AccountTab; label: string }[] {
    const items: { key: AccountTab; label: string }[] = [
        { key: 'data', label: 'Datos personales' },
        ...(mode === 'work' && profiles.musician
            ? [{ key: 'musician' as const, label: 'Perfil público' }]
            : []),
        { key: 'addresses', label: 'Direcciones' },
        { key: 'notifications', label: 'Notificaciones' },
    ];
    if (mode === 'work' && ownerFeaturesEnabled(profiles)) {
        items.push({ key: 'integrations', label: 'Integraciones' });
        items.push({ key: 'subscription', label: 'Suscripción' });
    }
    return items;
}

export function isAccountTabVisible(tab: AccountTab, mode: AppMode, profiles: Profiles): boolean {
    return getAccountPillItems(mode, profiles).some((item) => item.key === tab);
}

/** Rutas legacy /panel/configuracion/* → pestaña de Mi cuenta */
export const CONFIG_SLUG_TO_ACCOUNT_TAB: Record<string, AccountTab> = {
    cuenta: 'data',
    'datos-personales': 'data',
    personal: 'data',
    musico: 'musician',
    'perfil-publico': 'musician',
    'datos-musico': 'musician',
    direcciones: 'addresses',
    seguridad: 'data',
    integraciones: 'integrations',
    suscripciones: 'subscription',
    suscripcion: 'subscription',
    subscription: 'subscription',
    plan: 'subscription',
    notificaciones: 'notifications',
};
