'use client';

import { useMemo, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { IconArrowLeft } from '@tabler/icons-react';
import { PanelShell as SharedPanelShell } from '@simple/ui/panel';
import { useSerenata } from '@/context/serenata-context';
import {
    getPanelNavItems,
    isPanelNavActive,
    panelAccountTypeLabel,
} from '@/components/panel/panel-nav-config';
import { sectionFromPanelPath } from '@/lib/panel-routes';
import { PanelBottomNav } from '@/components/panel/panel-bottom-nav';
import { SerenataRoleSwitcher } from '@/components/panel/serenata-role-switcher';

const STORAGE_COLLAPSED = 'simpleserenatas:panel:collapsed';

export function PanelShell({ children }: { children: ReactNode }) {
    const pathname = usePathname() ?? '';
    const { user, accountUser, mode, activeRole, profiles, solicitudesPendingCount } = useSerenata();
    const section = sectionFromPanelPath(pathname);

    const navItems = useMemo(
        () =>
            getPanelNavItems(mode, profiles, activeRole).map(({ href, label, icon, badge, id }) => ({
                href,
                label,
                icon,
                badge: id === 'solicitudes' && solicitudesPendingCount > 0
                    ? String(solicitudesPendingCount)
                    : badge,
            })),
        [activeRole, mode, profiles, solicitudesPendingCount],
    );

    const activeHref = useMemo(
        () => navItems.find((item) => isPanelNavActive(pathname, item.href, section))?.href ?? null,
        [navItems, pathname, section],
    );

    const userName = accountUser?.name?.trim() || user?.name?.trim() || 'Usuario';
    const accountTypeLabel = useMemo(() => panelAccountTypeLabel(profiles, activeRole), [activeRole, profiles]);

    return (
        <SharedPanelShell
            navItems={navItems}
            user={{ name: userName, role: accountTypeLabel, avatar: accountUser?.avatar || user?.avatar }}
            roleLabel={accountTypeLabel}
            collapsedStorageKey={STORAGE_COLLAPSED}
            footerHref="/mariachis"
            footerLabel="Explorar mariachis"
            footerIcon={IconArrowLeft}
            bottomNav={<PanelBottomNav />}
            chromeEnabled
            isVerified={user?.status === 'verified'}
            activeHref={activeHref}
        >
            <>
                <SerenataRoleSwitcher />
                {children}
            </>
        </SharedPanelShell>
    );
}
