'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    IconLayoutDashboard,
    IconFileText,
    IconPlus,
    IconMessageCircle,
    IconAddressBook,
} from '@tabler/icons-react';
import { PanelBottomNav as SharedPanelBottomNav } from '@simple/ui/panel';
import { applyBottomNavPrimaryHighlight } from '@simple/ui/layout';
import { isPanelNavActive } from '@/components/panel/panel-nav-config';

const PRIMARY_HREF = '/panel/publicar';

const items = [
    { href: '/panel', label: 'Mi panel', icon: IconLayoutDashboard },
    { href: '/panel/publicaciones', label: 'Publicaciones', icon: IconFileText },
    { href: PRIMARY_HREF, label: 'Publicar', icon: IconPlus },
    { href: '/panel/contactos', label: 'Contactos', icon: IconAddressBook },
    { href: '/panel/mensajes', label: 'Mensajes', icon: IconMessageCircle },
];

export function PanelBottomNav({ workspaceReady = true }: { workspaceReady?: boolean }) {
    const pathname = usePathname() ?? '';
    const visibleItems = workspaceReady
        ? items
        : items.filter((item) => ['/panel', PRIMARY_HREF, '/panel/mi-cuenta'].includes(item.href));

    const navItems = applyBottomNavPrimaryHighlight(
        visibleItems.map((item) => ({
            ...item,
            active: isPanelNavActive(pathname, item.href),
        })),
        PRIMARY_HREF,
    );

    return <SharedPanelBottomNav items={navItems} LinkComponent={Link} />;
}
