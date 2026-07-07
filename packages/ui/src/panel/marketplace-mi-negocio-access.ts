import type { PanelBillingAccess } from './business-setup.js';
import { isMarketplaceLaunchActive } from '@simple/utils';

export type MarketplacePanelRole = 'user' | 'admin' | 'superadmin';

export function marketplaceMiNegocioHasProAccess(
    billing: PanelBillingAccess | null | undefined,
    role: MarketplacePanelRole = 'user',
    vertical: 'autos' | 'propiedades' = 'autos',
): boolean {
    if (isMarketplaceLaunchActive(vertical)) return true;
    if (role === 'admin' || role === 'superadmin') return true;
    return billing?.status === 'pro';
}

export function marketplaceMiNegocioNavBadge(
    billing: PanelBillingAccess | null | undefined,
    role: MarketplacePanelRole = 'user',
    vertical: 'autos' | 'propiedades' = 'autos',
): string | undefined {
    if (marketplaceMiNegocioHasProAccess(billing, role, vertical)) return undefined;
    if (!billing) return undefined;
    return 'PRO';
}

export function applyMarketplaceMiNegocioNavBadge<T extends { href: string; badge?: string }>(
    items: T[],
    billing: PanelBillingAccess | null | undefined,
    role: MarketplacePanelRole = 'user',
    vertical: 'autos' | 'propiedades' = 'autos',
): T[] {
    const badge = marketplaceMiNegocioNavBadge(billing, role, vertical);
    if (!badge) return items;
    return items.map((item) => (
        item.href === '/panel/mi-negocio' ? { ...item, badge } : item
    ));
}
