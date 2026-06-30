import type { PanelBillingAccess } from './business-setup.js';

export type MarketplacePanelRole = 'user' | 'admin' | 'superadmin';

export function marketplaceMiNegocioHasProAccess(
    billing: PanelBillingAccess | null | undefined,
    role: MarketplacePanelRole = 'user',
): boolean {
    if (role === 'admin' || role === 'superadmin') return true;
    return billing?.status === 'pro';
}

export function marketplaceMiNegocioNavBadge(
    billing: PanelBillingAccess | null | undefined,
    role: MarketplacePanelRole = 'user',
): string | undefined {
    if (marketplaceMiNegocioHasProAccess(billing, role)) return undefined;
    if (!billing) return undefined;
    return 'PRO';
}

export function applyMarketplaceMiNegocioNavBadge<T extends { href: string; badge?: string }>(
    items: T[],
    billing: PanelBillingAccess | null | undefined,
    role: MarketplacePanelRole = 'user',
): T[] {
    const badge = marketplaceMiNegocioNavBadge(billing, role);
    if (!badge) return items;
    return items.map((item) => (
        item.href === '/panel/mi-negocio' ? { ...item, badge } : item
    ));
}
