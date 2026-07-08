'use client';

import type { PublicProfileVertical } from '@simple/utils';
import { BusinessOperatorProductsEditor } from './business-operator-products-editor.js';
import { MARKETPLACE_BUSINESS_PRODUCTOS_PAGE } from './business-copy.js';
import { MARKETPLACE_AUTOS_BUSINESS_TABS } from './business-tabs.js';
import { MarketplaceBusinessPublishToggle } from './marketplace-business-publish-toggle.js';
import { PanelMiNegocioShell } from './panel-mi-negocio-shell.js';

/** Factory de página Mi negocio → Productos para marketplace (Autos). */
export function createMarketplaceMiNegocioProductosPage(vertical: PublicProfileVertical) {
    return function MarketplaceMiNegocioProductosPage() {
        return (
            <PanelMiNegocioShell
                activeKey="productos"
                tabs={MARKETPLACE_AUTOS_BUSINESS_TABS}
                title={MARKETPLACE_BUSINESS_PRODUCTOS_PAGE.title}
                description={MARKETPLACE_BUSINESS_PRODUCTOS_PAGE.description}
                publishToggle={<MarketplaceBusinessPublishToggle vertical={vertical} />}
            >
                <BusinessOperatorProductsEditor vertical={vertical} />
            </PanelMiNegocioShell>
        );
    };
}
