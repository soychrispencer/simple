'use client';

import type { ComponentProps, ReactNode } from 'react';
import {
    PanelMiNegocioLoading,
    PanelMiNegocioShell,
} from '@simple/ui/panel';
import { AgendaBusinessPublishToggle } from '@/components/panel/agenda-business-publish-toggle';
import { getAgendaBusinessTabs } from '@/components/panel/panel-section-tabs';
import { useAgendaIsTeamWorkspace } from '@/components/panel/agenda-vocab-context';

type ShellProps = Omit<ComponentProps<typeof PanelMiNegocioShell>, 'publishToggle' | 'tabs' | 'activeKey'> & {
    activeKey?: string;
    headerActions?: ReactNode;
};

/** Mantiene el catálogo dentro del espacio de trabajo Mi negocio. */
export function AgendaMisServiciosShell({ activeKey = 'servicios', ...props }: ShellProps) {
    const isTeamWorkspace = useAgendaIsTeamWorkspace();
    return (
        <PanelMiNegocioShell
            {...props}
            activeKey={activeKey}
            tabs={getAgendaBusinessTabs(isTeamWorkspace)}
            publishToggle={<AgendaBusinessPublishToggle />}
        />
    );
}

type LoadingProps = Omit<ComponentProps<typeof PanelMiNegocioLoading>, 'publishToggle' | 'tabs' | 'activeKey'> & {
    activeKey?: string;
};

export function AgendaMisServiciosLoading({ activeKey = 'servicios', ...props }: LoadingProps) {
    const isTeamWorkspace = useAgendaIsTeamWorkspace();
    return (
        <PanelMiNegocioLoading
            {...props}
            activeKey={activeKey}
            tabs={getAgendaBusinessTabs(isTeamWorkspace)}
            publishToggle={<AgendaBusinessPublishToggle />}
        />
    );
}
