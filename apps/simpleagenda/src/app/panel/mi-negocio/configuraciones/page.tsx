'use client';

import { AgendaConfiguracionesContent } from '@/components/panel/agenda-configuraciones-content';
import { businessSectionTabs } from '@/components/panel/panel-section-tabs';
import {
    AGENDA_BUSINESS_CONFIGURACIONES_PAGE,
    BusinessMiNegocioConfiguracionesLayout,
} from '@simple/ui/panel';
import { AgendaMiNegocioShell } from '@/components/panel/agenda-mi-negocio-shell';

export default function ConfiguracionesPage() {
    return (
        <AgendaMiNegocioShell
            activeKey="configuraciones"
            tabs={businessSectionTabs}
            title={AGENDA_BUSINESS_CONFIGURACIONES_PAGE.title}
            description={AGENDA_BUSINESS_CONFIGURACIONES_PAGE.description}
        >
            <BusinessMiNegocioConfiguracionesLayout>
                <AgendaConfiguracionesContent />
            </BusinessMiNegocioConfiguracionesLayout>
        </AgendaMiNegocioShell>
    );
}
