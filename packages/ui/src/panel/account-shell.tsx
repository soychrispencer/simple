'use client';

import type { ReactNode } from 'react';
import { PanelPageHeader } from './panel-display.js';
import { PanelSectionTabs, type PanelSectionTabItem } from './panel-section-tabs.js';

export { MARKETPLACE_PUBLIC_PROFILE_BUSINESS_TABS } from './business-tabs.js';

export const DEFAULT_ACCOUNT_SECTION_TABS: PanelSectionTabItem[] = [
    { key: 'datos', label: 'Datos personales', href: '/panel/mi-cuenta' },
    { key: 'ubicacion', label: 'Ubicación', href: '/panel/mi-cuenta/ubicacion' },
    { key: 'notificaciones', label: 'Notificaciones', href: '/panel/mi-cuenta/notificaciones' },
    { key: 'integraciones', label: 'Integraciones', href: '/panel/mi-cuenta/integraciones' },
    { key: 'suscripcion', label: 'Suscripción', href: '/panel/mi-cuenta/suscripcion' },
    { key: 'seguridad', label: 'Seguridad', href: '/panel/mi-cuenta/seguridad' },
];

/** Inserta pestañas extra antes de `suscripcion` o `seguridad`. */
export function buildAccountSectionTabs(
    insertBefore: 'suscripcion' | 'seguridad',
    extraTabs: PanelSectionTabItem[],
): PanelSectionTabItem[] {
    const index = DEFAULT_ACCOUNT_SECTION_TABS.findIndex((tab) => tab.key === insertBefore);
    if (index < 0 || extraTabs.length === 0) {
        return [...DEFAULT_ACCOUNT_SECTION_TABS];
    }
    return [
        ...DEFAULT_ACCOUNT_SECTION_TABS.slice(0, index),
        ...extraTabs,
        ...DEFAULT_ACCOUNT_SECTION_TABS.slice(index),
    ];
}

export const ACCOUNT_PAGE_DEFAULTS = {
    title: 'Mi cuenta',
    description: 'Datos personales, seguridad y preferencias.',
    ariaLabel: 'Secciones de mi cuenta',
} as const;

export type PanelAccountShellProps = {
    activeKey: string;
    tabs?: PanelSectionTabItem[];
    title?: string;
    description?: string;
    ariaLabel?: string;
    children: ReactNode;
    className?: string;
};

export function PanelAccountShell({
    activeKey,
    tabs = DEFAULT_ACCOUNT_SECTION_TABS,
    title = ACCOUNT_PAGE_DEFAULTS.title,
    description = ACCOUNT_PAGE_DEFAULTS.description,
    ariaLabel = ACCOUNT_PAGE_DEFAULTS.ariaLabel,
    children,
    className,
}: PanelAccountShellProps) {
    return (
        <div className={className ?? 'container-app panel-page py-4 lg:py-8'}>
            <PanelPageHeader title={title} description={description} />
            <div className="flex flex-col gap-6">
                <PanelSectionTabs items={tabs} activeKey={activeKey} ariaLabel={ariaLabel} />
                {children}
            </div>
        </div>
    );
}
