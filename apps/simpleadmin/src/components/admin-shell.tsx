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
    IconArrowLeft,
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
                        className={`group relative flex h-11 items-center rounded-xl text-sm transition-colors hover:bg-(--bg-subtle) ${
                            collapsed ? 'justify-center px-1.5' : 'gap-2.5 px-2.5'
                        }`}
                        style={{ background: active ? 'var(--bg-subtle)' : 'transparent', color: active ? 'var(--fg)' : 'var(--fg-secondary)' }}
                    >
                        <span
                            className="w-9 h-9 rounded-[10px] border flex items-center justify-center transition-colors group-hover:border-(--border-strong) group-hover:text-(--fg)"
                            style={{
                                borderColor: active ? 'var(--accent-border)' : 'var(--border)',
                                background: active
                                    ? 'var(--accent)'
                                    : 'color-mix(in srgb, var(--bg-subtle) 70%, transparent)',
                                color: active ? 'var(--accent-contrast)' : 'var(--fg-secondary)',
                            }}
                        >
                            <Icon size={17} stroke={1.9} />
                        </span>

                        {!collapsed ? (
                            <span className="min-w-0 flex-1 flex items-center justify-between gap-2">
                                <span className="truncate text-sm font-medium">{item.label}</span>
                                {active ? (
                                    <span
                                        className="text-[10px] font-medium px-1.5 py-[0.2rem] rounded-[5px] border uppercase tracking-[0.04em]"
                                        style={{ borderColor: 'var(--accent-border)', color: 'var(--accent)' }}
                                    >
                                        Activo
                                    </span>
                                ) : null}
                            </span>
                        ) : (
                            <span
                                className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-60 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-[10px] border px-2.5 py-1.5 text-sm font-medium opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
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
        <div className="flex min-h-screen w-full" style={{ background: 'var(--bg)' }}>
            <aside className={`hidden lg:block px-2 pt-3 pb-2 shrink-0 transition-[width] duration-200 ${collapsed ? 'w-29' : 'w-73'}`}>
                <div
                    className="sticky top-4 rounded-2xl border p-3 flex flex-col"
                    style={{
                        borderColor: 'var(--border)',
                        background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
                        boxShadow: 'var(--shadow-md)',
                    }}
                >
                    <div className={`mb-3 flex ${collapsed ? 'justify-center' : 'justify-between'} items-center gap-2`}>
                        {!collapsed ? (
                            <div className="min-w-0 flex items-center gap-2 px-1">
                                <span
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border"
                                    style={{
                                        borderColor: 'var(--accent-border)',
                                        background: 'var(--accent)',
                                        color: 'var(--accent-contrast)',
                                        boxShadow: '0 10px 24px rgba(0, 0, 0, 0.14)',
                                    }}
                                >
                                    <IconShieldLock size={18} stroke={1.9} />
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                        SimpleAdmin
                                    </span>
                                    <span className="text-[10px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--accent)' }}>
                                        Control central
                                    </span>
                                </span>
                            </div>
                        ) : (
                            <Link
                                href="/"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border"
                                style={{
                                    borderColor: 'var(--accent-border)',
                                    background: 'var(--accent)',
                                    color: 'var(--accent-contrast)',
                                }}
                                title="Inicio"
                            >
                                <IconShieldLock size={18} stroke={1.9} />
                            </Link>
                        )}
                        <button
                            type="button"
                            onClick={() => setCollapsed((c) => !c)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border transition-colors hover:bg-(--bg-subtle) hover:border-(--border-strong) hover:text-(--fg)"
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
                                    style={{ borderColor: 'var(--accent-border)', color: 'var(--accent)' }}
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
                        {!collapsed ? (
                            <Link
                                href="https://simpleplataforma.app"
                                className="group mb-2 flex h-10 w-full items-center gap-2 rounded-[10px] border px-2.5 transition-colors hover:bg-(--bg-subtle) hover:border-(--border-strong) hover:text-(--fg)"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                            >
                                <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-(--bg-muted)">
                                    <IconArrowLeft size={13} stroke={1.9} />
                                </span>
                                <span className="text-sm font-medium">Ir a la plataforma</span>
                            </Link>
                        ) : (
                            <Link
                                href="https://simpleplataforma.app"
                                className="group mb-2 flex h-10 w-full items-center justify-center rounded-[10px] border transition-colors hover:bg-(--bg-subtle) hover:border-(--border-strong) hover:text-(--fg)"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                title="Ir a la plataforma"
                            >
                                <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-(--bg-muted)">
                                    <IconArrowLeft size={13} stroke={1.9} />
                                </span>
                            </Link>
                        )}
                        <button
                            type="button"
                            className={`group flex h-10 w-full items-center rounded-[10px] border transition-colors hover:bg-(--bg-subtle) hover:border-(--border-strong) hover:text-(--fg) ${
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

            {mobileOpen ? (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />
                    <aside className="absolute left-0 top-0 h-full w-[min(340px,88vw)] p-3">
                        <div
                            className="h-full rounded-2xl border p-3 flex flex-col"
                            style={{
                                borderColor: 'var(--border)',
                                background: 'var(--surface)',
                                boxShadow: 'var(--shadow-md)',
                            }}
                        >
                            <div className="mb-3 flex items-center justify-between gap-2 px-1">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border"
                                        style={{
                                            borderColor: 'var(--accent-border)',
                                            background: 'var(--accent)',
                                            color: 'var(--accent-contrast)',
                                        }}
                                    >
                                        <IconShieldLock size={18} stroke={1.9} />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                            SimpleAdmin
                                        </span>
                                        <span className="text-[10px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--accent)' }}>
                                            Control central
                                        </span>
                                    </span>
                                </div>
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
                                        style={{ borderColor: 'var(--accent-border)', color: 'var(--accent)' }}
                                    >
                                        {roleLabel}
                                    </span>
                                </span>
                            </div>

                            <AdminSidebarNav items={nav} pathname={pathname} collapsed={false} onNavigate={() => setMobileOpen(false)} />

                            <div className="pt-3 mt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                                <Link
                                    href="https://simpleplataforma.app"
                                    onClick={() => setMobileOpen(false)}
                                    className="group mb-2 flex h-10 w-full items-center gap-2 rounded-[10px] border px-2.5 transition-colors hover:bg-(--bg-subtle) hover:border-(--border-strong) hover:text-(--fg)"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                >
                                    <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-(--bg-muted)">
                                        <IconArrowLeft size={13} stroke={1.9} />
                                    </span>
                                    <span className="text-sm font-medium">Ir a la plataforma</span>
                                </Link>
                                <button
                                    type="button"
                                    className="group flex h-10 w-full items-center gap-2 rounded-[10px] border px-2.5 transition-colors hover:bg-(--bg-subtle) hover:border-(--border-strong) hover:text-(--fg)"
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

            <section className="flex-1 min-w-0">
                <div className="px-4 pt-3 pb-2 sm:px-6">
                    <div
                        className="sticky top-4 z-40 rounded-2xl border px-3 py-3 sm:px-4"
                        style={{
                            borderColor: 'var(--border)',
                            background: 'color-mix(in srgb, var(--surface) 88%, transparent)',
                            backdropFilter: 'blur(8px)',
                            boxShadow: 'var(--shadow-sm)',
                        }}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-3">
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
                                <div className="min-w-0">
                                    <p className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--accent)' }}>
                                        Panel administrativo
                                    </p>
                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                        <h1 className="truncate text-base font-semibold sm:text-lg" style={{ color: 'var(--fg)' }}>
                                            {headerTitle}
                                        </h1>
                                        <span
                                            className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em]"
                                            style={{
                                                borderColor: 'var(--accent-border)',
                                                background: 'var(--accent-soft)',
                                                color: 'var(--accent)',
                                            }}
                                        >
                                            {roleLabel}
                                        </span>
                                    </div>
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
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-xs font-semibold"
                                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                                    >
                                        {userInitial}
                                    </span>
                                    <span className="max-w-[160px] min-w-0">
                                        <span className="block truncate text-xs font-medium" style={{ color: 'var(--fg)' }}>
                                            {userName}
                                        </span>
                                        <span className="text-[10px] font-medium uppercase tracking-[0.04em]" style={{ color: 'var(--fg-muted)' }}>
                                            {user.email}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <main className="min-h-0 min-w-0 overflow-y-auto px-4 pb-6 sm:px-6">{children}</main>
            </section>
        </div>
    );
}
