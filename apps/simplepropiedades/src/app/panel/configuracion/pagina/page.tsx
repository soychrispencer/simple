'use client';

import PublicProfileEditor from '@/components/panel/public-profile-editor';
import { PanelPageHeader } from '@simple/ui';

export default function PaginaPublicaPage() {
    return (
        <div className="container-app panel-page py-8 max-w-2xl">
            <PanelPageHeader
                title="Pagina publica"
                description="Personaliza tu perfil visible para clientes."
            />
            <PublicProfileEditor />
        </div>
    );
}
