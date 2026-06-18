'use client';

import type { ComponentProps, ReactNode } from 'react';
import { IconLoader2 } from '@tabler/icons-react';
import { PanelBusinessShell } from './business-shell.js';

export type PanelMiNegocioShellProps = Omit<ComponentProps<typeof PanelBusinessShell>, 'actions'> & {
    /** Toggle de visibilidad del perfil público (cada vertical inyecta el suyo). */
    publishToggle?: ReactNode;
    /** Acciones extra del encabezado (p. ej. “Nuevo servicio”). */
    headerActions?: ReactNode;
};

function MiNegocioHeaderActions({ headerActions, publishToggle }: Pick<PanelMiNegocioShellProps, 'headerActions' | 'publishToggle'>) {
    if (!headerActions && !publishToggle) return null;

    return (
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {headerActions}
            {publishToggle}
        </div>
    );
}

/** Shell unificado de Mi negocio: layout, tabs, título y slot de publicación. */
export function PanelMiNegocioShell({ headerActions, publishToggle, ...props }: PanelMiNegocioShellProps) {
    return (
        <PanelBusinessShell
            {...props}
            actions={<MiNegocioHeaderActions headerActions={headerActions} publishToggle={publishToggle} />}
        />
    );
}

export type PanelMiNegocioLoadingProps = {
    activeKey: string;
    tabs: ComponentProps<typeof PanelBusinessShell>['tabs'];
    title: string;
    description?: ReactNode;
    message?: string;
    publishToggle?: ReactNode;
    headerActions?: ReactNode;
    subsectionBack?: ComponentProps<typeof PanelBusinessShell>['subsectionBack'];
    onTabChange?: ComponentProps<typeof PanelBusinessShell>['onTabChange'];
    embedded?: boolean;
};

/** Estado de carga con el mismo chrome que la página final (título, tabs, toggle). */
export function PanelMiNegocioLoading({
    activeKey,
    tabs,
    title,
    description,
    message = 'Cargando...',
    publishToggle,
    headerActions,
    subsectionBack,
    onTabChange,
    embedded,
}: PanelMiNegocioLoadingProps) {
    return (
        <PanelMiNegocioShell
            activeKey={activeKey}
            tabs={tabs}
            title={title}
            description={description}
            publishToggle={publishToggle}
            headerActions={headerActions}
            subsectionBack={subsectionBack}
            onTabChange={onTabChange}
            embedded={embedded}
        >
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                <IconLoader2 size={16} className="animate-spin" aria-hidden />
                {message}
            </div>
        </PanelMiNegocioShell>
    );
}
