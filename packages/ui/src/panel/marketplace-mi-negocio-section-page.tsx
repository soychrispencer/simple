'use client';

import type { ReactNode } from 'react';
import type { PublicProfileVertical } from '@simple/utils';
import { MARKETPLACE_PUBLIC_PROFILE_BUSINESS_TABS } from './business-tabs.js';
import { MarketplaceBusinessPublishToggle } from './marketplace-business-publish-toggle.js';
import { PublicProfileEditor, type PublicProfileEditorSection } from './public-profile-editor.js';
import { PanelMiNegocioShell } from './panel-mi-negocio-shell.js';

export type MarketplaceMiNegocioSectionPageProps = {
    vertical: PublicProfileVertical;
    activeKey: string;
    section: PublicProfileEditorSection;
    title: string;
    description: ReactNode;
};

/** Página de sección Mi negocio para marketplace (Autos / Propiedades). */
export function MarketplaceMiNegocioSectionPage({
    vertical,
    activeKey,
    section,
    title,
    description,
}: MarketplaceMiNegocioSectionPageProps) {
    return (
        <PanelMiNegocioShell
            activeKey={activeKey}
            tabs={MARKETPLACE_PUBLIC_PROFILE_BUSINESS_TABS}
            title={title}
            description={description}
            publishToggle={<MarketplaceBusinessPublishToggle vertical={vertical} />}
        >
            <PublicProfileEditor vertical={vertical} section={section} />
        </PanelMiNegocioShell>
    );
}
