'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useState, useEffect, useRef } from 'react';
import {
    IconSun,
    IconMoon,
    IconUser,
    IconLogout,
    IconCalendar,
    IconLayoutDashboard,
    IconSettings,
    IconCreditCard,
    IconUsers,
    IconPlus,
    IconMenu2,
    IconX,
} from '@tabler/icons-react';
import { useAuth } from '@/context/auth-context';
import { PanelButton, Logo } from '@simple/ui';
import { NotificationBell } from '@/components/panel/notification-bell';
import { isPanelNavActive } from '@/components/panel/panel-nav-config';

const publicNav = [
    { href: '/#como-funciona', label: 'Funciones' },
    { href: '/#planes', label: 'Planes' },
];

const panelNav = [
    { href: '/panel', label: 'Inicio', icon: IconLayoutDashboard },
    { href: '/panel/agenda', label: 'Mi Agenda', icon: IconCalendar },
    { href: '/panel/clientes', label: 'Pacientes', icon: IconUsers },
    { href: '/panel/pagos', label: 'Cobros', icon: IconCreditCard },
    { href: '/panel/configuracion', label: 'Configuración', icon: IconSettings },
];

export function Header() {
    const router = useRouter();
    const pathname = usePathname() ?? '';
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const accountRef = useRef<HTMLDivElement>(null);
    const { user, isLoggedIn, logout, openAuth, requireAuth } = useAuth();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setMenuOpen(false);
        setAccountOpen(false);
    }, [pathname, isLoggedIn]);

    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            if (!menuRef.current?.contains(e.target as Node)) {
                setMenuOpen(false);
            }
            if (!accountRef.current?.contains(e.target as Node)) {
                setAccountOpen(false);
            }
        };
        document.addEventListener('pointerdown', handleOutside);
        return () => document.removeEventListener('pointerdown', handleOutside);
    }, []);

    const handleNuevaCita = () => {
        if (requireAuth(() => router.push('/panel/agenda?nueva=1'))) {
            router.push('/panel/agenda?nueva=1');
        }
    };

    const userName = user?.name?.trim() || 'Usuario';

    return (
        <header className="relative z-40 transition-all duration-300" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="container-app flex items-center justify-between h-16">
                {/* Logo */}
                <Logo brand="agenda" href="/" />

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                    {publicNav.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="header-nav-link px-3.5 py-2 text-sm font-medium rounded-lg transition-colors duration-200"
                            data-active={pathname === item.href || pathname.startsWith(`${item.href}/`) ? 'true' : 'false'}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* Right Side Actions */}
                <div className="flex items-center gap-2">
                    {isLoggedIn && <NotificationBell />}
                    
                    {mounted && (
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="header-icon-chip"
                            aria-label="Cambiar tema"
                        >
                            {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
                        </button>
                    )}

                    {/* User Menu (Avatar) - Solo panel */}
                    {isLoggedIn && (
                        <div className="relative" ref={accountRef}>
                            <button
                                onClick={() => setAccountOpen((prev) => !prev)}
                                className="header-icon-chip"
                                aria-label="Panel de usuario"
                                aria-expanded={accountOpen}
                            >
                                <IconUser size={16} />
                            </button>

                            {accountOpen && (
                                <div
                                    className="absolute right-0 top-[calc(100%+8px)] z-50 w-[260px] rounded-xl border p-2 animate-slide-down"
                                    style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
                                >
                                    {/* User Info */}
                                    <div className="px-2.5 py-2 mb-1 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>
                                        <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{userName}</p>
                                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{user?.email}</p>
                                    </div>

                                    {/* Panel Nav - Sidebar style with bordered icons */}
                                    <nav className="space-y-1" aria-label="Navegación de panel">
                                        {panelNav.map((item) => {
                                            const Icon = item.icon;
                                            const active = isPanelNavActive(pathname, item.href);
                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    onClick={() => setAccountOpen(false)}
                                                    className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors hover:bg-(--bg-subtle)"
                                                    style={{ color: active ? 'var(--fg)' : 'var(--fg-secondary)', background: active ? 'var(--bg-subtle)' : 'transparent' }}
                                                >
                                                    <span
                                                        className="w-9 h-9 rounded-[10px] border flex items-center justify-center transition-colors group-hover:border-(--border-strong) group-hover:text-(--fg)"
                                                        style={{
                                                            borderColor: active ? 'var(--button-primary-border)' : 'var(--border)',
                                                            background: active ? 'var(--button-primary-bg)' : 'color-mix(in srgb, var(--bg-subtle) 70%, transparent)',
                                                            color: active ? 'var(--button-primary-color)' : 'var(--fg-secondary)',
                                                        }}
                                                    >
                                                        <Icon size={17} stroke={1.9} />
                                                    </span>
                                                    <span className="flex-1 truncate font-medium">{item.label}</span>
                                                </Link>
                                            );
                                        })}
                                    </nav>

                                    {/* Logout */}
                                    <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                                        <button
                                            onClick={() => { setAccountOpen(false); void logout(); }}
                                            className="group w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors hover:bg-(--bg-subtle)"
                                            style={{ color: 'var(--fg-secondary)' }}
                                        >
                                            <span className="w-9 h-9 rounded-[10px] border flex items-center justify-center transition-colors group-hover:border-(--border-strong) group-hover:text-(--fg)" style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}>
                                                <IconLogout size={17} stroke={1.9} />
                                            </span>
                                            <span className="font-medium">Cerrar sesión</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Desktop Action Button - Only visible on desktop */}
                    <div className="hidden md:block">
                        {isLoggedIn ? (
                            <PanelButton 
                                onClick={handleNuevaCita} 
                                variant="primary" 
                                size="sm" 
                                className="h-9 px-4 text-sm"
                            >
                                <IconPlus size={14} /> Nueva cita
                            </PanelButton>
                        ) : (
                            <PanelButton 
                                onClick={openAuth} 
                                variant="primary" 
                                size="sm" 
                                className="h-9 px-4 text-sm"
                            >
                                Iniciar sesión
                            </PanelButton>
                        )}
                    </div>

                    {/* Mobile Menu Button (Hamburger) - Only visible on mobile */}
                    <div className="relative md:hidden" ref={menuRef}>
                        <button
                            onClick={() => setMenuOpen((prev) => !prev)}
                            className="header-icon-chip"
                            aria-label="Menú"
                            aria-expanded={menuOpen}
                        >
                            {menuOpen ? <IconX size={18} /> : <IconMenu2 size={18} />}
                        </button>

                        {menuOpen && (
                            <div
                                className="absolute right-0 top-[calc(100%+8px)] z-50 w-[260px] rounded-xl border p-2 animate-slide-down"
                                style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
                            >
                                {/* Action Button */}
                                {isLoggedIn ? (
                                    <PanelButton
                                        onClick={() => {
                                            setMenuOpen(false);
                                            handleNuevaCita();
                                        }}
                                        variant="primary"
                                        className="w-full h-10 text-sm mb-2"
                                    >
                                        <IconPlus size={14} /> Nueva cita
                                    </PanelButton>
                                ) : (
                                    <PanelButton
                                        onClick={() => {
                                            setMenuOpen(false);
                                            openAuth();
                                        }}
                                        variant="primary"
                                        className="w-full h-10 text-sm mb-2"
                                    >
                                        Iniciar sesión
                                    </PanelButton>
                                )}
                                
                                <div className="my-2 border-t" style={{ borderColor: 'var(--border)' }} />
                                
                                {/* Public Navigation */}
                                {publicNav.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMenuOpen(false)}
                                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-(--bg-subtle)"
                                        style={{ color: 'var(--fg-secondary)' }}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
