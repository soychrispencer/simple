'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
    IconChevronLeft,
    IconChevronRight,
    IconX,
} from '@tabler/icons-react';
import { useAuth } from '@/context/auth-context';
import {
    getPanelNavItems,
    isPanelNavActive,
    panelRoleLabel,
    type PanelNavItem,
    type PanelRole,
} from '@/components/panel/panel-nav-config';
import { PanelBottomNav } from '@/components/panel/panel-bottom-nav';

const STORAGE_COLLAPSED = 'simpleautos:panel:collapsed';

function SidebarNav({
    items,
    pathname,
    collapsed,
    onNavigate,
}: {
    items: PanelNavItem[];
    pathname: string;
    collapsed: boolean;
    onNavigate?: () => void;
}) {
    return (
        <nav className="pr-1 space-y-2">
            {items.map((item) => {
                const Icon = item.icon;
                const active = isPanelNavActive(pathname, item.href);

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? 'page' : undefined}
                        className={`group relative flex h-11 items-center rounded-xl text-sm transition-colors hover:bg-[var(--bg-subtle)] ${
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
                            <span className="min-w-0 flex-1 flex items-center justify-between gap-2">
                                <span className="truncate text-sm font-medium">{item.label}</span>
                                {item.badge ? (
                                    <span
                                        className="text-[10px] font-medium px-1.5 py-[0.2rem] rounded-[5px] border uppercase tracking-[0.04em]"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                    >
                                        {item.badge}
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

export function PanelShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() ?? '';
    const { user } = useAuth();
    const role: PanelRole = user?.role ?? 'user';

    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const navItems = useMemo(() => getPanelNavItems(role), [role]);

    const userName = user?.name?.trim() || 'Usuario';
    const userInitial = userName.charAt(0).toUpperCase();
    const userRoleLabel = panelRoleLabel(role);

    useEffect(() => {
        const storedCollapsed = window.localStorage.getItem(STORAGE_COLLAPSED);
        if (storedCollapsed === '1') setCollapsed(true);
    }, []);

    useEffect(() => {
        window.localStorage.setItem(STORAGE_COLLAPSED, collapsed ? '1' : '0');
    }, [collapsed]);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    useEffect(() => {
        const onOpenPanelMenu = () => setMobileOpen(true);
        if (typeof window !== 'undefined') {
            window.addEventListener('simple:panel-mobile-open', onOpenPanelMenu);
        }
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('simple:panel-mobile-open', onOpenPanelMenu);
            }
        };
    }, []);

    return (
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
                            onClick={() => setCollapsed((prev) => !prev)}
                            className="w-8 h-8 rounded-[10px] flex items-center justify-center border transition-colors hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                            aria-label={collapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
                        >
                            {collapsed ? <IconChevronRight size={15} /> : <IconChevronLeft size={15} />}
                        </button>
                    </div>

                    <div
                        className={`mb-3 rounded-xl border ${collapsed ? 'p-1.5 flex justify-center' : 'p-2.5 flex items-center gap-2.5'}`}
                        style={{ borderColor: 'var(--border)' }}
                        title={collapsed ? `${userName} · ${userRoleLabel}` : undefined}
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
                                <span
                                    className="inline-flex mt-1 text-[10px] font-medium px-1.5 py-[0.2rem] rounded-[5px] border uppercase tracking-[0.04em]"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                >
                                    {userRoleLabel}
                                </span>
                            </span>
                        ) : null}
                    </div>

                    <SidebarNav items={navItems} pathname={pathname} collapsed={collapsed} />
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
                                    Mi Panel · {panelRoleLabel(role)}
                                </span>
                                <button
                                    onClick={() => setMobileOpen(false)}
                                    className="w-8 h-8 rounded-[10px] flex items-center justify-center border transition-colors hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
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
                                    <span
                                        className="inline-flex mt-1 text-[10px] font-medium px-1.5 py-[0.2rem] rounded-[5px] border uppercase tracking-[0.04em]"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                    >
                                    {userRoleLabel}
                                    </span>
                                </span>
                            </div>

                            <SidebarNav
                                items={navItems}
                                pathname={pathname}
                                collapsed={false}
                                onNavigate={() => setMobileOpen(false)}
                            />
                        </div>
                    </aside>
                </div>
            ) : null}

            <section className="flex-1 min-w-0">
                {user?.status !== 'verified' && (
                    <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between" style={{ background: 'var(--color-warning-subtle)', borderColor: 'rgba(217, 119, 6, 0.3)' }}>
                        <div className="flex items-center gap-3 flex-1">
                            <div className="text-lg">⚠️</div>
                            <div className="flex-1">
                                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                    Tu email aún no está verificado
                                </p>
                                <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                                    Revisa tu bandeja de entrada para confirmar tu email y desbloquear todas las funciones.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                <div className="panel-content-frame pb-20 lg:pb-0">{children}</div>
            </section>

            <PanelBottomNav />
        </div>
    );
}
