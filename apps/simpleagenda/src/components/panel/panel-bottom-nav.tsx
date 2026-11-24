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
import { useAgendaVocab } from '@/components/panel/agenda-vocab-context';

export function PanelBottomNav() {
    const pathname = usePathname() ?? '';
    const vocab = useAgendaVocab();

    const primaryHref = '/panel/agenda?nueva=1';

    const items = [
        { href: '/panel', label: 'Hoy', icon: IconLayoutDashboard },
        { href: '/panel/agenda', label: 'Agenda', icon: IconCalendar },
        { href: primaryHref, label: 'Nueva', icon: IconPlus },
        { href: '/panel/clientes', label: vocab.Clients, icon: IconUsers },
        createPanelAccountNavItem(IconUser),
    ];

    const navItems = applyBottomNavPrimaryHighlight(
        items.map((item) => ({
            ...item,
            active: isPanelNavActive(pathname, item.href),
        })),
        primaryHref,
    );

    return (
        <div className="agenda-panel-quick-action">
            <SharedPanelBottomNav
                items={navItems}
                LinkComponent={Link}
                highlightStyle={{ boxShadow: '0 0 0 1px var(--accent-ink)' }}
            />
        </div>
    );
}
