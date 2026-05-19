import { profilePanelHref } from '@/lib/panel-routes';

export const ACCOUNT_TAB_VALUES = [
    'data',
    'security',
    'addresses',
    'notifications',
    'integrations',
    'subscription',
] as const;

export type AccountTab = (typeof ACCOUNT_TAB_VALUES)[number];

export function isAccountTab(value: string | null | undefined): value is AccountTab {
    return Boolean(value && (ACCOUNT_TAB_VALUES as readonly string[]).includes(value));
}

export function readStoredAccountTab(): AccountTab | null {
    if (typeof window === 'undefined') return null;
    const stored = window.localStorage.getItem('account_tab');
    return isAccountTab(stored) ? stored : null;
}

export function profileSectionHref(accountTab?: AccountTab): string {
    return profilePanelHref(accountTab);
}

/** Rutas legacy /panel/configuracion/* → pestaña de Mi cuenta */
export const CONFIG_SLUG_TO_ACCOUNT_TAB: Record<string, AccountTab> = {
    cuenta: 'data',
    'datos-personales': 'data',
    personal: 'data',
    direcciones: 'addresses',
    seguridad: 'security',
    integraciones: 'integrations',
    suscripciones: 'subscription',
    suscripcion: 'subscription',
    notificaciones: 'notifications',
};
