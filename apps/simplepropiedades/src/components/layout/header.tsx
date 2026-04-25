'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
    IconBell,
    IconSun,
    IconMoon,
    IconUser,
    IconPlus,
    IconLogout,
    IconSparkles,
    IconMenu2,
    IconX,
    IconBuildingSkyscraper,
} from '@tabler/icons-react';
import { useAuth } from '@/context/auth-context';
import { getPanelNavItems, isPanelNavActive, type PanelRole } from '@/components/panel/panel-nav-config';
import { fetchPanelNotifications, type PanelNotification } from '@/lib/panel-notifications';
import { clearSavedListingsCache, syncSavedListingsFromApi } from '@/lib/saved-listings';
import { PanelButton } from '@simple/ui';

const links = [
    { href: '/ventas', label: 'Comprar' },
    { href: '/arriendos', label: 'Arrendar' },
    { href: '/proyectos', label: 'Proyectos' },
    { href: '/servicios', label: 'Servicios' },
    { href: '/descubre', label: 'Descubre', isNew: true },
];

export function Header() {
    const pathname = usePathname() ?? '';
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<PanelNotification[]>([]);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const accountRef = useRef<HTMLDivElement | null>(null);
    const notificationsRef = useRef<HTMLDivElement | null>(null);
    const { user, isLoggedIn, requireAuth, logout, openAuth } = useAuth();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setMenuOpen(false);
        setAccountOpen(false);
        setNotificationsOpen(false);
    }, [pathname, isLoggedIn]);

    useEffect(() => {
        if (!isLoggedIn) {
            clearSavedListingsCache();
            return;
        }
        void syncSavedListingsFromApi();
    }, [isLoggedIn]);

    useEffect(() => {
        let active = true;
        if (!isLoggedIn) {
            setNotifications([]);
            return;
        }
        const run = async () => {
            const items = await fetchPanelNotifications();
            if (!active) return;
            setNotifications(items);
        };
        void run();
        return () => {
            active = false;
        };
    }, [isLoggedIn, pathname]);

    useEffect(() => {
        const handleOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (!menuRef.current?.contains(target)) setMenuOpen(false);
            if (!accountRef.current?.contains(target)) setAccountOpen(false);
            if (!notificationsRef.current?.contains(target)) setNotificationsOpen(false);
        };
        document.addEventListener('pointerdown', handleOutside);
        return () => document.removeEventListener('pointerdown', handleOutside);
    }, []);

    const handlePublicar = () => {
        if (requireAuth(() => router.push('/panel/publicar'))) {
            router.push('/panel/publicar');
        }
    };

    const role: PanelRole = user?.role ?? 'user';
    const panelItems = useMemo(() => getPanelNavItems(role), [role]);
    const userName = user?.name?.trim() || 'Usuario';
    const unreadNotifications = notifications.length;

    return (
        <header className="relative z-40 transition-all duration-300" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="container-app flex items-center justify-between h-16">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-1 group shrink-0">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#3b82f6', color: '#fff' }}>
                        <IconBuildingSkyscraper size={16} />
                    </div>
                    <span className="inline-flex items-end gap-[0.08rem] text-[1.05rem] tracking-tight" style={{ color: 'var(--fg)' }}>
                        <span className="font-semibold leading-none">Simple</span>
                        <span className="translate-y-[0.02em] font-normal leading-none" style={{ color: 'var(--fg-muted)' }}>Propiedades</span>
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                    {links.map((l) => (
                        <Link
                            key={l.href}
                            href={l.href}
                            className="header-nav-link px-3.5 py-2 text-sm font-medium rounded-lg transition-colors duration-200"
                            data-active={pathname === l.href || pathname.startsWith(`${l.href}/`) ? 'true' : 'false'}
                        >
                            <span className="inline-flex items-center gap-1.5">
                                <span>{l.label}</span>
                                {l.isNew ? (
                                    <span className="header-nav-link-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                                        <IconSparkles size={10} />
                                        Nuevo
                                    </span>
                                ) : null}
                            </span>
                        </Link>
                    ))}
                </nav>

                {/* Right Side Actions */}
                <div className="flex items-center gap-2">
                    {/* Notifications - only when logged in */}
                    {isLoggedIn && (
                        <div className="relative" ref={notificationsRef}>
                            <button
                                onClick={() => {
                                    setNotificationsOpen((prev) => !prev);
                                    setAccountOpen(false);
                                    setMenuOpen(false);
                                }}
                                className="relative header-icon-chip"
                                aria-label="Notificaciones"
                                aria-expanded={notificationsOpen}
                            >
                                <IconBell size={16} stroke={1.9} />
                                {unreadNotifications > 0 ? (
                                    <span
                                        className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full px-1 flex items-center justify-center text-[10px] font-semibold"
                                        style={{ background: 'var(--fg)', color: 'var(--bg)' }}
                                    >
                                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                                    </span>
                                ) : null}
                            </button>

                            {notificationsOpen ? (
                                <div
                                    className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(320px,calc(100vw-1rem))] rounded-xl border p-2 animate-slide-down"
                                    style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
                                >
                                    <div className="px-2.5 py-2 mb-1 flex items-center justify-between">
                                        <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Notificaciones</p>
                                        <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{unreadNotifications} sin leer</span>
                                    </div>
                                    <div className="space-y-1">
                                        {notifications.length === 0 ? (
                                            <div className="px-2.5 py-3 text-sm" style={{ color: 'var(--fg-muted)' }}>Sin novedades por ahora.</div>
                                        ) : notifications.map((item) => (
                                            <Link
                                                key={item.id}
                                                href={item.href}
                                                onClick={() => setNotificationsOpen(false)}
                                                className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-(--bg-subtle)"
                                            >
                                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: 'var(--fg)' }} />
                                                <span className="min-w-0 flex-1">
                                                    <p className="text-sm leading-5" style={{ color: 'var(--fg)' }}>{item.title}</p>
                                                    <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{item.time}</p>
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* Theme Toggle */}
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
                                onClick={() => {
                                    setAccountOpen((prev) => !prev);
                                    setNotificationsOpen(false);
                                    setMenuOpen(false);
                                }}
                                className="header-icon-chip"
                                aria-label="Panel de usuario"
                                aria-expanded={accountOpen}
                            >
                                <IconUser size={16} />
                            </button>

                            {accountOpen && (
                                <div
                                    className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(290px,calc(100vw-1rem))] rounded-xl border p-2 animate-slide-down"
                                    style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
                                >
                                    <div className="px-2.5 py-2 mb-1 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>
                                        <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{userName}</p>
                                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{user?.email}</p>
                                    </div>

                                    <nav className="space-y-1" aria-label="Navegación de panel">
                                        {panelItems.map((item) => {
                                            const ItemIcon = item.icon;
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
                                                        <ItemIcon size={17} stroke={1.9} />
                                                    </span>
                                                    <span className="flex-1 truncate font-medium">{item.label}</span>
                                                    {item.badge ? (
                                                        <span className="text-[10px] font-medium px-1.5 py-[0.2rem] rounded-[5px] border uppercase tracking-[0.04em]" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                                                            {item.badge}
                                                        </span>
                                                    ) : null}
                                                </Link>
                                            );
                                        })}
                                    </nav>

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
                    <div className="hidden md:flex">
                        {isLoggedIn ? (
                            <PanelButton 
                                onClick={handlePublicar} 
                                variant="primary" 
                                size="sm" 
                                className="h-9 px-4 text-sm"
                            >
                                <IconPlus size={13} /> Publicar
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

                    {/* Mobile Menu (Hamburger) - Only visible on mobile */}
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
                                            handlePublicar();
                                        }}
                                        variant="primary"
                                        className="w-full h-10 text-sm mb-2"
                                    >
                                        <IconPlus size={14} /> Publicar
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
                                {links.map((l) => (
                                    <Link
                                        key={l.href}
                                        href={l.href}
                                        onClick={() => setMenuOpen(false)}
                                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-(--bg-subtle)"
                                        style={{ color: 'var(--fg-secondary)' }}
                                    >
                                        <span>{l.label}</span>
                                        {l.isNew ? (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                                <IconSparkles size={10} />
                                                Nuevo
                                            </span>
                                        ) : null}
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
