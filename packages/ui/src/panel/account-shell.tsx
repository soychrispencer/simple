'use client';

import type { ReactNode } from 'react';
import { joinClasses } from '../shared/join-classes.js';
import { PanelPageHeader } from './panel-display.js';
import { PanelSectionTabs, type PanelSectionTabItem } from './panel-section-tabs.js';

const PANEL_ACCOUNT_SHELL_CLASS = 'container-app panel-page min-w-0 py-4 lg:py-8';
const PANEL_ACCOUNT_SHELL_EMBEDDED_CLASS = 'w-full min-w-0';

export { MARKETPLACE_PUBLIC_PROFILE_BUSINESS_TABS } from './business-tabs.js';

export const DEFAULT_ACCOUNT_SECTION_TABS: PanelSectionTabItem[] = [
    { key: 'datos', label: 'Datos personales', href: '/panel/mi-cuenta' },
    { key: 'ubicacion', label: 'Ubicación', href: '/panel/mi-cuenta/ubicacion' },
    { key: 'notificaciones', label: 'Notificaciones', href: '/panel/mi-cuenta/notificaciones' },
    { key: 'apariencia', label: 'Apariencia', href: '/panel/mi-cuenta/apariencia' },
    { key: 'integraciones', label: 'Integraciones', href: '/panel/mi-cuenta/integraciones' },
    { key: 'suscripcion', label: 'Suscripción', href: '/panel/mi-cuenta/suscripcion' },
    { key: 'seguridad', label: 'Seguridad', href: '/panel/mi-cuenta/seguridad' },
];

export const MARKETPLACE_ACCOUNT_SAVED_TAB: PanelSectionTabItem = {
    key: 'guardados',
    label: 'Guardados',
    href: '/panel/mi-cuenta/guardados',
};

/** Inserta pestañas extra antes de una pestaña existente. */
export function buildAccountSectionTabs(
    insertBefore: PanelSectionTabItem['key'],
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

/** Pestañas de Mi cuenta en marketplaces (autos, propiedades). */
export const MARKETPLACE_ACCOUNT_SECTION_TABS = buildAccountSectionTabs('integraciones', [
    MARKETPLACE_ACCOUNT_SAVED_TAB,
]);

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
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    /** Sin padding propio: el contenedor padre ya aplica `container-app panel-page`. */
    embedded?: boolean;
    /** Navegación custom de tabs (p. ej. SPA Serenatas sin router.push). */
    onTabChange?: (key: string) => void;
};

export function PanelAccountShell({
    activeKey,
    tabs = DEFAULT_ACCOUNT_SECTION_TABS,
    title = ACCOUNT_PAGE_DEFAULTS.title,
    description = ACCOUNT_PAGE_DEFAULTS.description,
    ariaLabel = ACCOUNT_PAGE_DEFAULTS.ariaLabel,
    actions,
    children,
    className,
    embedded = false,
    onTabChange,
}: PanelAccountShellProps) {
    return (
        <div
            className={joinClasses(
                embedded ? PANEL_ACCOUNT_SHELL_EMBEDDED_CLASS : PANEL_ACCOUNT_SHELL_CLASS,
                className,
            )}
        >
            <PanelPageHeader title={title} description={description} actions={actions} />
            <div className="flex flex-col gap-6">
                <PanelSectionTabs
                    items={tabs}
                    activeKey={activeKey}
                    ariaLabel={ariaLabel}
                    onChange={onTabChange}
                />
                {children}
            </div>
        </div>
    );
}
