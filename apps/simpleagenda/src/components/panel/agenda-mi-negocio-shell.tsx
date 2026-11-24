'use client';

import type { ComponentProps } from 'react';
import {
    PanelMiNegocioLoading,
    PanelMiNegocioShell,
} from '@simple/ui/panel';
import { AgendaBusinessPublishToggle } from '@/components/panel/agenda-business-publish-toggle';
import { getAgendaBusinessTabs } from '@/components/panel/panel-section-tabs';
import { useAgendaIsTeamWorkspace } from '@/components/panel/agenda-vocab-context';

type AgendaMiNegocioShellProps = Omit<ComponentProps<typeof PanelMiNegocioShell>, 'publishToggle' | 'tabs'> & {
    tabs?: ComponentProps<typeof PanelMiNegocioShell>['tabs'];
    showPublishToggle?: boolean;
};

export function AgendaMiNegocioShell({ tabs, showPublishToggle = true, ...props }: AgendaMiNegocioShellProps) {
    const isTeamWorkspace = useAgendaIsTeamWorkspace();
    const resolvedTabs = tabs ?? getAgendaBusinessTabs(isTeamWorkspace || props.activeKey === 'equipo');
    return (
        <PanelMiNegocioShell
            {...props}
            tabs={resolvedTabs}
            publishToggle={showPublishToggle ? <AgendaBusinessPublishToggle /> : undefined}
        />
    );
}

type AgendaMiNegocioLoadingProps = Omit<ComponentProps<typeof PanelMiNegocioLoading>, 'publishToggle' | 'tabs'> & {
    tabs?: ComponentProps<typeof PanelMiNegocioLoading>['tabs'];
};

export function AgendaMiNegocioLoading({ tabs, ...props }: AgendaMiNegocioLoadingProps) {
    const isTeamWorkspace = useAgendaIsTeamWorkspace();
    const resolvedTabs = tabs ?? getAgendaBusinessTabs(isTeamWorkspace || props.activeKey === 'equipo');
    return (
        <PanelMiNegocioLoading
            {...props}
            tabs={resolvedTabs}
            publishToggle={<AgendaBusinessPublishToggle />}
        />
    );
}
