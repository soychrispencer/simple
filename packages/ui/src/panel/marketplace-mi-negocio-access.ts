import type { PanelBillingAccess } from './business-setup.js';
import { isMarketplaceLaunchActive } from '@simple/utils';

export function marketplaceMiNegocioHasProAccess(
    billing: PanelBillingAccess | null | undefined,
    vertical: 'autos' | 'propiedades' = 'autos',
): boolean {
    if (isMarketplaceLaunchActive(vertical)) return true;
    return billing?.status === 'pro';
}

export function marketplaceMiNegocioNavBadge(
    billing: PanelBillingAccess | null | undefined,
    vertical: 'autos' | 'propiedades' = 'autos',
): string | undefined {
    if (marketplaceMiNegocioHasProAccess(billing, vertical)) return undefined;
    if (!billing) return undefined;
    return 'PRO';
}

export function applyMarketplaceMiNegocioNavBadge<T extends { href: string; badge?: string }>(
    items: T[],
    billing: PanelBillingAccess | null | undefined,
    vertical: 'autos' | 'propiedades' = 'autos',
): T[] {
    const badge = marketplaceMiNegocioNavBadge(billing, vertical);
    if (!badge) return items;
    return items.map((item) => (
        item.href === '/panel/mi-negocio' ? { ...item, badge } : item
    ));
}
