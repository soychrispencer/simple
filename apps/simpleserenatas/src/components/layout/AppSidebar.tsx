'use client';

import { AppSidebar as AppSidebarBase, type NavItem } from '@simple/ui';
import {
    IconCalendar,
    IconUsers,
    IconMap,
    IconHome,
    IconBell,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';

interface AppSidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

const navItems: NavItem[] = [
    { href: '/inicio', label: 'Inicio', icon: IconHome },
    { href: '/agenda', label: 'Agenda', icon: IconCalendar },
    { href: '/solicitudes', label: 'Solicitudes', icon: IconBell },
    { href: '/grupos', label: 'Grupos', icon: IconUsers },
    { href: '/mapa', label: 'Mapa', icon: IconMap },
];

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
    const { musicianProfile, user } = useAuth();

    const userInfo = {
        name: user?.name || 'Usuario',
        role: musicianProfile ? 'Músico' : 'Cliente',
    };

    return (
        <AppSidebarBase
            navItems={navItems}
            user={userInfo}
            collapsed={collapsed}
            onToggle={onToggle}
        />
    );
}
