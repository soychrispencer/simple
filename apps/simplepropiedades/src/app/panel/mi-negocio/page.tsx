'use client';

import { MiNegocioSectionPage } from '@/components/panel/mi-negocio-section-page';
import { MARKETPLACE_PUBLIC_PROFILE_PAGE } from '@simple/ui/panel';

export default function PaginaPublicaPage() {
    return (
        <MiNegocioSectionPage
            activeKey="pagina"
            section="pagina"
            title={MARKETPLACE_PUBLIC_PROFILE_PAGE.title}
            description={MARKETPLACE_PUBLIC_PROFILE_PAGE.description}
        />
    );
}
