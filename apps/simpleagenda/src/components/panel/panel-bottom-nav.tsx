'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    IconLayoutDashboard,
    IconCalendar,
    IconUsers,
    IconPlus,
} from '@tabler/icons-react';
import { PanelBottomNav as SharedPanelBottomNav } from '@simple/ui';
import { isPanelNavActive } from '@/components/panel/panel-nav-config';

const items = [
    { href: '/panel', label: 'Inicio', icon: IconLayoutDashboard },
    { href: '/panel/agenda', label: 'Agenda', icon: IconCalendar },
    { href: '/panel/agenda?nueva=1', label: 'Nueva', icon: IconPlus, highlight: true },
    { href: '/panel/clientes', label: 'Pacientes', icon: IconUsers },
];

export function PanelBottomNav() {
    const pathname = usePathname() ?? '';

    const navItems = items.map((item) => ({
        ...item,
        active: isPanelNavActive(pathname, item.href),
    }));

    const moreActive =
        !items.some((item) => isPanelNavActive(pathname, item.href)) &&
        pathname.startsWith('/panel');

    const openDrawer = () => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('simple:panel-mobile-open'));
        }
    };

    return (
        <SharedPanelBottomNav
            items={navItems}
            LinkComponent={Link}
            moreActive={moreActive}
            onMoreClick={openDrawer}
        />
    );
}
