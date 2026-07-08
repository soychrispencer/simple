'use client';

import type { PublicProfileVertical } from '@simple/utils';
import { BusinessOperatorServicesEditor } from './business-operator-services-editor.js';
import { MARKETPLACE_BUSINESS_SERVICIOS_PAGE } from './business-copy.js';
import { getMarketplaceBusinessTabs } from './business-tabs.js';
import { MarketplaceBusinessPublishToggle } from './marketplace-business-publish-toggle.js';
import { PanelMiNegocioShell } from './panel-mi-negocio-shell.js';

/** Factory de página Mi negocio → Servicios para marketplace (Autos / Propiedades). */
export function createMarketplaceMiNegocioServiciosPage(vertical: PublicProfileVertical) {
    return function MarketplaceMiNegocioServiciosPage() {
        return (
            <PanelMiNegocioShell
                activeKey="servicios"
                tabs={getMarketplaceBusinessTabs(vertical)}
                title={MARKETPLACE_BUSINESS_SERVICIOS_PAGE.title}
                description={MARKETPLACE_BUSINESS_SERVICIOS_PAGE.description}
                publishToggle={<MarketplaceBusinessPublishToggle vertical={vertical} />}
            >
                <BusinessOperatorServicesEditor vertical={vertical} />
            </PanelMiNegocioShell>
        );
    };
}
