'use client';

import PublicProfileEditor from '@/components/panel/public-profile-editor';
import { PanelSectionTabs, businessSectionTabs } from '@/components/panel/panel-section-tabs';
import { PanelPageHeader } from '@simple/ui/panel';

export default function PaginaPublicaPage() {
    return (
        <div className="container-app panel-page py-4 lg:py-8">
            <PanelPageHeader
                title="Página pública"
                description="Personaliza tu perfil visible."
            />
            <PanelSectionTabs items={businessSectionTabs} activeKey="pagina" />
            <PublicProfileEditor />
        </div>
    );
}
