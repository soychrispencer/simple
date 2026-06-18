'use client';

import PublicProfileEditor from '@/components/panel/public-profile-editor';
import { businessSectionTabs } from '@/components/panel/panel-section-tabs';
import { PanelBusinessShell, MARKETPLACE_PUBLIC_PROFILE_PAGE } from '@simple/ui/panel';

export default function PaginaPublicaPage() {
    return (
        <PanelBusinessShell
            activeKey="pagina"
            tabs={businessSectionTabs}
            title={MARKETPLACE_PUBLIC_PROFILE_PAGE.title}
            description={MARKETPLACE_PUBLIC_PROFILE_PAGE.description}
        >
            <PublicProfileEditor />
        </PanelBusinessShell>
    );
}
