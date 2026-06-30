'use client';

import type { ReactNode } from 'react';
import type { Icon } from '@tabler/icons-react';

export function BusinessOperationalAlertSettingRow({
    icon: IconComponent,
    title,
    description,
    action,
}: {
    icon: Icon;
    title: string;
    description: string;
    action: ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-(--border) bg-(--surface) px-4 py-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <IconComponent size={18} stroke={1.75} />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-fg">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{description}</p>
                </div>
            </div>
            <div className="shrink-0 self-center">{action}</div>
        </div>
    );
}

export function BusinessOperationalAlertsSubsection({
    title,
    description,
    children,
    withDivider = true,
}: {
    title: string;
    description: string;
    children: ReactNode;
    withDivider?: boolean;
}) {
    return (
        <div className={`space-y-3 ${withDivider ? 'border-t border-(--border) pt-8' : ''}`}>
            <div>
                <p className="text-sm font-semibold text-fg">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-fg-muted">{description}</p>
            </div>
            <div className="space-y-3">{children}</div>
        </div>
    );
}
