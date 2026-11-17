'use client';

import type { ComponentProps, ReactNode } from 'react';
import {
    AGENDA_BUSINESS_TABS,
    PanelMiNegocioLoading,
    PanelMiNegocioShell,
} from '@simple/ui/panel';
import { AgendaBusinessPublishToggle } from '@/components/panel/agenda-business-publish-toggle';

type ShellProps = Omit<ComponentProps<typeof PanelMiNegocioShell>, 'publishToggle' | 'tabs' | 'activeKey'> & {
    activeKey?: string;
    headerActions?: ReactNode;
};

/** Mantiene el catálogo dentro del espacio de trabajo Mi negocio. */
export function AgendaMisServiciosShell({ activeKey = 'servicios', ...props }: ShellProps) {
    return (
        <PanelMiNegocioShell
            {...props}
            activeKey={activeKey}
            tabs={AGENDA_BUSINESS_TABS}
            publishToggle={<AgendaBusinessPublishToggle />}
        />
    );
}

type LoadingProps = Omit<ComponentProps<typeof PanelMiNegocioLoading>, 'publishToggle' | 'tabs' | 'activeKey'> & {
    activeKey?: string;
};

export function AgendaMisServiciosLoading({ activeKey = 'servicios', ...props }: LoadingProps) {
    return (
        <PanelMiNegocioLoading
            {...props}
            activeKey={activeKey}
            tabs={AGENDA_BUSINESS_TABS}
            publishToggle={<AgendaBusinessPublishToggle />}
        />
    );
}
