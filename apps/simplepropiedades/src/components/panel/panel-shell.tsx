'use client';

import { useMemo, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { IconArrowLeft } from '@tabler/icons-react';
import { useAuth } from '@simple/auth';
import { PanelShell as SharedPanelShell, applyMarketplaceMiNegocioNavBadge, useMarketplacePanelBilling } from '@simple/ui/panel';
import { PanelBottomNav } from '@/components/panel/panel-bottom-nav';
import { getPanelNavItems, isPanelNavActive, panelRoleLabel, type PanelRole } from '@/components/panel/panel-nav-config';
import { fetchSubscriptionCatalog } from '@/lib/payments';

const STORAGE_COLLAPSED = 'simplepropiedades:panel:collapsed';
const SUBSCRIPTION_HREF = '/panel/mi-cuenta/suscripcion';

export function PanelShell({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const role: PanelRole = user?.role ?? 'user';
    const pathname = usePathname() ?? '';
    const hidePanelBottomNav = pathname.startsWith('/panel/publicar');
    const { billing } = useMarketplacePanelBilling(SUBSCRIPTION_HREF, fetchSubscriptionCatalog);

    const navItems = useMemo(
        () => applyMarketplaceMiNegocioNavBadge(
            getPanelNavItems(role).map(({ href, label, icon, badge }) => ({ href, label, icon, badge })),
            billing,
            role,
        ),
        [billing, role],
    );
    const activeHref = useMemo(
        () => navItems.find((item) => isPanelNavActive(pathname, item.href))?.href ?? null,
        [navItems, pathname],
    );

    const userName = user?.name?.trim() || 'Usuario';
    const roleLabel = panelRoleLabel(role);

    return (
        <SharedPanelShell
            navItems={navItems}
            user={{ name: userName, role: roleLabel, avatar: user?.avatar }}
            roleLabel={roleLabel}
            collapsedStorageKey={STORAGE_COLLAPSED}
            footerHref="/ventas"
            footerLabel="Ir al marketplace"
            footerIcon={IconArrowLeft}
            bottomNav={hidePanelBottomNav ? undefined : <PanelBottomNav />}
            isVerified={user?.status === 'verified'}
            activeHref={activeHref}
        >
            {children}
        </SharedPanelShell>
    );
}
