'use client';

import Link from 'next/link';
import type { ComponentType } from 'react';
import { cleanPanelPath } from './resolve-active-nav.js';

export type PanelGroupedNavItem = {
    href: string;
    label: string;
    icon: ComponentType<{ size?: number; stroke?: number }>;
    badge?: string;
    section?: string;
};

type PanelGroupedNavListProps = {
    items: PanelGroupedNavItem[];
    activeHref: string | null;
    collapsed?: boolean;
    onNavigate?: () => void;
};

function groupItems(items: PanelGroupedNavItem[]) {
    const groups: Array<{ section?: string; items: PanelGroupedNavItem[] }> = [];
    for (const item of items) {
        const last = groups[groups.length - 1];
        if (last && last.section === item.section) {
            last.items.push(item);
            continue;
        }
        groups.push({ section: item.section, items: [item] });
    }
    return groups;
}

export function PanelGroupedNavList({
    items,
    activeHref,
    collapsed = false,
    onNavigate,
}: PanelGroupedNavListProps) {
    const groups = groupItems(items);

    return (
        <div className="space-y-4">
            {groups.map((group) => (
                <div key={group.section ?? 'main'} className="space-y-2">
                    {group.section ? (
                        collapsed ? (
                            <div className="mx-2 border-t" style={{ borderColor: 'var(--border)' }} aria-hidden />
                        ) : (
                            <p
                                className="px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                                style={{ color: 'var(--fg-muted)' }}
                            >
                                {group.section}
                            </p>
                        )
                    ) : null}

                    <nav className="space-y-2">
                        {group.items.map((item) => {
                            const Icon = item.icon;
                            const active = activeHref != null && cleanPanelPath(activeHref) === cleanPanelPath(item.href);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    prefetch
                                    scroll={false}
                                    onClick={onNavigate}
                                    aria-current={active ? 'page' : undefined}
                                    className={`group relative flex h-11 items-center rounded-xl text-sm transition-colors hover:bg-[var(--bg-subtle)] ${
                                        collapsed ? 'justify-center px-1.5' : 'gap-2.5 px-2.5'
                                    }`}
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

                                    {!collapsed ? (
                                        <span className="min-w-0 flex-1 flex items-center justify-between gap-2">
                                            <span className="truncate text-sm font-medium">{item.label}</span>
                                            {item.badge ? (
                                                <span
                                                    className="rounded-[5px] border px-1.5 py-[0.2rem] text-[10px] font-medium uppercase tracking-[0.04em]"
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
                </div>
            ))}
        </div>
    );
}
