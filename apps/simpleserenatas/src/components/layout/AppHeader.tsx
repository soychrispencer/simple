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
    IconConfettiFilled,
    IconLogout,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';

interface AppHeaderProps {
    onMenuClick?: () => void;
    sidebarCollapsed?: boolean;
}

const navLinks = [
    { href: '/inicio', label: 'Inicio' },
    { href: '/agenda', label: 'Agenda' },
    { href: '/solicitudes', label: 'Solicitudes' },
    { href: '/grupos', label: 'Grupos' },
    { href: '/mapa', label: 'Mapa' },
];

export function AppHeader({ onMenuClick, sidebarCollapsed }: AppHeaderProps) {
    const pathname = usePathname() ?? '';
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const { user, isAuthenticated, logout, musicianProfile } = useAuth();

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
    const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

    return (
        <header
            className={`fixed top-0 right-0 left-0 z-30 h-16 app-header transition-all duration-300 ${
                sidebarCollapsed !== undefined ? 'md:left-16 lg:left-64' : ''
            }`}
            style={{
                background: 'var(--surface)',
                borderBottom: '1px solid var(--border)'
            }}
        >
            <div className="flex items-center justify-between h-full px-4">
                {/* Left: Logo / Menu */}
                <div className="flex items-center gap-3">
                    {/* Mobile hamburger */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 -ml-2 rounded-xl transition-colors hover:bg-[var(--bg-subtle)]"
                        aria-label="Menú"
                    >
                        {mobileMenuOpen ? (
                            <IconX size={22} style={{ color: 'var(--fg)' }} />
                        ) : (
                            <IconMenu2 size={22} style={{ color: 'var(--fg)' }} />
                        )}
                    </button>

                    {/* Desktop sidebar toggle */}
                    {onMenuClick && (
                        <button
                            onClick={onMenuClick}
                            className="hidden md:flex p-2 -ml-2 rounded-xl transition-colors hover:bg-[var(--bg-subtle)]"
                            aria-label="Colapsar menú"
                        >
                            <IconMenu2 size={20} style={{ color: '#E11D48' }} />
                        </button>
                    )}

                    {/* Logo */}
                    <Link href="/inicio" className="flex items-center gap-2 group shrink-0">
                        <span className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-opacity group-hover:opacity-80" style={{ backgroundColor: 'var(--accent-subtle)', color: '#E11D48' }}>
                            <IconConfettiFilled size={18} />
                        </span>
                        <span className="hidden sm:inline-flex items-baseline gap-[0.08rem] text-lg tracking-tight" style={{ color: 'var(--fg)' }}>
                            <span className="font-semibold leading-none">Simple</span>
                            <span className="font-normal leading-none" style={{ color: '#E11D48' }}>Serenatas</span>
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-1 ml-6">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                                    isActive(link.href)
                                        ? 'nav-item-active'
                                        : 'hover:bg-[var(--bg-subtle)]'
                                }`}
                                style={{ color: isActive(link.href) ? 'var(--accent)' : 'var(--fg-secondary)' }}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {/* Theme Toggle */}
                    {mounted && (
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-subtle)]"
                            aria-label="Cambiar tema"
                            style={{ color: 'var(--fg-secondary)' }}
                        >
                            {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
                        </button>
                    )}

                    {/* Notifications */}
                    {isAuthenticated && (
                        <Link
                            href="/solicitudes"
                            className="relative p-2 rounded-xl transition-colors hover:bg-[var(--bg-subtle)]"
                            style={{ color: 'var(--fg-secondary)' }}
                        >
                            <IconBell size={18} />
                            <span 
                                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                                style={{ background: 'var(--accent)' }}
                            />
                        </Link>
                    )}

                    {/* User Menu */}
                    {isAuthenticated ? (
                        <div className="relative" ref={userMenuRef}>
                            <button
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="flex items-center gap-2 p-1.5 pl-3 rounded-xl transition-colors hover:bg-[var(--bg-subtle)]"
                                style={{ color: 'var(--fg-secondary)' }}
                            >
                                <span className="hidden sm:inline text-sm font-medium">{userName}</span>
                                <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center"
                                    style={{ background: 'var(--accent-subtle)' }}
                                >
                                    <IconUser size={16} style={{ color: 'var(--accent)' }} />
                                </div>
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
                    ) : (
                        <Link
                            href="/auth/login"
                            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                            style={{ 
                                background: 'var(--accent)', 
                                color: 'var(--accent-contrast)'
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
                    <nav className="p-2 space-y-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                                    isActive(link.href) ? 'nav-item-active' : ''
                                }`}
                                style={{ color: isActive(link.href) ? 'var(--accent)' : 'var(--fg-secondary)' }}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            )}
        </header>
    );
}
