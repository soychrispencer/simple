'use client';

import type { PublicProfileVertical } from '@simple/utils';
import { MARKETPLACE_PUBLIC_PROFILE_BUSINESS_TABS } from './business-tabs.js';
import { MARKETPLACE_BUSINESS_CONFIGURACIONES_PAGE, PUBLIC_PROFILE_SUBSCRIPTION_TOOL_NOTICE } from './business-copy.js';
import { BusinessMiNegocioConfiguracionesLayout } from './business-mi-negocio-configuraciones-layout.js';
import { MarketplaceMiNegocioConfiguracionesContent } from './marketplace-mi-negocio-configuraciones-content.js';
import { MarketplaceMiNegocioPlanBanner } from './marketplace-mi-negocio-plan-banner.js';
import { MarketplaceBusinessPublishToggle } from './marketplace-business-publish-toggle.js';
import { PanelMiNegocioShell } from './panel-mi-negocio-shell.js';
import { PanelNotice } from './panel-primitives.js';

export type MarketplaceMiNegocioConfiguracionesPageProps = {
    vertical: PublicProfileVertical;
};

export function MarketplaceMiNegocioConfiguracionesPage({
    vertical,
}: MarketplaceMiNegocioConfiguracionesPageProps) {
    return (
        <PanelMiNegocioShell
            activeKey="configuraciones"
            tabs={MARKETPLACE_PUBLIC_PROFILE_BUSINESS_TABS}
            title={MARKETPLACE_BUSINESS_CONFIGURACIONES_PAGE.title}
            description={MARKETPLACE_BUSINESS_CONFIGURACIONES_PAGE.description}
            publishToggle={<MarketplaceBusinessPublishToggle vertical={vertical} />}
        >
            <BusinessMiNegocioConfiguracionesLayout
                notice={(
                    <>
                        <MarketplaceMiNegocioPlanBanner vertical={vertical} />
                        <PanelNotice tone="info">{PUBLIC_PROFILE_SUBSCRIPTION_TOOL_NOTICE}</PanelNotice>
                    </>
                )}
            >
                <MarketplaceMiNegocioConfiguracionesContent vertical={vertical} />
            </BusinessMiNegocioConfiguracionesLayout>
        </PanelMiNegocioShell>
    );
}
