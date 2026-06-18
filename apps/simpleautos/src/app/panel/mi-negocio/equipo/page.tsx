'use client';

import { MiNegocioSectionPage } from '@/components/panel/mi-negocio-section-page';
import { MARKETPLACE_BUSINESS_EQUIPO_PAGE } from '@simple/ui/panel';

export default function EquipoNegocioPage() {
    return (
        <MiNegocioSectionPage
            activeKey="equipo"
            section="equipo"
            title={MARKETPLACE_BUSINESS_EQUIPO_PAGE.title}
            description={MARKETPLACE_BUSINESS_EQUIPO_PAGE.description}
        />
    );
}
