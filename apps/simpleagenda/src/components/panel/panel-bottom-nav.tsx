'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    IconLayoutDashboard,
    IconCalendar,
    IconUsers,
    IconPlus,
    IconUser,
    IconMapPin,
} from '@tabler/icons-react';
import { PanelBottomNav as SharedPanelBottomNav } from '@simple/ui/panel';
import { applyBottomNavPrimaryHighlight, createPanelAccountNavItem } from '@simple/ui/layout';
import { isPanelNavActive } from '@/components/panel/panel-nav-config';
import { useAgendaVocab } from '@/components/panel/agenda-vocab-context';

export function PanelBottomNav({
    propertyWorkspace,
}: {
    propertyWorkspace: boolean;
}) {
    const pathname = usePathname() ?? '';
    const vocab = useAgendaVocab();

    const primaryHref = propertyWorkspace ? '/panel/visitas-equipo?nueva=1' : '/panel/agenda?nueva=1';
    const primaryRoute = propertyWorkspace ? '/panel/visitas-equipo' : null;

    const items = [
        { href: '/panel', label: 'Mi panel', icon: IconLayoutDashboard },
        { href: '/panel/agenda', label: 'Agenda', icon: IconCalendar },
        { href: primaryHref, label: propertyWorkspace ? 'Agendar' : 'Nueva', icon: propertyWorkspace ? IconMapPin : IconPlus },
        { href: propertyWorkspace ? '/panel/contactos' : '/panel/clientes', label: propertyWorkspace ? 'Contactos' : vocab.Clients, icon: IconUsers },
        createPanelAccountNavItem(IconUser),
    ];

    const navItems = applyBottomNavPrimaryHighlight(
        items.map((item) => ({
            ...item,
            active: isPanelNavActive(pathname, item.href)
                || Boolean(primaryRoute && item.href === primaryHref && isPanelNavActive(pathname, primaryRoute)),
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
