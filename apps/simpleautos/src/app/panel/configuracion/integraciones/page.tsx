'use client';

import InstagramIntegrationCard from '@/components/panel/instagram-integration-card';
import { PanelPageHeader } from '@simple/ui';

export default function IntegracionesPage() {
    return (
        <div className="container-app panel-page py-4 lg:py-8 max-w-2xl">
            <PanelPageHeader
                backHref="/panel/configuracion"
                title="Integraciones"
                description="Conecta servicios externos para potenciar campanas, difusion y captacion de leads."
            />
            <InstagramIntegrationCard />
        </div>
    );
}
