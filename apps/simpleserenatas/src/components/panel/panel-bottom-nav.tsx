'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PanelBottomNav as SharedPanelBottomNav } from '@simple/ui/panel';
import { applyBottomNavPrimaryHighlight } from '@simple/ui/layout';
import {
    getMobileBottomNavItems,
    getPrimaryActionConfig,
    isPanelNavActive,
} from '@/components/panel/panel-nav-config';
import { useSerenata } from '@/context/serenata-context';
import { sectionFromPanelPath } from '@/lib/panel-routes';

export function PanelBottomNav() {
    const pathname = usePathname() ?? '';
    const { mode, profiles } = useSerenata();
    const section = sectionFromPanelPath(pathname);
    const primaryAction = getPrimaryActionConfig(mode, profiles, pathname);
    const tabs = getMobileBottomNavItems(mode, profiles);

    const navItems = applyBottomNavPrimaryHighlight(
        tabs.map((item) => ({
            href: item.href,
            label: item.label,
            icon: item.icon,
            active: isPanelNavActive(pathname, item.href, section),
        })),
        primaryAction.show ? primaryAction.href : null,
    );

    return <SharedPanelBottomNav items={navItems} LinkComponent={Link} />;
}
