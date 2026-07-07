'use client';

import {
    ACCOUNT_INTEGRATIONS_PAGE,
    MARKETPLACE_ACCOUNT_SECTION_TABS,
    PanelAccountShell,
    accountIntegrationsDescription,
} from '@simple/ui/panel';
import { MercadoPagoIntegrationCard, MarketplaceGoogleCalendarIntegrationCard } from '@simple/ui/integrations';
import InstagramIntegrationCard from '@/components/panel/instagram-integration-card';
import TikTokIntegrationCard from '@/components/panel/tiktok-integration-card';
import YouTubeIntegrationCard from '@/components/panel/youtube-integration-card';

export default function IntegracionesCuentaPage() {
    return (
        <PanelAccountShell
            activeKey="integraciones"
            tabs={MARKETPLACE_ACCOUNT_SECTION_TABS}
            title={ACCOUNT_INTEGRATIONS_PAGE.title}
            description={accountIntegrationsDescription('Simple Propiedades')}
        >
            <div className="flex flex-col gap-4">
                <MercadoPagoIntegrationCard
                    vertical="propiedades"
                    lockedHint="MercadoPago requiere plan Pro o Empresa en Simple Propiedades."
                />
                <MarketplaceGoogleCalendarIntegrationCard vertical="propiedades" />
                <InstagramIntegrationCard />
                <TikTokIntegrationCard />
                <YouTubeIntegrationCard />
            </div>
        </PanelAccountShell>
    );
}
