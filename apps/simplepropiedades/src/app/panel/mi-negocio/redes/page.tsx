'use client';

import { MiNegocioSectionPage } from '@/components/panel/mi-negocio-section-page';
import { MARKETPLACE_BUSINESS_REDES_PAGE } from '@simple/ui/panel';

export default function RedesNegocioPage() {
    return (
        <MiNegocioSectionPage
            activeKey="redes"
            section="redes"
            title={MARKETPLACE_BUSINESS_REDES_PAGE.title}
            description={MARKETPLACE_BUSINESS_REDES_PAGE.description}
        />
    );
}
