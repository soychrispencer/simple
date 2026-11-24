export { PanelSectionTabs } from '@simple/ui/panel';
import { AGENDA_BUSINESS_TABS, DEFAULT_ACCOUNT_SECTION_TABS, type PanelSectionTabItem } from '@simple/ui/panel';

export type AgendaPanelTab = PanelSectionTabItem;

export const businessSectionTabs: PanelSectionTabItem[] = [
    ...AGENDA_BUSINESS_TABS.map((item) => item.key === 'pagina' ? { ...item, label: 'Página web' } : item),
    { key: 'equipo', label: 'Equipo', href: '/panel/mi-negocio/equipo' },
    { key: 'plan', label: 'Plan y facturación', href: '/panel/mi-negocio/plan' },
];

export function getAgendaBusinessTabs(showTeamTab: boolean): PanelSectionTabItem[] {
    return showTeamTab
        ? businessSectionTabs
        : businessSectionTabs.filter((item) => item.key !== 'equipo');
}
export const accountSectionTabs: PanelSectionTabItem[] = DEFAULT_ACCOUNT_SECTION_TABS
    .filter((item) => item.key !== 'integraciones' && item.key !== 'suscripcion')
    .map((item) => {
        if (item.key === 'ubicacion') return { ...item, label: 'Ubicación personal' };
        if (item.key === 'apariencia') return { ...item, label: 'Tema del panel' };
        return item;
    });
