'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useState } from 'react';
import {
    IconArrowLeft,
    IconBell,
    IconChevronLeft,
    IconChevronRight,
    IconCreditCard,
    IconFlag,
    IconLayoutDashboard,
    IconMenu2,
    IconMoon,
    IconCar,
    IconLogout,
    IconSettings,
    IconShieldLock,
    IconSun,
    IconUser,
    IconUsers,
    IconX,
} from '@tabler/icons-react';
import { logoutAdmin, type AdminSessionUser } from '@/lib/api';
import { ADMIN_SCOPE_ITEMS, adminScopeLabel, normalizeAdminScope, withAdminScope } from '@/lib/admin-scope';

const STORAGE_COLLAPSED = 'simpleadmin:sidebar:collapsed';

function adminRoleLabel(role: AdminSessionUser['role']): string {
    return role === 'superadmin' ? 'Superadmin' : 'Admin';
}

type NavItem = { href: string; icon: typeof IconLayoutDashboard; label: string };

function isAdminNavActive(pathname: string, href: string): boolean {
    return pathname === href || (href !== '/' && pathname.startsWith(href));
}

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
                const active = isAdminNavActive(pathname, item.href.split('?')[0] || item.href);

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? 'page' : undefined}
                        className={`group relative flex h-11 items-center rounded-xl text-sm transition-colors hover:bg-(--bg-subtle) ${
                            collapsed ? 'justify-center px-1.5' : 'gap-2.5 px-2.5'
                        }`}
                        style={{
                            background: active ? 'var(--bg-subtle)' : 'transparent',
                            color: active ? 'var(--fg)' : 'var(--fg-secondary)',
                        }}
                    >
                        <span
                            className="w-9 h-9 rounded-[10px] border flex items-center justify-center transition-colors group-hover:border-(--border-strong) group-hover:text-(--fg)"
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
    const searchParams = useSearchParams();
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
            { href: '/suscripciones', icon: IconCreditCard, label: 'Suscripciones' },
            { href: '/reportes', icon: IconFlag, label: 'Leads' },
            { href: '/configuracion', icon: IconSettings, label: 'Configuración' },
        ],
        []
    );

    const userName = user.name?.trim() || 'Administrador';
    const userInitial = userName.charAt(0).toUpperCase();
    const roleLabel = adminRoleLabel(user.role);
    const scope = normalizeAdminScope(searchParams.get('scope'));

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        try {
            if (typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_COLLAPSED) === '1') {
                setCollapsed(true);
            }
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_COLLAPSED, collapsed ? '1' : '0');
        } catch {
            // ignore
        }
    }, [collapsed]);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    const handleLogout = async () => {
        await logoutAdmin();
        router.push('/');
        router.refresh();
    };

    return (
        <div className="flex min-h-screen w-full flex-col" style={{ background: 'var(--bg)' }}>
            <header className="relative z-40 transition-all duration-300" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="container-app flex items-center justify-between h-16">
                    <Link href={withAdminScope('/', scope)} className="flex items-center gap-2 group shrink-0">
                        <span
                            className="flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105"
                            style={{ background: 'var(--button-primary-bg)', color: 'var(--button-primary-color)' }}
                        >
                            <IconShieldLock size={18} stroke={1.9} />
                        </span>
                        <span className="inline-flex items-end gap-[0.08rem] text-[1.05rem] tracking-tight" style={{ color: 'var(--fg)' }}>
                            <span className="font-semibold leading-none">Simple</span>
                            <span className="translate-y-[0.02em] font-normal leading-none" style={{ color: 'var(--fg-muted)' }}>Admin</span>
                        </span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-1">
                        {ADMIN_SCOPE_ITEMS.map((item) => (
                            <Link
                                key={item.key}
                                href={withAdminScope(pathname || '/', item.key)}
                                className="header-nav-link px-3.5 py-2 text-sm font-medium rounded-lg transition-colors duration-200"
                                data-active={scope === item.key ? 'true' : 'false'}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="hidden md:flex items-center gap-2">
                        <button onClick={() => router.push(withAdminScope('/reportes', scope))} className="header-icon-chip" aria-label="Leads">
                            <IconBell size={16} stroke={1.9} />
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
                        <Link href="https://simpleplataforma.app" className="header-icon-chip" aria-label="Ir a la plataforma">
                            <IconArrowLeft size={16} stroke={1.9} />
                        </Link>
                        <button className="header-icon-chip" aria-label="Cuenta admin" title={`${userName} · ${user.email}`} type="button">
                            <IconUser size={16} stroke={1.9} />
                        </button>
                    </div>

                    <div className="relative flex md:hidden items-center gap-2">
                        <button onClick={() => router.push(withAdminScope('/reportes', scope))} className="header-icon-chip" aria-label="Leads">
                            <IconBell size={16} stroke={1.9} />
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
                        <button onClick={() => setMobileOpen((open) => !open)} className="header-icon-chip" aria-label="Menú">
                            {mobileOpen ? <IconX size={18} /> : <IconMenu2 size={18} />}
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex min-h-[calc(100vh-64px)] w-full">
                <aside className={`hidden lg:block px-2 pt-3 pb-2 shrink-0 transition-[width] duration-200 ${collapsed ? 'w-29' : 'w-73'}`}>
                    <div
                        className="sticky top-4 rounded-2xl border p-3 flex flex-col"
                        style={{
                            borderColor: 'var(--border)',
                            background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
                            boxShadow: 'var(--shadow-md)',
                        }}
                    >
                        <div className={`mb-3 flex ${collapsed ? 'justify-center' : 'justify-end'}`}>
                            <button
                                type="button"
                                onClick={() => setCollapsed((current) => !current)}
                                className="w-8 h-8 rounded-[10px] flex items-center justify-center border transition-colors hover:bg-(--bg-subtle) hover:border-(--border-strong) hover:text-(--fg)"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                aria-label={collapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
                            >
                                {collapsed ? <IconChevronRight size={15} /> : <IconChevronLeft size={15} />}
                            </button>
                        </div>

                        <div
                            className={`mb-3 rounded-xl border ${collapsed ? 'p-1.5 flex justify-center' : 'p-2.5 flex items-center gap-2.5'}`}
                            style={{ borderColor: 'var(--border)' }}
                            title={collapsed ? `${userName} · ${roleLabel}` : undefined}
                        >
                            <span
                                className="w-8 h-8 rounded-[10px] flex items-center justify-center text-sm font-semibold"
                                style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}
                            >
                                {userInitial}
                            </span>
                            {!collapsed ? (
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm truncate" style={{ color: 'var(--fg)' }}>
                                        {userName}
                                    </span>
                                    <span className="mt-1 block text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                                        {adminScopeLabel(scope)}
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

                        <AdminSidebarNav
                            items={nav.map((item) => ({ ...item, href: withAdminScope(item.href, scope) }))}
                            pathname={pathname}
                            collapsed={collapsed}
                        />

                        <div className="pt-3 mt-3 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
                            <Link
                                href="https://simpleplataforma.app"
                                className={`group flex h-10 items-center rounded-[10px] border transition-colors hover:bg-(--bg-subtle) hover:border-(--border-strong) hover:text-(--fg) ${
                                    collapsed ? 'justify-center' : 'gap-2 px-2.5'
                                }`}
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                title={collapsed ? 'Ir a la plataforma' : undefined}
                            >
                                <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-(--bg-muted)">
                                    <IconArrowLeft size={13} stroke={1.9} />
                                </span>
                                {!collapsed ? <span className="text-sm">Ir a la plataforma</span> : null}
                            </Link>

                            <button
                                type="button"
                                className={`group flex h-10 items-center rounded-[10px] border transition-colors hover:bg-(--bg-subtle) hover:border-(--border-strong) hover:text-(--fg) ${
                                    collapsed ? 'w-full justify-center' : 'w-full gap-2 px-2.5'
                                }`}
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                onClick={() => void handleLogout()}
                            >
                                <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-(--bg-muted)">
                                    <IconLogout size={13} stroke={1.9} />
                                </span>
                                {!collapsed ? <span className="text-sm">Cerrar sesión</span> : null}
                            </button>
                        </div>
                    </div>
                </aside>

                {mobileOpen ? (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <button
                            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                            aria-label="Cerrar menú del panel"
                            onClick={() => setMobileOpen(false)}
                        />
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
                                    <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                        {adminScopeLabel(scope)} · {roleLabel}
                                    </span>
                                    <button
                                        onClick={() => setMobileOpen(false)}
                                        className="w-8 h-8 rounded-[10px] flex items-center justify-center border transition-colors hover:bg-(--bg-subtle) hover:border-(--border-strong) hover:text-(--fg)"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                        aria-label="Cerrar menú"
                                    >
                                        <IconX size={15} />
                                    </button>
                                </div>

                                <div
                                    className="mb-3 rounded-xl border p-2.5 flex items-center gap-2.5"
                                    style={{ borderColor: 'var(--border)' }}
                                >
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
                                        <span className="mt-1 block text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                                            {adminScopeLabel(scope)}
                                        </span>
                                        <span
                                            className="inline-flex mt-1 text-[10px] font-medium px-1.5 py-[0.2rem] rounded-[5px] border uppercase tracking-[0.04em]"
                                            style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                        >
                                            {roleLabel}
                                        </span>
                                    </span>
                                </div>

                                <div className="mb-3 flex flex-wrap gap-2">
                                    {ADMIN_SCOPE_ITEMS.map((item) => (
                                        <Link
                                            key={item.key}
                                            href={withAdminScope(pathname || '/', item.key)}
                                            onClick={() => setMobileOpen(false)}
                                            className="inline-flex rounded-full border px-3 py-2 text-xs font-medium transition-colors"
                                            style={{
                                                borderColor: scope === item.key ? 'var(--border-strong)' : 'var(--border)',
                                                background: scope === item.key ? 'var(--bg-subtle)' : 'transparent',
                                                color: scope === item.key ? 'var(--fg)' : 'var(--fg-secondary)',
                                            }}
                                        >
                                            {item.label}
                                        </Link>
                                    ))}
                                </div>

                                <AdminSidebarNav
                                    items={nav.map((item) => ({ ...item, href: withAdminScope(item.href, scope) }))}
                                    pathname={pathname}
                                    collapsed={false}
                                    onNavigate={() => setMobileOpen(false)}
                                />

                                <div className="pt-3 mt-3 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
                                    <Link
                                        href="https://simpleplataforma.app"
                                        onClick={() => setMobileOpen(false)}
                                        className="group flex h-10 items-center gap-2 rounded-[10px] border px-2.5 transition-colors hover:bg-(--bg-subtle) hover:border-(--border-strong) hover:text-(--fg)"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                    >
                                        <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-(--bg-muted)">
                                            <IconArrowLeft size={13} stroke={1.9} />
                                        </span>
                                        <span className="text-sm">Ir a la plataforma</span>
                                    </Link>

                                    <button
                                        type="button"
                                        className="group flex h-10 w-full items-center gap-2 rounded-[10px] border px-2.5 transition-colors hover:bg-(--bg-subtle) hover:border-(--border-strong) hover:text-(--fg)"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                        onClick={() => void handleLogout()}
                                    >
                                        <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-(--bg-muted)">
                                            <IconLogout size={13} stroke={1.9} />
                                        </span>
                                        <span className="text-sm">Cerrar sesión</span>
                                    </button>
                                </div>
                            </div>
                        </aside>
                    </div>
                ) : null}

                <section className="flex-1 min-w-0">
                    <div className="panel-content-frame">{children}</div>
                </section>
            </div>
        </div>
    );
}
