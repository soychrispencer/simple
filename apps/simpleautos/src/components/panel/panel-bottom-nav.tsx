'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    IconCar,
    IconFileText,
    IconPlus,
    IconMessageCircle,
} from '@tabler/icons-react';
import { PanelBottomNav as SharedPanelBottomNav } from '@simple/ui';
import { isPanelNavActive } from '@/components/panel/panel-nav-config';

const items = [
    { href: '/panel', label: 'Inicio', icon: IconCar },
    { href: '/panel/publicaciones', label: 'Publicaciones', icon: IconFileText },
    { href: '/panel/publicar', label: 'Publicar', icon: IconPlus, highlight: true },
    { href: '/panel/mensajes', label: 'Mensajes', icon: IconMessageCircle },
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
            highlightStyle={{ boxShadow: '0 4px 12px rgba(255, 54, 0, 0.25)' }}
        />
    );
}
