'use client';

import type { ReactNode, ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { IconX } from '@tabler/icons-react';
import { Sidebar, type NavItem, type UserInfo } from '../sidebar/app-sidebar';

type TablerIcon = ComponentType<{ size?: number; stroke?: number }>;

export type PanelShellProps = {
    children: ReactNode;
    navItems: NavItem[];
    user: UserInfo;
    roleLabel: string;
    collapsedStorageKey: string;
    footerHref?: string | null;
    footerLabel?: string;
    footerIcon?: TablerIcon;
    bottomNav?: ReactNode;
    chromeEnabled?: boolean;
    showVerificationBanner?: boolean;
    isVerified?: boolean;
    mobileMenuEventName?: string;
    mobileDrawerTitle?: string;
};

function PanelNavList({
    items,
    pathname,
    onNavigate,
}: {
    items: NavItem[];
    pathname: string;
    onNavigate?: () => void;
}) {
    return (
        <nav className="pr-1 space-y-2">
            {items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? 'page' : undefined}
                        className="group relative flex h-11 items-center gap-2.5 rounded-xl px-2.5 text-sm transition-colors hover:bg-[var(--bg-subtle)]"
                        style={{
                            background: active ? 'var(--bg-subtle)' : 'transparent',
                            color: active ? 'var(--fg)' : 'var(--fg-secondary)',
                        }}
                    >
                        <span
                            className="flex h-9 w-9 items-center justify-center rounded-[10px] border transition-colors group-hover:border-[var(--border-strong)] group-hover:text-[var(--fg)]"
                            style={{
                                borderColor: active ? 'var(--button-primary-border)' : 'var(--border)',
                                background: active ? 'var(--button-primary-bg)' : 'transparent',
                                color: active ? 'var(--button-primary-color)' : 'var(--fg-secondary)',
                                boxShadow: active ? 'var(--shadow-xs)' : 'none',
                            }}
                        >
                            <Icon size={17} stroke={1.9} />
                        </span>

                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>

                        {item.badge ? (
                            <span
                                className="rounded-[5px] border px-1.5 py-[0.2rem] text-[10px] font-medium uppercase tracking-[0.04em]"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                            >
                                {item.badge}
                            </span>
                        ) : null}
                    </Link>
                );
            })}
        </nav>
    );
}

export function PanelShell({
    children,
    navItems,
    user,
    roleLabel,
    collapsedStorageKey,
    footerHref = null,
    footerLabel = 'Mi cuenta',
    footerIcon,
    bottomNav,
    chromeEnabled = true,
    showVerificationBanner = true,
    isVerified = true,
    mobileMenuEventName = 'simple:panel-mobile-open',
    mobileDrawerTitle = 'Mi Panel',
}: PanelShellProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const pathname = usePathname() ?? '';
    const showChrome = chromeEnabled;
    const userName = user?.name?.trim() || 'Usuario';
    const userInitial = userName.charAt(0).toUpperCase();

    useEffect(() => {
        const storedCollapsed = window.localStorage.getItem(collapsedStorageKey);
        if (storedCollapsed === '1') setCollapsed(true);
    }, [collapsedStorageKey]);

    useEffect(() => {
        window.localStorage.setItem(collapsedStorageKey, collapsed ? '1' : '0');
    }, [collapsed, collapsedStorageKey]);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!showChrome) return;

        const onOpenPanelMenu = () => setMobileOpen(true);
        window.addEventListener(mobileMenuEventName, onOpenPanelMenu);
        return () => window.removeEventListener(mobileMenuEventName, onOpenPanelMenu);
    }, [mobileMenuEventName, showChrome]);

    const footer = useMemo(() => {
        if (!footerHref) return null;
        return {
            href: footerHref,
            label: footerLabel,
            icon: footerIcon,
        };
    }, [footerHref, footerIcon, footerLabel]);
    const FooterIcon = footer?.icon;

    return (
        <div className="flex min-h-[calc(100vh-64px)] w-full">
            {showChrome ? (
                <Sidebar
                    navItems={navItems}
                    user={{ ...user, name: userName, role: roleLabel }}
                    collapsed={collapsed}
                    onToggle={() => setCollapsed((prev) => !prev)}
                    footerHref={footer?.href}
                    footerLabel={footer?.label}
                    footerIcon={footer?.icon}
                />
            ) : null}

            {showChrome && mobileOpen ? (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                        aria-label="Cerrar menú del panel"
                        onClick={() => setMobileOpen(false)}
                    />
                    <aside className="absolute left-0 top-0 h-full w-[min(340px,88vw)] p-3">
                        <div
                            className="flex h-full flex-col rounded-2xl border p-3"
                            style={{
                                borderColor: 'var(--border)',
                                background: 'var(--surface)',
                                boxShadow: 'var(--shadow-md)',
                            }}
                        >
                            <div className="mb-3 flex items-center justify-between gap-2 px-1">
                                <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    {mobileDrawerTitle} · {roleLabel}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setMobileOpen(false)}
                                    className="flex h-8 w-8 items-center justify-center rounded-[10px] border transition-colors hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                    aria-label="Cerrar menú"
                                >
                                    <IconX size={15} />
                                </button>
                            </div>

                            <div
                                className="mb-3 flex items-center gap-2.5 rounded-xl border p-2.5"
                                style={{ borderColor: 'var(--border)' }}
                            >
                                <span
                                    className="flex h-8 w-8 items-center justify-center rounded-[10px] text-sm font-semibold"
                                    style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}
                                >
                                    {userInitial}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm" style={{ color: 'var(--fg)' }}>
                                        {userName}
                                    </span>
                                    <span
                                        className="mt-1 inline-flex rounded-[5px] border px-1.5 py-[0.2rem] text-[10px] font-medium uppercase tracking-[0.04em]"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                    >
                                        {roleLabel}
                                    </span>
                                </span>
                            </div>

                            <PanelNavList items={navItems} pathname={pathname} onNavigate={() => setMobileOpen(false)} />

                            {footer ? (
                                <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                                    <Link
                                        href={footer.href}
                                        onClick={() => setMobileOpen(false)}
                                        className="group flex h-10 items-center gap-2 rounded-[10px] border px-2.5 transition-colors hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                    >
                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-muted)]">
                                            {FooterIcon ? <FooterIcon size={13} stroke={1.9} /> : null}
                                        </span>
                                        <span className="text-sm">{footer.label}</span>
                                    </Link>
                                </div>
                            ) : null}
                        </div>
                    </aside>
                </div>
            ) : null}

            <section className="min-w-0 flex-1">
                {showVerificationBanner && !isVerified ? (
                    <div
                        className="flex items-center justify-between border-b px-4 py-3"
                        style={{ background: 'var(--color-warning-subtle)', borderColor: 'rgba(217, 119, 6, 0.3)' }}
                    >
                        <div className="flex flex-1 items-center gap-3">
                            <div className="text-lg">⚠️</div>
                            <div className="flex-1">
                                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                    Tu email aún no está verificado
                                </p>
                                <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                                    Revisa tu bandeja de entrada para confirmar tu email y desbloquear todas las funciones.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className={`panel-content-frame ${showChrome ? 'pb-20 lg:pb-0' : ''}`}>{children}</div>
            </section>

            {showChrome ? bottomNav : null}
        </div>
    );
}
