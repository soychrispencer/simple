'use client';

import type { PublicProfileVertical } from '@simple/utils';
import { MARKETPLACE_BUSINESS_DIRECCIONES_PAGE } from './business-copy.js';
import { MARKETPLACE_PUBLIC_PROFILE_BUSINESS_TABS } from './business-tabs.js';
import { MarketplaceBusinessPublishToggle } from './marketplace-business-publish-toggle.js';
import { PanelBusinessAddressesContent } from './business-addresses-content.js';
import { PanelMiNegocioShell } from './panel-mi-negocio-shell.js';

/** Factory de página Mi negocio → Direcciones para marketplace (Autos / Propiedades). */
export function createMarketplaceMiNegocioDireccionesPage(vertical: PublicProfileVertical) {
    return function MarketplaceMiNegocioDireccionesPage() {
        return (
            <PanelMiNegocioShell
                activeKey="direcciones"
                tabs={MARKETPLACE_PUBLIC_PROFILE_BUSINESS_TABS}
                title={MARKETPLACE_BUSINESS_DIRECCIONES_PAGE.title}
                description={MARKETPLACE_BUSINESS_DIRECCIONES_PAGE.description}
                publishToggle={<MarketplaceBusinessPublishToggle vertical={vertical} />}
            >
                <PanelBusinessAddressesContent vertical={vertical} />
            </PanelMiNegocioShell>
        );
    };
}
