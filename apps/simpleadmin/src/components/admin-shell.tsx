'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useState } from 'react';
import {
    IconLayoutDashboard,
    IconUsers,
    IconCar,
    IconFlag,
    IconSettings,
    IconLogout,
    IconSun,
    IconMoon,
    IconBell,
    IconChevronLeft,
    IconChevronRight,
    IconX,
    IconMenu2,
    IconShieldLock,
} from '@tabler/icons-react';
import { PanelIconButton } from '@simple/ui';
import { logoutAdmin, type AdminSessionUser } from '@/lib/api';

const STORAGE_COLLAPSED = 'simpleadmin:sidebar:collapsed';

function adminRoleLabel(role: AdminSessionUser['role']): string {
    return role === 'superadmin' ? 'Superadmin' : 'Admin';
}

type NavItem = { href: string; icon: typeof IconLayoutDashboard; label: string };

function AdminSidebarNav({
    items,
    pathname,
    collapsed,
    onNavigate,
}: {
    items: NavItem[];
    pathname: string;
    collapsed: boolean;
    onNavigate?: () => void;
}) {
    return (
        <nav className="pr-1 space-y-2">
            {items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? 'page' : undefined}
                        className={`group relative flex h-11 items-center rounded-[12px] text-sm transition-colors hover:bg-[var(--bg-subtle)] ${
                            collapsed ? 'justify-center px-1.5' : 'gap-2.5 px-2.5'
                        }`}
                        style={{ background: active ? 'var(--bg-subtle)' : 'transparent', color: active ? 'var(--fg)' : 'var(--fg-secondary)' }}
                    >
                        <span
                            className="w-9 h-9 rounded-[10px] border flex items-center justify-center transition-colors group-hover:border-[var(--border-strong)] group-hover:text-[var(--fg)]"
                            style={{
                                borderColor: active ? 'var(--button-primary-border)' : 'var(--border)',
                                background: active
                                    ? 'var(--button-primary-bg)'
                                    : 'color-mix(in srgb, var(--bg-subtle) 70%, transparent)',
                                color: active ? 'var(--button-primary-color)' : 'var(--fg-secondary)',
                            }}
                        >
                            <Icon size={17} stroke={1.9} />
                        </span>

                        {!collapsed ? (
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
                        ) : (
                            <span
                                className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-[60] -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-[10px] border px-2.5 py-1.5 text-sm font-medium opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
                                style={{
                                    background: 'var(--surface)',
                                    borderColor: 'var(--border)',
                                    color: 'var(--fg)',
                                    boxShadow: 'var(--shadow-sm)',
                                }}
                            >
                                {item.label}
                            </span>
                        )}
                    </Link>
                );
            })}
        </nav>
    );
}

