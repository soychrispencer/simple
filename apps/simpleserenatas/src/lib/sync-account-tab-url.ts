import type { AccountTab } from '@/lib/account-tab';
import { profileSectionHref } from '@/lib/account-tab';

/** Actualiza `account_tab` en la URL sin disparar navegación RSC de Next. */
export function syncAccountTabUrl(tab: AccountTab) {
    if (typeof window === 'undefined') return;
    const next = profileSectionHref(tab);
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === next) return;
    window.history.replaceState(window.history.state, '', next);
}
