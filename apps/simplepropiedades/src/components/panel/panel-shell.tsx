'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { IconArrowLeft } from '@tabler/icons-react';
import { useAuth } from '@simple/auth';
import {
    PanelShell as SharedPanelShell,
    PanelAccountSwitcher,
    applyMarketplaceMiNegocioNavBadge,
    useMarketplacePanelBilling,
    useMarketplaceBusinessBrand,
    useMarketplaceWorkspaceNavigation,
} from '@simple/ui/panel';
import { PanelBottomNav } from '@/components/panel/panel-bottom-nav';
import { getPanelNavItems, isPanelNavActive } from '@/components/panel/panel-nav-config';
import { fetchSubscriptionCatalog } from '@/lib/payments';

const STORAGE_COLLAPSED = 'simplepropiedades:panel:collapsed';
const SUBSCRIPTION_HREF = '/panel/mi-cuenta/suscripcion';
const WORKSPACE_SETUP_DISMISSED_PREFIX = 'simplepropiedades:workspace-setup-dismissed-session';
const SETUP_NAV_HREFS = new Set(['/panel', '/panel/mi-negocio', '/panel/mi-cuenta']);

export function PanelShell({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [accountContext, setAccountContext] = useState<{
        userId: string;
        role: string | null;
        isPersonal: boolean;
    } | null>(null);
    const accountContextIsCurrent = Boolean(user?.id && accountContext?.userId === user.id);
    const accountRole = accountContextIsCurrent ? accountContext?.role ?? null : null;
    const isPersonalAccount = accountContextIsCurrent ? accountContext?.isPersonal ?? true : true;
    const pathname = usePathname() ?? '';
    const anonymousTeamRoute = pathname === '/panel/equipo' && !user;
    const hidePanelBottomNav = pathname.startsWith('/panel/publicar');
    const workspaceSetupReady = useMarketplaceWorkspaceNavigation('propiedades', WORKSPACE_SETUP_DISMISSED_PREFIX, user?.id);
    const { billing } = useMarketplacePanelBilling(SUBSCRIPTION_HREF, fetchSubscriptionCatalog, user?.id);
    const { logoUrl, displayName } = useMarketplaceBusinessBrand('propiedades', user?.id);

    const handleAccountContext = useCallback((context: {
        account: { isPersonal: boolean } | null;
        memberships: Array<{ role: string; isDefault: boolean }>;
    }) => {
        if (!user?.id) return;
        const activeMembership = context.memberships.find((membership) => membership.isDefault);
        setAccountContext({
            userId: user.id,
            role: activeMembership?.role ?? null,
            isPersonal: context.account?.isPersonal ?? true,
        });
    }, [user?.id]);

    const navItems = useMemo(() => {
        const items = applyMarketplaceMiNegocioNavBadge(
            getPanelNavItems(accountRole, isPersonalAccount, billing?.accountKind ?? null).map(({ href, label, icon, badge, section }) => ({ href, label, icon, badge, section })),
            billing,
            'propiedades',
        );
        return workspaceSetupReady ? items : items.filter((item) => SETUP_NAV_HREFS.has(item.href));
    }, [accountRole, billing, isPersonalAccount, workspaceSetupReady]);
    const activeHref = useMemo(
        () => navItems.find((item) => isPanelNavActive(pathname, item.href))?.href ?? null,
        [navItems, pathname],
    );

    const userName = displayName || user?.name?.trim() || 'Usuario';
    const roleLabel = isPersonalAccount
        ? 'Cuenta personal'
        : accountRole === 'owner'
            ? 'Dueño del espacio'
            : accountRole === 'admin'
                ? 'Administrador'
                : accountRole === 'agent'
                    ? 'Agente'
                    : 'Integrante';

    return (
        <SharedPanelShell
            navItems={anonymousTeamRoute ? [] : navItems}
            user={{ name: userName, role: roleLabel, avatar: logoUrl ?? user?.avatar }}
            roleLabel={roleLabel}
            collapsedStorageKey={STORAGE_COLLAPSED}
            footerHref="/ventas"
            footerLabel="Ir al marketplace"
            footerIcon={IconArrowLeft}
            bottomNav={hidePanelBottomNav || anonymousTeamRoute ? undefined : <PanelBottomNav workspaceReady={workspaceSetupReady} />}
            isVerified={!user || user.status === 'verified'}
            activeHref={activeHref}
        >
            <>
                <PanelAccountSwitcher userId={user?.id} onContextLoaded={handleAccountContext} />
                {children}
            </>
        </SharedPanelShell>
    );
}
