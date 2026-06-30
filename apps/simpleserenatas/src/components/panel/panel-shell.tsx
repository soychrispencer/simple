'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { isClientMarketplaceHref } from '@/lib/client-marketplace';
import { PanelShell as SharedPanelShell } from '@simple/ui/panel';
import { PanelBottomNav, resolveActiveNavHref } from '@simple/ui/panel';
import { useSerenata } from '@/context/serenata-context';
import {
    getPanelNavItems,
    getMobileBottomNavItems,
    getMobileOverflowNavItems,
    panelAccountTypeLabel,
} from '@/components/panel/panel-nav-config';
import { PanelMobileMoreSheet } from '@/components/panel/panel-mobile-more-sheet';
import type { Section } from '@/context/serenata-context';
import { panelSectionHref, resolvePanelActivePathname } from '@/lib/panel-routes';

const STORAGE_COLLAPSED = 'simpleserenatas:panel:collapsed';

type SerenataPanelShellProps = {
    children: ReactNode;
    section: Section;
    onSectionChange: (section: Section) => void;
};

export function SerenataPanelShell({ children, section, onSectionChange }: SerenataPanelShellProps) {
    const { user, accountUser, mode, profiles, solicitudesPendingCount } = useSerenata();
    const routerPathname = usePathname() ?? '';
    const [moreOpen, setMoreOpen] = useState(false);

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
        () => getMobileBottomNavItems(mode, profiles).filter((t) => t.id !== 'profile'),
        [mode, profiles],
    );

    const overflowNavItems = useMemo(
        () => getMobileOverflowNavItems(mode, profiles),
        [mode, profiles],
    );

    const moreActive = overflowNavItems.some((item) => item.id === section);

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
                <>
                    <PanelBottomNav
                        items={visibleBottomTabs.map((item) => ({
                            href: item.href,
                            label: item.label,
                            icon: item.icon,
                            active: isClientMarketplaceHref(item.href) ? false : section === item.id,
                        }))}
                        moreActive={moreActive}
                        onMoreClick={overflowNavItems.length > 0 ? () => setMoreOpen(true) : undefined}
                        LinkComponent={({ href, className, children, 'aria-current': ariaCurrent }) => {
                            const tab = visibleBottomTabs.find((item) => item.href === href);
                            if (tab && isClientMarketplaceHref(tab.href)) {
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
                    {moreOpen ? (
                        <PanelMobileMoreSheet
                            items={overflowNavItems}
                            activeSection={section}
                            onNavigate={onSectionChange}
                            onClose={() => setMoreOpen(false)}
                        />
                    ) : null}
                </>
            }
        >
            {children}
        </SharedPanelShell>
    );
}
