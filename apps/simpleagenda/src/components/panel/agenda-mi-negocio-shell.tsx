'use client';

import type { ComponentProps } from 'react';
import {
    PanelMiNegocioLoading,
    PanelMiNegocioShell,
} from '@simple/ui/panel';
import { AgendaBusinessPublishToggle } from '@/components/panel/agenda-business-publish-toggle';
import { businessSectionTabs } from '@/components/panel/panel-section-tabs';

type AgendaMiNegocioShellProps = Omit<ComponentProps<typeof PanelMiNegocioShell>, 'publishToggle' | 'tabs'> & {
    tabs?: ComponentProps<typeof PanelMiNegocioShell>['tabs'];
    showPublishToggle?: boolean;
};

export function AgendaMiNegocioShell({ tabs = businessSectionTabs, showPublishToggle = true, ...props }: AgendaMiNegocioShellProps) {
    return (
        <PanelMiNegocioShell
            {...props}
            tabs={tabs}
            publishToggle={showPublishToggle ? <AgendaBusinessPublishToggle /> : undefined}
        />
    );
}

type AgendaMiNegocioLoadingProps = Omit<ComponentProps<typeof PanelMiNegocioLoading>, 'publishToggle' | 'tabs'> & {
    tabs?: ComponentProps<typeof PanelMiNegocioLoading>['tabs'];
};

export function AgendaMiNegocioLoading({ tabs = businessSectionTabs, ...props }: AgendaMiNegocioLoadingProps) {
    return (
        <PanelMiNegocioLoading
            {...props}
            tabs={tabs}
            publishToggle={<AgendaBusinessPublishToggle />}
        />
    );
}
