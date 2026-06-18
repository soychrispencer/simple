'use client';

import {
    ACCOUNT_INTEGRATIONS_PAGE,
    DEFAULT_ACCOUNT_SECTION_TABS,
    PanelAccountShell,
    accountIntegrationsDescription,
} from '@simple/ui/panel';
import InstagramIntegrationCard from '@/components/panel/instagram-integration-card';
import TikTokIntegrationCard from '@/components/panel/tiktok-integration-card';
import YouTubeIntegrationCard from '@/components/panel/youtube-integration-card';

export default function IntegracionesCuentaPage() {
    return (
        <PanelAccountShell
            activeKey="integraciones"
            tabs={DEFAULT_ACCOUNT_SECTION_TABS}
            title={ACCOUNT_INTEGRATIONS_PAGE.title}
            description={accountIntegrationsDescription('Simple Propiedades')}
        >
            <div className="flex flex-col gap-4">
                <InstagramIntegrationCard />
                <TikTokIntegrationCard />
                <YouTubeIntegrationCard />
            </div>
        </PanelAccountShell>
    );
}
