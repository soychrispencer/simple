import type { PanelBusinessSubsectionBack } from './business-shell.js';
import {
    AGENDA_BUSINESS_CONFIGURACIONES_PAGE,
    AGENDA_BUSINESS_SERVICIOS_PAGE,
} from './business-copy.js';

export type AgendaBusinessSubsectionKey = 'packs' | 'promociones' | 'dominio' | 'apariencia';

export type AgendaBusinessSubsectionShellProps = {
    activeKey: string;
    subsectionBack?: PanelBusinessSubsectionBack;
};

const AGENDA_BUSINESS_SUBSECTIONS: Record<AgendaBusinessSubsectionKey, AgendaBusinessSubsectionShellProps> = {
    packs: {
        activeKey: 'servicios',
        subsectionBack: {
            href: '/panel/mis-servicios',
            label: AGENDA_BUSINESS_SERVICIOS_PAGE.title,
        },
    },
    promociones: {
        activeKey: 'servicios',
        subsectionBack: {
            href: '/panel/mis-servicios',
            label: AGENDA_BUSINESS_SERVICIOS_PAGE.title,
        },
    },
    dominio: {
        activeKey: 'configuraciones',
        subsectionBack: {
            href: '/panel/mi-negocio/configuraciones',
            label: AGENDA_BUSINESS_CONFIGURACIONES_PAGE.title,
        },
    },
    apariencia: {
        activeKey: 'apariencia',
    },
};

export function agendaBusinessSubsectionShellProps(
    subsection: AgendaBusinessSubsectionKey,
): AgendaBusinessSubsectionShellProps {
    return AGENDA_BUSINESS_SUBSECTIONS[subsection];
}
