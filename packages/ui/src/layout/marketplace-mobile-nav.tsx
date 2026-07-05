'use client';

import type { ComponentType, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { IconBookmark, IconHome, IconPlus, IconSearch, IconUser } from '@tabler/icons-react';
import { BottomNavPrimaryAction, BottomNavStandardItem } from './bottom-nav-primary-action';
import {
    BOTTOM_NAV_BAR_CLASS,
    BOTTOM_NAV_ITEM_CLASS,
    BOTTOM_NAV_LABEL_CLASS,
    BOTTOM_NAV_LABEL_COMPACT_CLASS,
    BOTTOM_NAV_PRIMARY_LIFT_CLASS,
    bottomNavIsCompact,
    bottomNavMarketplaceVisibilityClass,
    bottomNavShellClassName,
    bottomNavShellStyle,
} from './bottom-nav-styles';
import { shouldHideMarketplaceMobileNav } from './bottom-nav-utils';

export type MarketplaceMobileNavLinkProps = {
    href: string;
    className?: string;
    children: ReactNode;
    'aria-current'?: 'page' | undefined;
};

export type MarketplaceMobileNavItem = {
    href: string;
    label: string;
    icon: ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
    primary?: boolean;
};

const DEFAULT_ITEMS: MarketplaceMobileNavItem[] = [
    { href: '/', icon: IconHome, label: 'Inicio' },
    { href: '/ventas', icon: IconSearch, label: 'Buscar' },
    { href: '/panel/publicar', icon: IconPlus, label: 'Publicar', primary: true },
    { href: '/panel/guardados', icon: IconBookmark, label: 'Guardados' },
    { href: '/panel/mi-cuenta', icon: IconUser, label: 'Mi cuenta' },
];

export type MarketplaceMobileNavProps = {
    LinkComponent: ComponentType<MarketplaceMobileNavLinkProps>;
    items?: MarketplaceMobileNavItem[];
    ariaLabel?: string;
};

export function MarketplaceMobileNav({
    LinkComponent,
    items = DEFAULT_ITEMS,
    ariaLabel = 'Navegación principal',
}: MarketplaceMobileNavProps) {
    const pathname = usePathname() ?? '';
    if (shouldHideMarketplaceMobileNav(pathname)) return null;

    const compact = bottomNavIsCompact(items.length, false);
    const itemClass = compact ? `${BOTTOM_NAV_ITEM_CLASS} px-0.5 py-1` : `${BOTTOM_NAV_ITEM_CLASS}`;
    const labelClass = compact ? BOTTOM_NAV_LABEL_COMPACT_CLASS : BOTTOM_NAV_LABEL_CLASS;

    return (
        <nav
            className={`${bottomNavShellClassName} ${bottomNavMarketplaceVisibilityClass}`}
            style={bottomNavShellStyle}
            aria-label={ariaLabel}
        >
            <div className={BOTTOM_NAV_BAR_CLASS}>
                {items.map((item) => {
                    const active = pathname === item.href;
                    const Icon = item.icon;

                    if (item.primary) {
                        return (
                            <LinkComponent
                                key={item.href}
                                href={item.href}
                                className={`${itemClass} ${BOTTOM_NAV_PRIMARY_LIFT_CLASS}`}
                                aria-current={active ? 'page' : undefined}
                            >
                                <BottomNavPrimaryAction icon={Icon} label={item.label} active={active} labelClassName={labelClass} />
                            </LinkComponent>
                        );
                    }

                    return (
                        <LinkComponent
                            key={item.href}
                            href={item.href}
                            className={itemClass}
                            aria-current={active ? 'page' : undefined}
                        >
                            <BottomNavStandardItem icon={Icon} label={item.label} active={active} labelClassName={labelClass} />
                        </LinkComponent>
                    );
                })}
            </div>
        </nav>
    );
}
