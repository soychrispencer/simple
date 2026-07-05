'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    IconLayoutDashboard,
    IconCalendar,
    IconUsers,
    IconPlus,
    IconUser,
} from '@tabler/icons-react';
import { PanelBottomNav as SharedPanelBottomNav } from '@simple/ui/panel';
import { applyBottomNavPrimaryHighlight, createPanelAccountNavItem } from '@simple/ui/layout';
import { isPanelNavActive } from '@/components/panel/panel-nav-config';

const PRIMARY_HREF = '/panel/agenda?nueva=1';

const items = [
    { href: '/panel', label: 'Mi panel', icon: IconLayoutDashboard },
    { href: '/panel/agenda', label: 'Agenda', icon: IconCalendar },
    { href: PRIMARY_HREF, label: 'Nueva', icon: IconPlus },
    { href: '/panel/clientes', label: 'Pacientes', icon: IconUsers },
    createPanelAccountNavItem(IconUser),
];

export function PanelBottomNav() {
    const pathname = usePathname() ?? '';

    const navItems = applyBottomNavPrimaryHighlight(
        items.map((item) => ({
            ...item,
            active: isPanelNavActive(pathname, item.href),
        })),
        PRIMARY_HREF,
    );

    return <SharedPanelBottomNav items={navItems} LinkComponent={Link} />;
}
