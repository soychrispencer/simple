'use client';

import PublicProfileEditor from '@/components/panel/public-profile-editor';
import { PanelPageHeader } from '@simple/ui';

export default function PaginaPublicaPage() {
    return (
        <div className="container-app panel-page py-4 lg:py-8 max-w-2xl">
            <PanelPageHeader
                backHref="/panel/configuracion"
                title="Página pública"
                description="Personaliza tu perfil visible."
            />
            <PublicProfileEditor />
        </div>
    );
}
