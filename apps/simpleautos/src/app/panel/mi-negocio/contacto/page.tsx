'use client';

import { MiNegocioSectionPage } from '@/components/panel/mi-negocio-section-page';
import { MARKETPLACE_BUSINESS_CONTACTO_PAGE } from '@simple/ui/panel';

export default function ContactoNegocioPage() {
    return (
        <MiNegocioSectionPage
            activeKey="contacto"
            section="contacto"
            title={MARKETPLACE_BUSINESS_CONTACTO_PAGE.title}
            description={MARKETPLACE_BUSINESS_CONTACTO_PAGE.description}
        />
    );
}
