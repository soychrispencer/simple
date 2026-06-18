'use client';

import { AgendaBusinessSettingsEditor } from '@/components/panel/agenda-business-settings-editor';
import { AgendaOperatingLocationEditor } from '@/components/panel/agenda-operating-location-editor';
import { AgendaPublishPanel } from '@/components/panel/agenda-publish-panel';
import { businessSectionTabs } from '@/components/panel/panel-section-tabs';
import { AGENDA_BUSINESS_CONFIGURACIONES_PAGE, PanelBusinessShell, PUBLIC_PROFILE_SUBSCRIPTION_TOOL_NOTICE, PanelNotice } from '@simple/ui/panel';

export default function ConfiguracionesPage() {
    return (
        <PanelBusinessShell
            activeKey="configuraciones"
            tabs={businessSectionTabs}
            title={AGENDA_BUSINESS_CONFIGURACIONES_PAGE.title}
            description={AGENDA_BUSINESS_CONFIGURACIONES_PAGE.description}
        >
            <PanelNotice tone="info">{PUBLIC_PROFILE_SUBSCRIPTION_TOOL_NOTICE}</PanelNotice>
            <AgendaOperatingLocationEditor />

            <div className="grid w-full gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
                <AgendaBusinessSettingsEditor />
                <AgendaPublishPanel />
            </div>
        </PanelBusinessShell>
    );
}
