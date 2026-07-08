'use client';

import type { ReactNode } from 'react';
import type { PublicProfileVertical } from '@simple/utils';
import { getMarketplaceBusinessTabs } from './business-tabs.js';
import { MARKETPLACE_BUSINESS_HORARIOS_PAGE, MARKETPLACE_PUBLIC_PROFILE_PAGE } from './business-copy.js';
import { MarketplaceBusinessPublishToggle } from './marketplace-business-publish-toggle.js';
import { PublicProfileEditor, type PublicProfileEditorSection } from './public-profile-editor.js';
import { PanelMarketplacePublicLinkPanel } from './panel-marketplace-public-link-panel.js';
import { PanelMiNegocioShell } from './panel-mi-negocio-shell.js';

export type MarketplaceMiNegocioSectionPageProps = {
    vertical: PublicProfileVertical;
    activeKey: string;
    section: PublicProfileEditorSection;
    title: string;
    description: ReactNode;
    appBaseUrl?: string;
};

function resolveAppBaseUrl(appBaseUrl?: string): string {
    if (appBaseUrl?.trim()) return appBaseUrl.replace(/\/$/, '');
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
}

/** Página de sección Mi negocio para marketplace (Autos / Propiedades). */
export function MarketplaceMiNegocioSectionPage({
    vertical,
    activeKey,
    section,
    title,
    description,
    appBaseUrl,
}: MarketplaceMiNegocioSectionPageProps) {
    const resolvedAppBaseUrl = resolveAppBaseUrl(appBaseUrl);
    return (
        <PanelMiNegocioShell
            activeKey={activeKey}
            tabs={getMarketplaceBusinessTabs(vertical)}
            title={title}
            description={description}
            publishToggle={<MarketplaceBusinessPublishToggle vertical={vertical} />}
        >
            <div className="flex w-full min-w-0 flex-col gap-5">
                <PublicProfileEditor
                    vertical={vertical}
                    section={section}
                    publicLinkBelowBrand={
                        section === 'pagina' || section === 'apariencia' ? (
                            <PanelMarketplacePublicLinkPanel
                                vertical={vertical}
                                appBaseUrl={resolvedAppBaseUrl}
                                variant="minimal"
                            />
                        ) : null
                    }
                />
            </div>
        </PanelMiNegocioShell>
    );
}

/** Factory: Mi negocio → Perfil público (Autos / Propiedades). */
export function createMarketplaceMiNegocioPaginaPage(vertical: PublicProfileVertical) {
    return function MarketplaceMiNegocioPaginaPage() {
        return (
            <MarketplaceMiNegocioSectionPage
                vertical={vertical}
                activeKey="pagina"
                section="pagina"
                title={MARKETPLACE_PUBLIC_PROFILE_PAGE.title}
                description={MARKETPLACE_PUBLIC_PROFILE_PAGE.description}
            />
        );
    };
}

/** Factory: Mi negocio → Horarios (Autos / Propiedades). */
export function createMarketplaceMiNegocioHorariosPage(vertical: PublicProfileVertical) {
    return function MarketplaceMiNegocioHorariosPage() {
        return (
            <MarketplaceMiNegocioSectionPage
                vertical={vertical}
                activeKey="horarios"
                section="horarios"
                title={MARKETPLACE_BUSINESS_HORARIOS_PAGE.title}
                description={MARKETPLACE_BUSINESS_HORARIOS_PAGE.description}
            />
        );
    };
}

/** Factory: Mi negocio → Apariencia (Autos / Propiedades). */
export function createMarketplaceMiNegocioAparienciaPage(vertical: PublicProfileVertical) {
    return function MarketplaceMiNegocioAparienciaPage() {
        return (
            <MarketplaceMiNegocioSectionPage
                vertical={vertical}
                activeKey="apariencia"
                section="apariencia"
                title="Apariencia"
                description="Personaliza el diseño y colores de tu página pública."
            />
        );
    };
}
