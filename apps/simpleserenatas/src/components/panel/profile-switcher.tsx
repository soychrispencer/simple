'use client';

import clsx from 'clsx';
import type { AppMode } from '@/lib/app-mode';

export type ModeSwitchItem = { key: AppMode; label: string };

export function ProfileSwitcher({
    items,
    active,
    onChange,
    compact = false,
}: {
    items: ModeSwitchItem[];
    active: AppMode;
    onChange: (key: AppMode) => void;
    compact?: boolean;
}) {
    if (items.length <= 1) return null;

    return (
        <div
            role="group"
            aria-label="Cambiar modo"
            className={clsx(
                'panel-surface-subtle inline-flex rounded-button border p-1',
                compact ? 'w-full' : '',
            )}
        >
            {items.map((item) => {
                const isActive = active === item.key;
                return (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => onChange(item.key)}
                        aria-pressed={isActive}
                        className={clsx(
                            'rounded-button px-3 py-1.5 text-xs font-medium transition-colors',
                            compact ? 'flex-1 text-center' : '',
                            isActive
                                ? 'bg-[var(--surface)] text-[var(--fg)] shadow-sm'
                                : 'bg-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]',
                        )}
                    >
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
}
