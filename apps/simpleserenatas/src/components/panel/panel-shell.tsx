'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { PanelShell as SharedPanelShell, PanelBottomNav, resolveActiveNavHref } from '@simple/ui';
import { useSerenata } from '@/context/serenata-context';
import {
    getPanelNavItems,
    getMobileBottomNavItems,
    getMobileOverflowNavItems,
    panelModeLabel,
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
    const { user, accountUser, mode, profiles } = useSerenata();
    const routerPathname = usePathname() ?? '';
    const [moreOpen, setMoreOpen] = useState(false);

    const navItems = useMemo(
        () =>
            getPanelNavItems(mode, profiles).map(({ href, label, icon, badge }) => ({
                href,
                label,
                icon,
                badge,
            })),
        [mode, profiles],
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

    return (
        <SharedPanelShell
            navItems={navItems}
            user={{ name: userName, role: panelModeLabel(mode) }}
            roleLabel={panelModeLabel(mode)}
            collapsedStorageKey={STORAGE_COLLAPSED}
            footerHref={null}
            activePathname={activePathname}
            activeHref={activeHref}
            isVerified={user?.status === 'verified'}
            bottomNav={
                <>
                    <PanelBottomNav
                        items={visibleBottomTabs.map((item) => ({
                            href: item.id,
                            label: item.label,
                            icon: item.icon,
                            active: section === item.id,
                        }))}
                        moreActive={moreActive}
                        onMoreClick={overflowNavItems.length > 0 ? () => setMoreOpen(true) : undefined}
                        LinkComponent={({ href, className, children, 'aria-current': ariaCurrent }) => (
                            <button
                                type="button"
                                className={className}
                                aria-current={ariaCurrent}
                                onClick={() => onSectionChange(href as Section)}
                            >
                                {children}
                            </button>
                        )}
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