export function AdminShell({ children, user }: { children: React.ReactNode; user: AdminSessionUser }) {
    const pathname = usePathname() ?? '';
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const nav: NavItem[] = useMemo(
        () => [
            { href: '/', icon: IconLayoutDashboard, label: 'Dashboard' },
            { href: '/usuarios', icon: IconUsers, label: 'Usuarios' },
            { href: '/publicaciones', icon: IconCar, label: 'Publicaciones' },
            { href: '/reportes', icon: IconFlag, label: 'Leads' },
            { href: '/configuracion', icon: IconSettings, label: 'Configuración' },
        ],
        []
    );

    const userName = user.name?.trim() || 'Administrador';
    const userInitial = userName.charAt(0).toUpperCase();
    const roleLabel = adminRoleLabel(user.role);

    const headerTitle = useMemo(() => {
        const match = nav.find((n) => n.href === pathname || (n.href !== '/' && pathname.startsWith(n.href)));
        return match?.label ?? 'SimpleAdmin';
    }, [nav, pathname]);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        try {
            if (typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_COLLAPSED) === '1') {
                setCollapsed(true);
            }
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_COLLAPSED, collapsed ? '1' : '0');
        } catch {
            /* ignore */
        }
    }, [collapsed]);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    return (
        <div className="flex min-h-screen w-full flex-col" style={{ background: 'var(--bg)' }}>
            {/* Barra superior a todo el ancho (el sidebar queda debajo, no la corta) */}
            <header
                className={`flex h-14 w-full shrink-0 items-center justify-between gap-4 border-b px-4 sm:px-6 ${mobileOpen ? 'z-[55]' : 'z-50'}`}
                style={{
                    borderColor: 'var(--border)',
                    background: 'color-mix(in srgb, var(--surface) 88%, transparent)',
                    backdropFilter: 'blur(8px)',
                }}
            >
                <div className="flex min-w-0 items-center gap-3">
                    <PanelIconButton
                        label={mobileOpen ? 'Cerrar menú' : 'Menú'}
                        variant="soft"
                        size="md"
                        className="rounded-[10px] lg:hidden"
                        onClick={() => setMobileOpen((open) => !open)}
                    >
                        {mobileOpen ? <IconX size={18} stroke={1.9} /> : <IconMenu2 size={18} stroke={1.9} />}
                    </PanelIconButton>
                    <Link href="/" className="hidden min-w-0 items-center gap-2 sm:inline-flex" title="Ir al inicio">
                        <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border"
                            style={{
                                borderColor: 'var(--border)',
                                background: 'var(--button-primary-bg)',
                                color: 'var(--button-primary-color)',
                            }}
                        >
                            <IconShieldLock size={16} stroke={1.9} />
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                SimpleAdmin
                            </span>
                            <span className="text-[10px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--fg-muted)' }}>
                                Consola
                            </span>
                        </span>
                    </Link>
                    <div className="min-w-0 sm:ml-2 sm:border-l sm:pl-4" style={{ borderColor: 'var(--border)' }}>
                        <p className="text-xs font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--fg-muted)' }}>
                            Panel administrativo
                        </p>
                        <h1 className="truncate text-sm font-semibold sm:text-base" style={{ color: 'var(--fg)' }}>
                            {headerTitle}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                    <PanelIconButton label="Leads y alertas" variant="soft" size="md" className="rounded-[10px]" onClick={() => router.push('/reportes')}>
                        <IconBell size={18} />
                    </PanelIconButton>
                    {mounted ? (
                        <PanelIconButton
                            label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                            variant="soft"
                            size="md"
                            className="rounded-[10px]"
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        >
                            {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
                        </PanelIconButton>
                    ) : null}
                    <div className="hidden items-center gap-2 border-l pl-2 sm:ml-1 sm:flex" style={{ borderColor: 'var(--border)' }}>
                        <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-xs font-semibold"
                            style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}
                        >
                            {userInitial}
                        </span>
                        <span className="max-w-[140px] min-w-0">
                            <span className="block truncate text-xs font-medium" style={{ color: 'var(--fg)' }}>
                                {userName}
                            </span>
                            <span className="text-[10px] font-medium uppercase tracking-[0.04em]" style={{ color: 'var(--fg-muted)' }}>
                                {roleLabel}
                            </span>
                        </span>
                    </div>
                </div>
            </header>

            {/* Debajo del header: sidebar + contenido */}
            <div className="flex min-h-0 min-w-0 flex-1">
            {/* Desktop sidebar */}
            <aside className={`hidden shrink-0 flex-col px-2 py-3 transition-[width] duration-200 lg:flex ${collapsed ? 'w-[116px]' : 'w-[292px]'}`}>
                <div
                    className="flex min-h-0 flex-1 flex-col rounded-[16px] border p-3"
                    style={{
                        borderColor: 'var(--border)',
                        background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
                        boxShadow: 'var(--shadow-md)',
                    }}
                >
                    <div className={`mb-3 flex items-center gap-2 ${collapsed ? 'flex-col' : 'justify-between'}`}>
                        {!collapsed ? (
                            <span className="min-w-0 flex-1 truncate px-1 text-xs font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--fg-muted)' }}>
                                Secciones
                            </span>
                        ) : (
                            <Link
                                href="/"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border"
                                style={{
                                    borderColor: 'var(--border)',
                                    background: 'var(--button-primary-bg)',
                                    color: 'var(--button-primary-color)',
                                }}
                                title="Inicio"
                            >
                                <IconShieldLock size={18} stroke={1.9} />
                            </Link>
                        )}
                        <button
                            type="button"
                            onClick={() => setCollapsed((c) => !c)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border transition-colors hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                            aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
                        >
                            {collapsed ? <IconChevronRight size={15} /> : <IconChevronLeft size={15} />}
                        </button>
                    </div>

                    <div
                        className={`mb-3 rounded-[12px] border ${collapsed ? 'p-1.5 flex justify-center' : 'p-2.5 flex items-center gap-2.5'}`}
                        style={{ borderColor: 'var(--border)' }}
                        title={collapsed ? `${userName} · ${roleLabel}` : undefined}
                    >
                        <span
                            className="w-8 h-8 rounded-[10px] flex items-center justify-center text-sm font-semibold shrink-0"
                            style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}
                        >
                            {userInitial}
                        </span>
                        {!collapsed ? (
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm truncate" style={{ color: 'var(--fg)' }}>
                                    {userName}
                                </span>
                                <span
                                    className="inline-flex mt-1 text-[10px] font-medium px-1.5 py-[0.2rem] rounded-[5px] border uppercase tracking-[0.04em]"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                >
                                    {roleLabel}
                                </span>
                            </span>
                        ) : null}
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto">
                        <AdminSidebarNav items={nav} pathname={pathname} collapsed={collapsed} />
                    </div>

                    <div className="pt-3 mt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                        <button
                            type="button"
                            className={`group flex h-10 w-full items-center rounded-[10px] border transition-colors hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] hover:text-[var(--fg)] ${
                                collapsed ? 'justify-center px-1' : 'gap-2 px-2.5'
                            }`}
                            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                            onClick={async () => {
                                await logoutAdmin();
                                router.push('/');
                                router.refresh();
                            }}
                        >
                            <span className="w-7 h-7 rounded-[8px] flex items-center justify-center bg-[var(--bg-muted)]">
                                <IconLogout size={13} stroke={1.9} />
                            </span>
                            {!collapsed ? <span className="text-sm font-medium">Cerrar sesión</span> : null}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile drawer */}
            {mobileOpen ? (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />
                    <aside className="absolute left-0 top-0 h-full w-[min(340px,88vw)] p-3">
                        <div
                            className="h-full rounded-[16px] border p-3 flex flex-col"
                            style={{
                                borderColor: 'var(--border)',
                                background: 'var(--surface)',
                                boxShadow: 'var(--shadow-md)',
                            }}
                        >
                            <div className="mb-3 flex items-center justify-between gap-2 px-1">
                                <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                    SimpleAdmin
                                </span>
                                <PanelIconButton label="Cerrar menú" variant="soft" size="md" className="rounded-[10px]" onClick={() => setMobileOpen(false)}>
                                    <IconX size={16} />
                                </PanelIconButton>
                            </div>

                            <div className="mb-3 rounded-[12px] border p-2.5 flex items-center gap-2.5" style={{ borderColor: 'var(--border)' }}>
                                <span
                                    className="w-8 h-8 rounded-[10px] flex items-center justify-center text-sm font-semibold"
                                    style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}
                                >
                                    {userInitial}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm truncate" style={{ color: 'var(--fg)' }}>
                                        {userName}
                                    </span>
                                    <span
                                        className="inline-flex mt-1 text-[10px] font-medium px-1.5 py-[0.2rem] rounded-[5px] border uppercase tracking-[0.04em]"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                    >
                                        {roleLabel}
                                    </span>
                                </span>
                            </div>

                            <AdminSidebarNav items={nav} pathname={pathname} collapsed={false} onNavigate={() => setMobileOpen(false)} />

                            <div className="pt-3 mt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                                <button
                                    type="button"
                                    className="group flex h-10 w-full items-center gap-2 rounded-[10px] border px-2.5 transition-colors hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                    onClick={async () => {
                                        await logoutAdmin();
                                        router.push('/');
                                        router.refresh();
                                    }}
                                >
                                    <span className="w-7 h-7 rounded-[8px] flex items-center justify-center bg-[var(--bg-muted)]">
                                        <IconLogout size={13} stroke={1.9} />
                                    </span>
                                    <span className="text-sm font-medium">Cerrar sesión</span>
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            ) : null}

                <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
            </div>
        </div>
    );
}
