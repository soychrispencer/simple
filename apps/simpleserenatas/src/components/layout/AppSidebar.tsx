'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    IconChevronLeft,
    IconChevronRight,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { useMusicianInvitations } from '@/hooks';
import { getSerenatasPanelNavItems, isSerenatasNavActive } from '@/components/layout/panel-nav-config';

interface AppSidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
    const pathname = usePathname() ?? '';
    const { effectiveRole } = useAuth();
    const allNavItems = getSerenatasPanelNavItems(effectiveRole);
    // Separar ítems normales de footer (Mi Cuenta)
    const navItems = allNavItems.filter((item) => !item.isFooter);
    const footerItems = allNavItems.filter((item) => item.isFooter);
    // Badge dinámico para /invitaciones. Polling lento, sólo cuenta lo que requiere acción.
    const { totalPending } = useMusicianInvitations({ pollMs: 60000 });

    return (
        <aside
            className={`hidden md:block shrink-0 transition-[width] duration-300 ${collapsed ? 'w-[5.25rem]' : 'w-72'}`}
            aria-label="Navegación del panel"
        >
            <div className={`h-full pt-4 pb-3 ${collapsed ? 'px-1.5' : 'px-2'}`}>
                <div
                    className={`sticky top-20 rounded-2xl border flex flex-col ${collapsed ? 'p-2' : 'p-3'}`}
                    style={{
                        borderColor: 'var(--border)',
                        background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
                        boxShadow: 'var(--shadow-md)',
                        maxHeight: 'calc(100vh - 8rem)',
                    }}
                >
                    <div className={`mb-3 flex ${collapsed ? 'justify-center' : 'justify-end'}`}>
                        <button
                            type="button"
                            onClick={onToggle}
                            className="w-8 h-8 rounded-[10px] flex items-center justify-center border transition-colors hover:bg-[var(--bg-subtle)]"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                            aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
                        >
                            {collapsed ? <IconChevronRight size={15} /> : <IconChevronLeft size={15} />}
                        </button>
                    </div>
                    <nav className="space-y-2 flex-1" aria-label="Secciones">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isSerenatasNavActive(pathname, item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`group relative flex min-h-11 shrink-0 items-center rounded-xl text-sm transition-colors hover:bg-[var(--bg-subtle)] ${
                                        collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'
                                    }`}
                                    style={{
                                        background: active ? 'var(--bg-subtle)' : 'transparent',
                                        color: active ? 'var(--fg)' : 'var(--fg-secondary)',
                                    }}
                                >
                                    <span
                                        className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border"
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
                                    {(() => {
                                        const isInvitaciones = item.href === '/invitaciones';
                                        const dynamicBadge =
                                            isInvitaciones && totalPending > 0 ? String(totalPending) : null;
                                        if (collapsed) {
                                            if (!dynamicBadge) return null;
                                            return (
                                                <span
                                                    className="absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-[0.05rem] rounded-full"
                                                    style={{
                                                        background: 'var(--accent)',
                                                        color: 'var(--accent-contrast)',
                                                    }}
                                                >
                                                    {dynamicBadge}
                                                </span>
                                            );
                                        }
                                        return (
                                            <span className="min-w-0 flex-1 flex items-center justify-between gap-2">
                                                <span className="truncate text-sm font-medium">{item.label}</span>
                                                {dynamicBadge ? (
                                                    <span
                                                        className="text-[10px] font-bold px-1.5 py-[0.15rem] rounded-full"
                                                        style={{
                                                            background: 'var(--accent)',
                                                            color: 'var(--accent-contrast)',
                                                        }}
                                                    >
                                                        {dynamicBadge}
                                                    </span>
                                                ) : item.badge ? (
                                                    <span
                                                        className="text-[10px] font-medium px-1.5 py-[0.2rem] rounded-[5px] border uppercase tracking-[0.04em]"
                                                        style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                                    >
                                                        {item.badge}
                                                    </span>
                                                ) : null}
                                            </span>
                                        );
                                    })()}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Divisor visual y Mi Cuenta siempre abajo */}
                    {footerItems.length > 0 && (
                        <>
                            <div
                                className="my-3 border-t"
                                style={{ borderColor: 'var(--border)' }}
                            />
                            <nav className="space-y-2" aria-label="Mi Cuenta">
                                {footerItems.map((item) => {
                                    const Icon = item.icon;
                                    const active = isSerenatasNavActive(pathname, item.href);
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`group relative flex min-h-11 shrink-0 items-center rounded-xl text-sm transition-colors hover:bg-[var(--bg-subtle)] ${
                                                collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'
                                            }`}
                                            style={{
                                                background: active ? 'var(--bg-subtle)' : 'transparent',
                                                color: active ? 'var(--fg)' : 'var(--fg-secondary)',
                                            }}
                                        >
                                            <span
                                                className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border"
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
                                            {!collapsed && (
                                                <span className="min-w-0 flex-1 flex items-center justify-between gap-2">
                                                    <span className="truncate text-sm font-medium">{item.label}</span>
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </>
                    )}
                </div>
            </div>
        </aside>
    );
}
