export { PanelSectionTabs } from '@simple/ui/panel';
import { AGENDA_BUSINESS_TABS, buildAccountSectionTabs, type PanelSectionTabItem } from '@simple/ui/panel';

export type AgendaPanelTab = PanelSectionTabItem;

export const businessSectionTabs = AGENDA_BUSINESS_TABS;
export const accountSectionTabs = buildAccountSectionTabs('seguridad', [
    { key: 'referidos', label: 'Referidos', href: '/panel/mi-cuenta/referidos' },
]);
