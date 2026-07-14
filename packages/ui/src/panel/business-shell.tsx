'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { IconChevronLeft } from '@tabler/icons-react';
import { joinClasses } from '../shared/join-classes.js';
import { PanelPageHeader } from './panel-display.js';
import { PanelSectionTabs, type PanelSectionTabItem } from './panel-section-tabs.js';
import { BUSINESS_PAGE_DEFAULTS } from './business-copy.js';

const PANEL_BUSINESS_SHELL_CLASS = 'container-app panel-page py-4 lg:py-8 min-w-0';
const PANEL_BUSINESS_SHELL_EMBEDDED_CLASS = 'w-full min-w-0';

export type PanelBusinessSubsectionBack = {
    href: string;
    label: string;
};

export type PanelBusinessShellProps = {
    activeKey: string;
    tabs: PanelSectionTabItem[];
    title?: string;
    description?: ReactNode;
    ariaLabel?: string;
    actions?: ReactNode;
    subsectionBack?: PanelBusinessSubsectionBack;
    children: ReactNode;
    /** Sin padding propio: el contenedor padre ya aplica `container-app panel-page`. */
    embedded?: boolean;
    className?: string;
    /** Navegación custom de tabs (p. ej. SPA Serenatas sin router.push). */
    onTabChange?: (key: string) => void;
};

export function PanelBusinessSubsectionLink({ href, label }: PanelBusinessSubsectionBack) {
    return (
        <Link
            href={href}
            className="inline-flex items-center gap-1 text-xs font-medium mb-3 transition-colors hover:opacity-80"
            style={{ color: 'var(--fg-muted)' }}
        >
            <IconChevronLeft size={14} aria-hidden />
            {label}
        </Link>
    );
}

export function PanelBusinessShell({
    activeKey,
    tabs,
    title,
    description,
    ariaLabel = BUSINESS_PAGE_DEFAULTS.ariaLabel,
    actions,
    subsectionBack,
    children,
    embedded = false,
    className,
    onTabChange,
}: PanelBusinessShellProps) {
    return (
        <div
            className={joinClasses(
                embedded ? PANEL_BUSINESS_SHELL_EMBEDDED_CLASS : PANEL_BUSINESS_SHELL_CLASS,
                className,
            )}
        >
            {subsectionBack ? (
                <PanelBusinessSubsectionLink href={subsectionBack.href} label={subsectionBack.label} />
            ) : null}
            {title ? <PanelPageHeader title={title} description={description} actions={actions} /> : null}
            <div className="flex flex-col gap-6">
                {tabs.length > 0 ? (
                    <PanelSectionTabs items={tabs} activeKey={activeKey} ariaLabel={ariaLabel} onChange={onTabChange} />
                ) : null}
                {children}
            </div>
        </div>
    );
}
