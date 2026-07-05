'use client';

import Link from 'next/link';
import { IconHome, IconPlus, IconSearch, IconSparkles, IconUser } from '@tabler/icons-react';
import { MarketplaceMobileNav, type MarketplaceMobileNavItem } from '@simple/ui/layout';

const items: MarketplaceMobileNavItem[] = [
    { href: '/', icon: IconHome, label: 'Inicio' },
    { href: '/ventas', icon: IconSearch, label: 'Buscar' },
    { href: '/panel/publicar', icon: IconPlus, label: 'Publicar', primary: true },
    { href: '/descubre', icon: IconSparkles, label: 'Descubre' },
    { href: '/panel/mi-cuenta', icon: IconUser, label: 'Mi cuenta' },
];

export function MobileNav() {
    return <MarketplaceMobileNav LinkComponent={Link} items={items} />;
}
