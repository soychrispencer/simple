'use client';

import type { ComponentProps } from 'react';
import {
    AGENDA_BUSINESS_TABS,
    PanelMiNegocioLoading,
    PanelMiNegocioShell,
} from '@simple/ui/panel';
import { AgendaBusinessPublishToggle } from '@/components/panel/agenda-business-publish-toggle';

type AgendaMiNegocioShellProps = Omit<ComponentProps<typeof PanelMiNegocioShell>, 'publishToggle' | 'tabs'> & {
    tabs?: ComponentProps<typeof PanelMiNegocioShell>['tabs'];
};

export function AgendaMiNegocioShell({ tabs = AGENDA_BUSINESS_TABS, ...props }: AgendaMiNegocioShellProps) {
    return (
        <PanelMiNegocioShell
            {...props}
            tabs={tabs}
            publishToggle={<AgendaBusinessPublishToggle />}
        />
    );
}

type AgendaMiNegocioLoadingProps = Omit<ComponentProps<typeof PanelMiNegocioLoading>, 'publishToggle' | 'tabs'> & {
    tabs?: ComponentProps<typeof PanelMiNegocioLoading>['tabs'];
};

export function AgendaMiNegocioLoading({ tabs = AGENDA_BUSINESS_TABS, ...props }: AgendaMiNegocioLoadingProps) {
    return (
        <PanelMiNegocioLoading
            {...props}
            tabs={tabs}
            publishToggle={<AgendaBusinessPublishToggle />}
        />
    );
}
