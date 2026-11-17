'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    IconLayoutDashboard,
    IconFileText,
    IconPlus,
    IconMessageCircle,
    IconUser,
} from '@tabler/icons-react';
import { PanelBottomNav as SharedPanelBottomNav } from '@simple/ui/panel';
import { applyBottomNavPrimaryHighlight, createPanelAccountNavItem } from '@simple/ui/layout';
import { isPanelNavActive } from '@/components/panel/panel-nav-config';

const PRIMARY_HREF = '/panel/publicar';

const items = [
    { href: '/panel', label: 'Mi panel', icon: IconLayoutDashboard },
    { href: '/panel/publicaciones', label: 'Mis publicaciones', icon: IconFileText },
    { href: PRIMARY_HREF, label: 'Publicar', icon: IconPlus },
    { href: '/panel/mensajes', label: 'Mensajes', icon: IconMessageCircle },
    createPanelAccountNavItem(IconUser),
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
