'use client';

import type { PublicProfileVertical } from '@simple/utils';
import { getMarketplaceBusinessTabs } from './business-tabs.js';
import { MARKETPLACE_BUSINESS_CONFIGURACIONES_PAGE } from './business-copy.js';
import { BusinessMiNegocioConfiguracionesLayout } from './business-mi-negocio-configuraciones-layout.js';
import { MarketplaceMiNegocioConfiguracionesContent } from './marketplace-mi-negocio-configuraciones-content.js';
import { MarketplaceBusinessPublishToggle } from './marketplace-business-publish-toggle.js';
import { PanelMiNegocioShell } from './panel-mi-negocio-shell.js';

export type MarketplaceMiNegocioConfiguracionesPageProps = {
    vertical: PublicProfileVertical;
};

export function MarketplaceMiNegocioConfiguracionesPage({
    vertical,
}: MarketplaceMiNegocioConfiguracionesPageProps) {
    return (
        <PanelMiNegocioShell
            activeKey="configuraciones"
            tabs={getMarketplaceBusinessTabs(vertical)}
            title={MARKETPLACE_BUSINESS_CONFIGURACIONES_PAGE.title}
            description={MARKETPLACE_BUSINESS_CONFIGURACIONES_PAGE.description}
            publishToggle={<MarketplaceBusinessPublishToggle vertical={vertical} />}
        >
            <BusinessMiNegocioConfiguracionesLayout>
                <MarketplaceMiNegocioConfiguracionesContent vertical={vertical} />
            </BusinessMiNegocioConfiguracionesLayout>
        </PanelMiNegocioShell>
    );
}
