'use client';

import InstagramIntegrationCard from '@/components/panel/instagram-integration-card';
import { PanelSectionTabs, businessSectionTabs } from '@/components/panel/panel-section-tabs';
import { PanelPageHeader } from '@simple/ui/panel';

export default function IntegracionesPage() {
    return (
        <div className="container-app panel-page py-4 lg:py-8">
            <PanelPageHeader
                title="Integraciones"
                description="Conecta servicios externos para potenciar campanas, difusion y captacion de leads."
            />
            <PanelSectionTabs items={businessSectionTabs} activeKey="integraciones" />
            <InstagramIntegrationCard />
        </div>
    );
}
