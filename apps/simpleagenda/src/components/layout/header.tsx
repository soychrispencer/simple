'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
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
} from '@tabler/icons-react';
import { useAuth } from '@/context/auth-context';
import { PanelButton } from '@simple/ui';
import { NotificationBell } from '@/components/panel/notification-bell';

export function Header() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const { user, isLoggedIn, logout, openAuth } = useAuth();

    useEffect(() => {
        setMounted(true);
    }, []);

    const userName = user?.name?.trim() || 'Usuario';

    return (
        <header className="relative z-40 transition-all duration-300" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="container-app flex items-center justify-between h-16">
                <Link href="/" className="flex items-center gap-1 group shrink-0">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)', color: '#fff' }}>
                        <IconCalendar size={16} />
                    </div>
                    <span className="inline-flex items-end gap-[0.08rem] text-[1.05rem] tracking-tight" style={{ color: 'var(--fg)' }}>
                        <span className="font-semibold leading-none">Simple</span>
                        <span className="translate-y-[0.02em] font-normal leading-none" style={{ color: 'var(--fg-muted)' }}>Agenda</span>
                    </span>
                </Link>

                <nav className="hidden md:flex items-center gap-1">
                    <Link href="/#como-funciona" className="header-nav-link px-3.5 py-2 text-sm font-medium rounded-lg transition-colors duration-200">
                        Funciones
                    </Link>
                    <Link href="/#planes" className="header-nav-link px-3.5 py-2 text-sm font-medium rounded-lg transition-colors duration-200">
                        Planes
                    </Link>
                </nav>

                <div className="flex items-center gap-2">
                    {isLoggedIn ? <NotificationBell /> : null}
                    {mounted ? (
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="header-icon-chip"
                            aria-label="Cambiar tema"
                        >
                            {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
                        </button>
                    ) : null}

                    {/* User dropdown - visible on all screen sizes */}
                    <div className="relative">
                        {isLoggedIn ? (
                            <>
                                <button
                                    onClick={() => setAccountOpen((prev) => !prev)}
                                    className="header-icon-chip"
                                    aria-label="Menú de cuenta"
                                >
                                    <IconUser size={16} />
                                </button>

                                {accountOpen ? (
                                    <div
                                        className="absolute right-0 top-[calc(100%+8px)] z-50 w-[260px] rounded-xl border p-2 animate-slide-down"
                                        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
                                    >
                                        <div className="px-2.5 py-2 mb-1 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>
                                            <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{userName}</p>
                                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{user?.email}</p>
                                        </div>
                                        {/* Public navigation links - especially useful on mobile */}
                                        <Link
                                            href="/#como-funciona"
                                            onClick={() => setAccountOpen(false)}
                                            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-(--bg-subtle)"
                                            style={{ color: 'var(--fg-secondary)' }}
                                        >
                                            Funciones
                                        </Link>
                                        <Link
                                            href="/#planes"
                                            onClick={() => setAccountOpen(false)}
                                            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-(--bg-subtle)"
                                            style={{ color: 'var(--fg-secondary)' }}
                                        >
                                            Planes
                                        </Link>
                                        <div className="my-1 border-t" style={{ borderColor: 'var(--border)' }}></div>
                                        {/* Panel navigation items */}
                                        <Link
                                            href="/panel"
                                            onClick={() => setAccountOpen(false)}
                                            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-(--bg-subtle)"
                                            style={{ color: 'var(--fg-secondary)' }}
                                        >
                                            <IconLayoutDashboard size={16} />
                                            Inicio
                                        </Link>
                                        <Link
                                            href="/panel/agenda"
                                            onClick={() => setAccountOpen(false)}
                                            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-(--bg-subtle)"
                                            style={{ color: 'var(--fg-secondary)' }}
                                        >
                                            <IconCalendar size={16} />
                                            Mi Agenda
                                        </Link>
                                        <Link
                                            href="/panel/clientes"
                                            onClick={() => setAccountOpen(false)}
                                            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-(--bg-subtle)"
                                            style={{ color: 'var(--fg-secondary)' }}
                                        >
                                            <IconUsers size={16} />
                                            Pacientes
                                        </Link>
                                        <Link
                                            href="/panel/pagos"
                                            onClick={() => setAccountOpen(false)}
                                            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-(--bg-subtle)"
                                            style={{ color: 'var(--fg-secondary)' }}
                                        >
                                            <IconCreditCard size={16} />
                                            Cobros
                                        </Link>
                                        <Link
                                            href="/panel/configuracion"
                                            onClick={() => setAccountOpen(false)}
                                            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-(--bg-subtle)"
                                            style={{ color: 'var(--fg-secondary)' }}
                                        >
                                            <IconSettings size={16} />
                                            Configuración
                                        </Link>
                                        <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                                            <button
                                                onClick={() => { setAccountOpen(false); void logout(); }}
                                                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-(--bg-subtle)"
                                                style={{ color: 'var(--fg-secondary)' }}
                                            >
                                                <IconLogout size={14} />
                                                Cerrar sesión
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </>
                        ) : (
                            <PanelButton onClick={openAuth} variant="primary" size="sm" className="h-9 px-4 text-sm">
                                Iniciar sesión
                            </PanelButton>
                        )}
                    </div>
                </div>
            </div>

        </header>
    );
}
