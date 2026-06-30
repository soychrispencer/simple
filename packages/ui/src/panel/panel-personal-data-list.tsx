'use client';

import type { ReactNode } from 'react';
import { IconLoader2 } from '@tabler/icons-react';
import { joinClasses } from '../shared/join-classes';

export type PanelPersonalDataAction = {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    ariaLabel?: string;
};

export type PanelPersonalDataRowProps = {
    label: string;
    value: string;
    valueHint?: string;
    valueStatus?: 'success' | 'warning' | 'neutral';
    actions?: PanelPersonalDataAction[];
};

export function PanelPersonalDataList({ children }: { children: ReactNode }) {
    return (
        <div className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)]">
            {children}
        </div>
    );
}

function ValueStatusDot({ status }: { status: 'success' | 'warning' | 'neutral' }) {
    const color =
        status === 'success'
            ? 'bg-emerald-500'
            : status === 'warning'
              ? 'bg-amber-500'
              : 'bg-[var(--fg-muted)]';
    return <span className={joinClasses('mt-1.5 h-2 w-2 shrink-0 rounded-full', color)} aria-hidden />;
}

export function PanelPersonalDataRow({
    label,
    value,
    valueHint,
    valueStatus,
    actions = [],
}: PanelPersonalDataRowProps) {
    return (
        <div className="px-4 py-3.5">
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--fg-muted)]">{label}</p>
                    <div className="mt-0.5 flex items-start gap-2">
                        {valueStatus ? <ValueStatusDot status={valueStatus} /> : null}
                        <p className="min-w-0 flex-1 truncate text-sm text-[var(--fg)]">{value}</p>
                    </div>
                    {valueHint ? <p className="mt-1 text-xs leading-snug text-[var(--fg-muted)]">{valueHint}</p> : null}
                </div>
                {actions.length > 0 ? (
                    <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                        {actions.map((action) => (
                            <button
                                key={action.ariaLabel ?? action.label}
                                type="button"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--fg)] underline-offset-2 hover:underline disabled:opacity-50"
                                onClick={action.onClick}
                                disabled={action.disabled || action.loading}
                                aria-label={action.ariaLabel ?? action.label}
                            >
                                {action.loading ? <IconLoader2 size={14} className="animate-spin" aria-hidden /> : null}
                                {action.label}
                            </button>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
