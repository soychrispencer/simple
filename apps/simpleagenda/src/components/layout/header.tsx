'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import {
    IconSun,
    IconMoon,
    IconUser,
    IconMenu2,
    IconX,
    IconLogout,
    IconCalendar,
} from '@tabler/icons-react';
import { useAuth } from '@/context/auth-context';
import { PanelButton } from '@simple/ui';

export function Header() {
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const { user, isLoggedIn, requireAuth, logout } = useAuth();

    useEffect(() => {
        setMounted(true);
    }, []);

    const handlePanel = () => {
        if (requireAuth(() => router.push('/panel'))) {
            router.push('/panel');
        }
    };

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

                <div className="hidden md:flex items-center gap-2">
                    {mounted ? (
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="header-icon-chip"
                            aria-label="Cambiar tema"
                        >
                            {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
                        </button>
                    ) : null}

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
                                        className="absolute right-0 top-[calc(100%+8px)] z-50 w-[240px] rounded-xl border p-2 animate-slide-down"
                                        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
                                    >
                                        <div className="px-2.5 py-2 mb-1 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>
                                            <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{userName}</p>
                                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{user?.email}</p>
                                        </div>
                                        <Link
                                            href="/panel"
                                            onClick={() => setAccountOpen(false)}
                                            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-(--bg-subtle)"
                                            style={{ color: 'var(--fg-secondary)' }}
                                        >
                                            Mi panel
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
                        ) : null}
                    </div>

                    {isLoggedIn ? (
                        <PanelButton onClick={handlePanel} variant="primary" size="sm" className="h-9 px-4 text-sm">
                            Mi agenda
                        </PanelButton>
                    ) : (
                        <PanelButton onClick={handlePanel} variant="primary" size="sm" className="h-9 px-4 text-sm">
                            Comenzar gratis
                        </PanelButton>
                    )}
                </div>

                <div className="flex md:hidden items-center gap-2">
                    {mounted ? (
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="header-icon-chip"
                            aria-label="Cambiar tema"
                        >
                            {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
                        </button>
                    ) : null}
                    <button onClick={() => setMobileOpen(!mobileOpen)} className="header-icon-chip" aria-label="Menú">
                        {mobileOpen ? <IconX size={18} /> : <IconMenu2 size={18} />}
                    </button>
                </div>
            </div>

            {mobileOpen ? (
                <div className="md:hidden animate-slide-down" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
                    <nav className="container-app flex flex-col py-4 gap-1">
                        <Link href="/#como-funciona" className="py-2.5 px-3 text-base rounded-lg" style={{ color: 'var(--fg-secondary)' }} onClick={() => setMobileOpen(false)}>
                            Funciones
                        </Link>
                        <Link href="/#planes" className="py-2.5 px-3 text-base rounded-lg" style={{ color: 'var(--fg-secondary)' }} onClick={() => setMobileOpen(false)}>
                            Planes
                        </Link>
                        <div className="mt-3 flex gap-2">
                            {isLoggedIn ? (
                                <>
                                    <PanelButton onClick={() => { setMobileOpen(false); router.push('/panel'); }} variant="secondary" className="flex-1 h-10 text-sm">
                                        Mi panel
                                    </PanelButton>
                                    <PanelButton onClick={() => { setMobileOpen(false); void logout(); }} variant="secondary" className="flex-1 h-10 text-sm">
                                        Salir
                                    </PanelButton>
                                </>
                            ) : (
                                <PanelButton onClick={() => { setMobileOpen(false); handlePanel(); }} variant="primary" className="flex-1 h-10 text-sm">
                                    Comenzar gratis
                                </PanelButton>
                            )}
                        </div>
                    </nav>
                </div>
            ) : null}
        </header>
    );
}
