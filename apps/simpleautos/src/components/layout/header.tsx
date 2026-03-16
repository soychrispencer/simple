'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
    IconBell,
    IconSun,
    IconMoon,
    IconUser,
    IconMenu2,
    IconX,
    IconPlus,
    IconLogout,
    IconSparkles,
} from '@tabler/icons-react';
import { useAuth } from '@/context/auth-context';
import { getPanelNavItems, isPanelNavActive, type PanelRole } from '@/components/panel/panel-nav-config';
import { fetchPanelNotifications, type PanelNotification } from '@/lib/panel-notifications';
import { clearSavedListingsCache, syncSavedListingsFromApi } from '@/lib/saved-listings';
import { PanelButton, getPanelButtonClassName, getPanelButtonStyle } from '@simple/ui';

export function Header() {
    const pathname = usePathname() ?? '';
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<PanelNotification[]>([]);
    const accountRef = useRef<HTMLDivElement | null>(null);
    const notificationsRef = useRef<HTMLDivElement | null>(null);
    const mobileNotificationsRef = useRef<HTMLDivElement | null>(null);
    const { user, isLoggedIn, requireAuth, logout } = useAuth();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
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
            const insideAccount = accountRef.current?.contains(target) ?? false;
            const insideNotifications = notificationsRef.current?.contains(target) ?? false;
            const insideMobileNotifications = mobileNotificationsRef.current?.contains(target) ?? false;
            if (!insideAccount) setAccountOpen(false);
            if (!insideNotifications && !insideMobileNotifications) setNotificationsOpen(false);
        };

        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    const links = [
        { href: '/ventas', label: 'Comprar' },
        { href: '/arriendos', label: 'Arrendar' },
        { href: '/subastas', label: 'Subastas' },
        { href: '/servicios', label: 'Servicios' },
        { href: '/descubre', label: 'Descubre', isNew: true },
    ];

    const handlePublicar = () => {
        if (requireAuth(() => router.push('/panel/publicar'))) {
            router.push('/panel/publicar');
        }
    };

    const handleIngresar = () => {
        if (requireAuth(() => router.push('/panel'))) {
            router.push('/panel');
        }
    };

    const role: PanelRole = user?.role ?? 'user';
    const panelItems = useMemo(() => getPanelNavItems(role), [role]);
    const userName = user?.name?.trim() || 'Usuario';
    const unreadNotifications = notifications.length;

    const openPanelMobileMenu = () => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('simple:panel-mobile-open'));
        }
    };

    const handleMobileNotifications = () => {
        if (requireAuth(() => router.push('/panel/notificaciones'))) {
            router.push('/panel/notificaciones');
        }
    };

    const handlePanelShortcut = () => {
        if (!isLoggedIn) {
            handleIngresar();
            return;
        }
        openPanelMobileMenu();
    };

    return (
        <header className="relative z-40 transition-all duration-300" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="container-app flex items-center justify-between h-16">
                <Link href="/" className="flex items-center gap-1 group shrink-0">
                    <div className="h-9 w-9 overflow-hidden transition-transform duration-200 group-hover:scale-105">
                        <Image src="/logo.png" alt="SimpleAutos" width={36} height={36} className="h-full w-full object-contain" />
                    </div>
                    <span className="inline-flex items-end gap-[0.08rem] text-[1.05rem] tracking-tight" style={{ color: 'var(--fg)' }}>
                        <span className="font-semibold leading-none">Simple</span>
                        <span className="translate-y-[0.02em] font-normal leading-none" style={{ color: 'var(--fg-muted)' }}>Autos</span>
                    </span>
                </Link>

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
                                    <span
                                        className="header-nav-link-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                                    >
                                        <IconSparkles size={10} />
                                        Nuevo
                                    </span>
                                ) : null}
                            </span>
                        </Link>
                    ))}
                </nav>

                <div className="hidden md:flex items-center gap-2">
                    <div className="relative" ref={notificationsRef}>
                        <button
                            onClick={() => {
                                if (!isLoggedIn) {
                                    handleMobileNotifications();
                                    return;
                                }
                                setNotificationsOpen((prev) => !prev);
                                setAccountOpen(false);
                            }}
                            className="relative header-icon-chip"
                            aria-label="Notificaciones"
                            aria-expanded={isLoggedIn ? notificationsOpen : undefined}
                            aria-haspopup={isLoggedIn ? 'menu' : undefined}
                        >
                            <IconBell size={16} stroke={1.9} />
                            {isLoggedIn && unreadNotifications > 0 ? (
                                <span
                                    className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full px-1 flex items-center justify-center text-[10px] font-semibold"
                                    style={{ background: 'var(--fg)', color: 'var(--bg)' }}
                                >
                                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                                </span>
                            ) : null}
                        </button>

                        {isLoggedIn && notificationsOpen ? (
                            <div
                                className="absolute right-0 top-[calc(100%+8px)] z-50 w-[320px] rounded-xl border p-2 animate-slide-down"
                                style={{
                                    background: 'var(--surface)',
                                    borderColor: 'var(--border)',
                                    boxShadow: 'var(--shadow-md)',
                                }}
                            >
                                <div className="px-2.5 py-2 mb-1 flex items-center justify-between">
                                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                        Notificaciones
                                    </p>
                                    <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                        {unreadNotifications} sin leer
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {notifications.length === 0 ? (
                                        <div className="px-2.5 py-3 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                            Sin novedades por ahora.
                                        </div>
                                    ) : notifications.map((item) => (
                                        <Link
                                            key={item.id}
                                            href={item.href}
                                            onClick={() => setNotificationsOpen(false)}
                                            className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--bg-subtle)]"
                                        >
                                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--fg)' }} />
                                            <span className="min-w-0 flex-1">
                                                <p className="text-sm leading-5" style={{ color: 'var(--fg)' }}>
                                                    {item.title}
                                                </p>
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                                    {item.time}
                                                </p>
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {mounted ? (
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="header-icon-chip"
                            aria-label="Cambiar tema"
                        >
                            {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
                        </button>
                    ) : null}

                    <div className="relative" ref={accountRef}>
                        {isLoggedIn ? (
                            <button
                                onClick={() => {
                                    setAccountOpen((prev) => !prev);
                                    setNotificationsOpen(false);
                                }}
                                className="header-icon-chip"
                                aria-label="Menú panel"
                                aria-expanded={accountOpen}
                                aria-haspopup="menu"
                            >
                                <IconUser size={16} />
                            </button>
                        ) : (
                            <button onClick={handleIngresar} className="header-icon-chip" aria-label="Ingresar">
                                <IconUser size={16} />
                            </button>
                        )}

                        {isLoggedIn && accountOpen ? (
                            <div
                                className="absolute right-0 top-[calc(100%+8px)] z-50 w-[290px] rounded-xl border p-2 animate-slide-down"
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
                                                className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-[var(--bg-subtle)]"
                                                style={{
                                                    color: active ? 'var(--fg)' : 'var(--fg-secondary)',
                                                    background: active ? 'var(--bg-subtle)' : 'transparent',
                                                }}
                                            >
                                                <span
                                                    className="w-7 h-7 rounded-[8px] border flex items-center justify-center transition-colors group-hover:border-[var(--border-strong)] group-hover:text-[var(--fg)]"
                                                    style={{ borderColor: 'var(--border)', color: active ? 'var(--fg)' : 'var(--fg-muted)' }}
                                                >
                                                    <ItemIcon size={14} stroke={1.9} />
                                                </span>
                                                <span className="flex-1 truncate">{item.label}</span>
                                                {item.badge ? (
                                                    <span
                                                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[6px] border uppercase tracking-[0.06em] transition-colors group-hover:border-[var(--border-strong)] group-hover:text-[var(--fg)]"
                                                        style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                                    >
                                                        {item.badge}
                                                    </span>
                                                ) : null}
                                            </Link>
                                        );
                                    })}
                                </nav>

                                <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                                    <button
                                        onClick={() => {
                                            setAccountOpen(false);
                                            void logout();
                                        }}
                                        className="group w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-[var(--bg-subtle)]"
                                        style={{ color: 'var(--fg-secondary)' }}
                                    >
                                        <span
                                            className="w-7 h-7 rounded-[8px] border flex items-center justify-center transition-colors group-hover:border-[var(--border-strong)] group-hover:text-[var(--fg)]"
                                            style={{ borderColor: 'var(--border)' }}
                                        >
                                            <IconLogout size={14} stroke={1.9} />
                                        </span>
                                        Cerrar sesión
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <PanelButton onClick={handlePublicar} variant="primary" size="sm" className="h-9 px-4 text-sm">
                        <IconPlus size={13} /> Publicar
                    </PanelButton>
                </div>

                <div className="relative flex md:hidden items-center gap-2" ref={mobileNotificationsRef}>
                    <button
                        onClick={() => {
                            if (!isLoggedIn) {
                                handleMobileNotifications();
                                return;
                            }
                            setNotificationsOpen((prev) => !prev);
                            setAccountOpen(false);
                        }}
                        className="relative header-icon-chip"
                        aria-label="Notificaciones"
                        aria-expanded={isLoggedIn ? notificationsOpen : undefined}
                        aria-haspopup={isLoggedIn ? 'menu' : undefined}
                    >
                        <IconBell size={16} stroke={1.9} />
                        {isLoggedIn && unreadNotifications > 0 ? (
                            <span
                                className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full px-1 flex items-center justify-center text-[10px] font-semibold"
                                style={{ background: 'var(--fg)', color: 'var(--bg)' }}
                            >
                                {unreadNotifications > 9 ? '9+' : unreadNotifications}
                            </span>
                        ) : null}
                    </button>
                    {mounted ? (
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="header-icon-chip"
                            aria-label="Cambiar tema"
                        >
                            {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
                        </button>
                    ) : null}
                    <button onClick={handlePanelShortcut} className="header-icon-chip" aria-label="Menú panel">
                        <IconUser size={16} />
                    </button>
                    <button onClick={() => setMobileOpen(!mobileOpen)} className="header-icon-chip" aria-label="Menú">
                        {mobileOpen ? <IconX size={18} /> : <IconMenu2 size={18} />}
                    </button>

                    {isLoggedIn && notificationsOpen ? (
                        <div
                            className="md:hidden absolute right-0 top-[calc(100%+8px)] z-50 w-[min(320px,calc(100vw-1rem))] rounded-xl border p-2 animate-slide-down"
                            style={{
                                background: 'var(--surface)',
                                borderColor: 'var(--border)',
                                boxShadow: 'var(--shadow-md)',
                            }}
                        >
                            <div className="px-2.5 py-2 mb-1 flex items-center justify-between">
                                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                    Notificaciones
                                </p>
                                <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                    {unreadNotifications} sin leer
                                </span>
                            </div>
                            <div className="space-y-1">
                                {notifications.length === 0 ? (
                                    <div className="px-2.5 py-3 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                        Sin novedades por ahora.
                                    </div>
                                ) : notifications.map((item) => (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        onClick={() => setNotificationsOpen(false)}
                                        className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--bg-subtle)]"
                                    >
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--fg)' }} />
                                        <span className="min-w-0 flex-1">
                                            <p className="text-sm leading-5" style={{ color: 'var(--fg)' }}>
                                                {item.title}
                                            </p>
                                            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                                {item.time}
                                            </p>
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            {mobileOpen ? (
                <div className="md:hidden animate-slide-down" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
                    <nav className="container-app flex flex-col py-4 gap-1">
                        {links.map((l) => (
                            <Link
                                key={l.href}
                                href={l.href}
                                className="py-2.5 px-3 text-base rounded-lg"
                                style={{ color: 'var(--fg-secondary)' }}
                                onClick={() => setMobileOpen(false)}
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <span>{l.label}</span>
                                    {l.isNew ? (
                                        <span
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                                            style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}
                                        >
                                            <IconSparkles size={10} />
                                            Nuevo
                                        </span>
                                    ) : null}
                                </span>
                            </Link>
                        ))}
                        <div className="mt-3 flex gap-2">
                            {isLoggedIn ? (
                                <>
                                    <Link
                                        href="/panel"
                                        className={getPanelButtonClassName({ className: 'flex-1 h-10 text-sm' })}
                                        style={getPanelButtonStyle('secondary')}
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        Mi panel
                                    </Link>
                                    <PanelButton
                                        onClick={() => {
                                            setMobileOpen(false);
                                            handlePublicar();
                                        }}
                                        variant="primary"
                                        className="flex-1 h-10 text-sm"
                                    >
                                        Publicar
                                    </PanelButton>
                                </>
                            ) : (
                                <>
                                    <PanelButton
                                        onClick={() => {
                                            setMobileOpen(false);
                                            handleIngresar();
                                        }}
                                        variant="secondary"
                                        className="flex-1 h-10 text-sm"
                                    >
                                        Ingresar
                                    </PanelButton>
                                    <PanelButton
                                        onClick={() => {
                                            setMobileOpen(false);
                                            handlePublicar();
                                        }}
                                        variant="primary"
                                        className="flex-1 h-10 text-sm"
                                    >
                                        Publicar
                                    </PanelButton>
                                </>
                            )}
                        </div>

                        {isLoggedIn ? (
                            <PanelButton
                                onClick={() => {
                                    void logout();
                                    setMobileOpen(false);
                                }}
                                variant="secondary"
                                className="mt-2 w-full h-10 text-sm"
                            >
                                Cerrar sesión
                            </PanelButton>
                        ) : null}
                    </nav>
                </div>
            ) : null}
        </header>
    );
}
