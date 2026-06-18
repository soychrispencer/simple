'use client';

import { MiNegocioSectionPage } from '@/components/panel/mi-negocio-section-page';
import { MARKETPLACE_BUSINESS_HORARIOS_PAGE } from '@simple/ui/panel';

export default function HorariosNegocioPage() {
    return (
        <MiNegocioSectionPage
            activeKey="horarios"
            section="horarios"
            title={MARKETPLACE_BUSINESS_HORARIOS_PAGE.title}
            description={MARKETPLACE_BUSINESS_HORARIOS_PAGE.description}
        />
    );
}
