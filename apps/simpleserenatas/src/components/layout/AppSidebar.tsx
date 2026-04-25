'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
    IconHome,
    IconCalendar,
    IconBell,
    IconUsers,
    IconMap,
    IconUser,
    IconChevronLeft,
    IconChevronRight,
    IconConfettiFilled,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';

interface AppSidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

const navItems = [
    { href: '/inicio', label: 'Inicio', icon: IconHome },
    { href: '/agenda', label: 'Agenda', icon: IconCalendar },
    { href: '/solicitudes', label: 'Solicitudes', icon: IconBell, badge: true },
    { href: '/grupos', label: 'Grupos', icon: IconUsers },
    { href: '/mapa', label: 'Mapa', icon: IconMap },
    { href: '/perfil', label: 'Perfil', icon: IconUser },
];

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
    const pathname = usePathname() ?? '';
    const { musicianProfile, user } = useAuth();
    const [hovered, setHovered] = useState(false);

    const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
    const showExpanded = !collapsed || hovered;

    const userName = user?.name || 'Usuario';

    return (
        <aside
            className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col transition-all duration-300"
            style={{
                width: showExpanded ? '16rem' : '4rem',
                background: 'var(--surface)',
                borderRight: '1px solid var(--border)',
            }}
            onMouseEnter={() => collapsed && setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Logo Area */}
            <div 
                className="flex items-center h-16 px-4 border-b flex-shrink-0"
                style={{ borderColor: 'var(--border)' }}
            >
                <Link href="/inicio" className="flex items-center gap-3 overflow-hidden">
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--accent)' }}
                    >
                        <IconConfettiFilled size={18} style={{ color: 'var(--accent-contrast)' }} />
                    </div>
                    <span 
                        className={`text-lg tracking-tight transition-all duration-300 whitespace-nowrap ${
                            showExpanded ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{ color: 'var(--fg)' }}
                    >
                        <span className="font-semibold">Simple</span>
                        <span style={{ color: 'var(--accent)' }}>Serenatas</span>
                    </span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-thin">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                                active
                                    ? 'nav-item-desktop-active'
                                    : 'nav-item-desktop'
                            }`}
                            title={!showExpanded ? item.label : undefined}
                        >
                            <div className="relative flex-shrink-0">
                                <Icon size={20} stroke={active ? 2 : 1.5} />
                                {item.badge && (
                                    <span
                                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                                        style={{ background: 'var(--accent)' }}
                                    />
                                )}
                            </div>
                            <span 
                                className={`transition-all duration-300 whitespace-nowrap ${
                                    showExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
                                }`}
                            >
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            {/* User Section */}
            <div 
                className="p-3 border-t flex-shrink-0"
                style={{ borderColor: 'var(--border)' }}
            >
                <Link
                    href="/perfil"
                    className={`flex items-center gap-3 rounded-xl transition-all overflow-hidden ${
                        showExpanded ? 'px-3 py-2' : 'p-2 justify-center'
                    }`}
                    style={{ 
                        background: isActive('/perfil') ? 'var(--accent-subtle)' : 'transparent'
                    }}
                    title={!showExpanded ? userName : undefined}
                >
                    <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--accent-subtle)' }}
                    >
                        <IconUser size={18} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div 
                        className={`flex-1 min-w-0 transition-all duration-300 ${
                            showExpanded ? 'opacity-100' : 'opacity-0 w-0'
                        }`}
                    >
                        <p 
                            className="text-sm font-medium truncate"
                            style={{ color: isActive('/perfil') ? 'var(--accent)' : 'var(--fg)' }}
                        >
                            {userName}
                        </p>
                        <p 
                            className="text-xs truncate"
                            style={{ color: 'var(--fg-muted)' }}
                        >
                            Músico
                        </p>
                    </div>
                </Link>
            </div>

            {/* Toggle Button */}
            <button
                onClick={onToggle}
                className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-colors hover:scale-105"
                style={{ 
                    background: 'var(--surface)', 
                    border: '1px solid var(--border)',
                    color: 'var(--fg-secondary)'
                }}
                aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            >
                {collapsed ? <IconChevronRight size={14} /> : <IconChevronLeft size={14} />}
            </button>
        </aside>
    );
}
