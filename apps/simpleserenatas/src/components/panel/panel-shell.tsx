'use client';

import Link from 'next/link';
import { useMemo, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { isClientMarketplaceHref } from '@/lib/client-marketplace';
import { PanelShell as SharedPanelShell } from '@simple/ui/panel';
import { PanelBottomNav, resolveActiveNavHref } from '@simple/ui/panel';
import { applyBottomNavPrimaryHighlight } from '@simple/ui/layout';
import { useSerenata } from '@/context/serenata-context';
import {
    getPanelNavItems,
    getMobileBottomNavItems,
    getPrimaryActionConfig,
    panelAccountTypeLabel,
} from '@/components/panel/panel-nav-config';
import type { Section } from '@/context/serenata-context';
import { panelSectionHref, resolvePanelActivePathname } from '@/lib/panel-routes';

const STORAGE_COLLAPSED = 'simpleserenatas:panel:collapsed';

function shouldUsePanelLink(href: string): boolean {
    if (isClientMarketplaceHref(href)) return true;
    const path = href.split('?')[0] ?? href;
    return path !== '/panel' && path.startsWith('/panel/');
}

type SerenataPanelShellProps = {
    children: ReactNode;
    section: Section;
    onSectionChange: (section: Section) => void;
};

export function SerenataPanelShell({ children, section, onSectionChange }: SerenataPanelShellProps) {
    const { user, accountUser, mode, profiles, solicitudesPendingCount } = useSerenata();
    const routerPathname = usePathname() ?? '';

    const navItems = useMemo(
        () =>
            getPanelNavItems(mode, profiles).map(({ href, label, icon, badge, id }) => ({
                href,
                label,
                icon,
                badge: id === 'solicitudes' && solicitudesPendingCount > 0
                    ? String(solicitudesPendingCount)
                    : badge,
            })),
        [mode, profiles, solicitudesPendingCount],
    );

    const visibleBottomTabs = useMemo(
        () => getMobileBottomNavItems(mode, profiles),
        [mode, profiles],
    );

    const primaryAction = useMemo(
        () => getPrimaryActionConfig(mode, profiles, routerPathname),
        [mode, profiles, routerPathname],
    );

    const bottomNavItems = useMemo(
        () =>
            applyBottomNavPrimaryHighlight(
                visibleBottomTabs.map((item) => ({
                    href: item.href,
                    label: item.label,
                    icon: item.icon,
                    active:
                        item.id === 'profile'
                            ? section === 'profile' || routerPathname.startsWith('/panel/mi-cuenta')
                            : isClientMarketplaceHref(item.href)
                              ? routerPathname.startsWith(item.href)
                              : section === item.id,
                })),
                primaryAction.show ? primaryAction.href : null,
            ),
        [primaryAction.href, primaryAction.show, routerPathname, section, visibleBottomTabs],
    );

    const activePathname = resolvePanelActivePathname(routerPathname, section);
    const activeHref = useMemo(() => {
        const fromPath = resolveActiveNavHref(activePathname, navItems);
        if (fromPath) return fromPath;
        return panelSectionHref(section);
    }, [activePathname, navItems, section]);
    const userName = accountUser?.name?.trim() || user?.name?.trim() || 'Usuario';
    const accountTypeLabel = useMemo(() => panelAccountTypeLabel(profiles), [profiles]);

    return (
        <SharedPanelShell
            navItems={navItems}
            user={{ name: userName, role: accountTypeLabel, avatar: accountUser?.avatar || user?.avatar }}
            roleLabel={accountTypeLabel}
            collapsedStorageKey={STORAGE_COLLAPSED}
            footerHref={null}
            activePathname={activePathname}
            activeHref={activeHref}
            isVerified={user?.status === 'verified'}
            bottomNav={
                <PanelBottomNav
                    items={bottomNavItems}
                    LinkComponent={({ href, className, children, 'aria-current': ariaCurrent }) => {
                        const tab = visibleBottomTabs.find((item) => item.href === href);
                        if (tab && shouldUsePanelLink(tab.href)) {
                            return (
                                <Link href={tab.href} className={className} aria-current={ariaCurrent}>
                                    {children}
                                </Link>
                            );
                        }
                        return (
                            <button
                                type="button"
                                className={className}
                                aria-current={ariaCurrent}
                                onClick={() => onSectionChange((tab?.id ?? href) as Section)}
                            >
                                {children}
                            </button>
                        );
                    }}
                />
            }
        >
            {children}
        </SharedPanelShell>
    );
}
