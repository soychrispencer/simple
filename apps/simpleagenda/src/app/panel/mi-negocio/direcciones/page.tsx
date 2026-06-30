'use client';

import { AgendaMiNegocioShell } from '@/components/panel/agenda-mi-negocio-shell';
import { AgendaBusinessLocationsContent } from '@/components/panel/agenda-consultorios-content';
import { AGENDA_BUSINESS_DIRECCIONES_PAGE } from '@simple/ui/panel';

export default function DireccionesNegocioPage() {
    return (
        <AgendaMiNegocioShell
            activeKey="direcciones"
            title={AGENDA_BUSINESS_DIRECCIONES_PAGE.title}
            description={AGENDA_BUSINESS_DIRECCIONES_PAGE.description}
        >
            <AgendaBusinessLocationsContent />
        </AgendaMiNegocioShell>
    );
}
