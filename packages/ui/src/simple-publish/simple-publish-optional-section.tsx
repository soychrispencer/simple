'use client';

import type { ReactNode } from 'react';
import { PanelCard } from '../panel/panel-card';
import { joinClasses } from '../shared/join-classes';

export type SimplePublishOptionalSectionProps = {
    title: string;
    description?: string;
    open: boolean;
    onToggle: () => void;
    children: ReactNode;
    className?: string;
};

export function SimplePublishOptionalSection({
    title,
    description,
    open,
    onToggle,
    children,
    className,
}: SimplePublishOptionalSectionProps) {
    return (
        <PanelCard size="md" className={joinClasses('overflow-hidden !p-0', className)}>
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left md:px-5"
            >
                <span>
                    <span className="block text-sm font-medium text-(--fg)">{title}</span>
                    {description ? (
                        <span className="mt-0.5 block text-xs text-(--fg-muted)">{description}</span>
                    ) : null}
                </span>
                <span className="shrink-0 text-xs text-(--fg-muted)">{open ? '−' : '+'}</span>
            </button>
            {open ? (
                <div className="border-t border-(--border) px-4 pb-4 pt-3 md:px-5">{children}</div>
            ) : null}
        </PanelCard>
    );
}
