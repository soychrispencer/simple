'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useState, useEffect, useRef } from 'react';
import {
    IconBell,
    IconSun,
    IconMoon,
    IconUser,
    IconMenu2,
    IconX,
    IconLogout,
    IconCalendar,
    IconUsers,
    IconPlus,
    IconHome,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { useSerenatasNotificationBadge } from '@/context/SerenatasNotificationBadgeContext';
import { getSerenatasOverflowNavItems, isSerenatasNavActive } from '@/components/layout/panel-nav-config';
import { BrandLogo } from '@simple/ui';

type UserRole = 'client' | 'coordinator' | 'musician' | 'admin' | 'superadmin';

function serenatasHeaderCta(role: UserRole | undefined): {
    href: string;
    label: string;
    Icon: typeof IconCalendar;
} {
    switch (role) {
        case 'coordinator':
            return { href: '/agenda', label: 'Agendar', Icon: IconCalendar };
        case 'musician':
            return { href: '/invitaciones', label: 'Invitaciones', Icon: IconUsers };
        case 'client':
            return { href: '/solicitar', label: 'Solicitar', Icon: IconPlus };
        case 'admin':
        case 'superadmin':
            return { href: '/agenda', label: 'Agendar', Icon: IconCalendar };
        default:
            return { href: '/inicio', label: 'Inicio', Icon: IconHome };
    }
}

export function AppHeader() {
    const pathname = usePathname() ?? '';
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const { user, isAuthenticated, logout, effectiveRole } = useAuth();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('pointerdown', handleClickOutside);
        return () => document.removeEventListener('pointerdown', handleClickOutside);
    }, []);

    const userName = user?.name || 'Usuario';
    /** En escritorio la navegación principal es el sidebar; el menú móvil solo muestra rutas que no están en la barra inferior. */
    const overflowNavLinks = getSerenatasOverflowNavItems(effectiveRole);
    const headerCta = serenatasHeaderCta(effectiveRole as UserRole | undefined);
    const CtaIcon = headerCta.Icon;
    const { unreadCount } = useSerenatasNotificationBadge();
    const notificationsHref = '/notificaciones';

    return (
        <header
            className="fixed top-0 right-0 left-0 z-30 h-16 app-header transition-all duration-300"
            style={{
                background: 'var(--surface)',
                borderBottom: '1px solid var(--border)'
            }}
        >
            <div className="flex items-center justify-between h-full px-4">
                {/* Left: Logo / Menu */}
                <div className="flex items-center gap-3">
                    {/* Solo móvil: el chip usa display en CSS y puede anular md:hidden si va en el mismo nodo */}
                    <div className="md:hidden -ml-2">
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="header-icon-chip"
                            aria-label="Menú"
                        >
                            {mobileMenuOpen ? (
                                <IconX size={18} style={{ color: 'var(--fg-muted)' }} />
                            ) : (
                                <IconMenu2 size={18} style={{ color: 'var(--fg-muted)' }} />
                            )}
                        </button>
                    </div>

                    {/* Logo */}
                    <Link href="/inicio" className="flex items-center gap-2 group shrink-0">
                        <BrandLogo appId="simpleserenatas" className="hidden sm:flex" />
                        <BrandLogo appId="simpleserenatas" showWordmark={false} variant="ghost" className="sm:hidden" />
                    </Link>
                </div>

                {/* Right: orden unificado — notificaciones → tema → avatar → CTA */}
                <div className="flex items-center gap-2">
                    {isAuthenticated && (
                        <Link
                            href={notificationsHref}
                            className="header-icon-chip relative shrink-0"
                            aria-label={
                                unreadCount > 0
                                    ? `Notificaciones, ${unreadCount} sin leer`
                                    : 'Notificaciones'
                            }
                        >
                            <IconBell size={16} stroke={1.9} />
                            {unreadCount > 0 ? (
                                <span
                                    className="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-1 text-[9px] font-bold leading-none rounded-full flex items-center justify-center"
                                    style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                                    aria-hidden
                                >
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            ) : null}
                        </Link>
                    )}

                    {mounted && (
                        <button
                            type="button"
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="header-icon-chip shrink-0"
                            aria-label="Cambiar tema"
                        >
                            {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
                        </button>
                    )}

                    {isAuthenticated ? (
                        <div className="relative" ref={userMenuRef}>
                            <button
                                type="button"
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="header-icon-chip"
                                aria-label="Cuenta"
                                aria-expanded={userMenuOpen}
                            >
                                <IconUser size={16} />
                            </button>

                            {userMenuOpen && (
                                <div 
                                    className="absolute right-0 top-[calc(100%+8px)] w-56 rounded-xl border p-2 animate-slide-in z-50"
                                    style={{ 
                                        background: 'var(--surface)', 
                                        borderColor: 'var(--border)',
                                        boxShadow: 'var(--shadow-lg)'
                                    }}
                                >
                                    <div className="px-3 py-2 mb-1">
                                        <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{userName}</p>
                                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{user?.email}</p>
                                    </div>
                                    
                                    <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />
                                    
                                    <Link
                                        href="/perfil"
                                        onClick={() => setUserMenuOpen(false)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--bg-subtle)]"
                                        style={{ color: 'var(--fg-secondary)' }}
                                    >
                                        <IconUser size={16} />
                                        Mi Perfil
                                    </Link>
                                    
                                    <button
                                        onClick={() => { setUserMenuOpen(false); void logout(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--bg-subtle)]"
                                        style={{ color: 'var(--error, #EF4444)' }}
                                    >
                                        <IconLogout size={16} />
                                        Cerrar sesión
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : null}

                    {isAuthenticated ? (
                        <Link
                            href={headerCta.href}
                            className="hidden sm:inline-flex shrink-0 items-center justify-center gap-1.5 h-9 px-3 sm:px-4 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
                            style={{
                                background: 'var(--accent)',
                                color: 'var(--accent-contrast)',
                            }}
                        >
                            <CtaIcon size={15} stroke={2} />
                            {headerCta.label}
                        </Link>
                    ) : (
                        <Link
                            href="/auth/login"
                            className="inline-flex shrink-0 items-center justify-center h-9 px-4 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
                            style={{
                                background: 'var(--accent)',
                                color: 'var(--accent-contrast)',
                            }}
                        >
                            Iniciar sesión
                        </Link>
                    )}
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
                <div 
                    className="md:hidden absolute top-full left-0 right-0 border-b animate-slide-in"
                    style={{ 
                        background: 'var(--surface)', 
                        borderColor: 'var(--border)',
                        boxShadow: 'var(--shadow-lg)'
                    }}
                >
                    {isAuthenticated ? (
                        <div className="p-2 pb-0">
                            <Link
                                href={headerCta.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex w-full items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium"
                                style={{
                                    background: 'var(--accent)',
                                    color: 'var(--accent-contrast)',
                                }}
                            >
                                <CtaIcon size={16} stroke={2} />
                                {headerCta.label}
                            </Link>
                        </div>
                    ) : null}
                    <nav className="p-2 space-y-1" aria-label="Más rutas">
                        {overflowNavLinks.length === 0 ? (
                            <p className="px-3 py-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                Usa la barra inferior para Inicio, Agenda y el resto.
                            </p>
                        ) : (
                            overflowNavLinks.map((link) => {
                                const NavIcon = link.icon;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                                            isSerenatasNavActive(pathname, link.href) ? 'nav-item-active' : ''
                                        }`}
                                        style={{
                                            color: isSerenatasNavActive(pathname, link.href)
                                                ? 'var(--accent)'
                                                : 'var(--fg-secondary)',
                                        }}
                                    >
                                        <NavIcon size={18} stroke={1.9} />
                                        {link.label}
                                    </Link>
                                );
                            })
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
}
