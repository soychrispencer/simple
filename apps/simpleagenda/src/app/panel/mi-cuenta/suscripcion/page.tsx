'use client';

import SubscriptionWrapper from './subscription-wrapper';
import { PanelPageHeader } from '@simple/ui/panel';
import { PanelSectionTabs, accountSectionTabs } from '@/components/panel/panel-section-tabs';

export default function SuscripcionesPage() {
    return (
        <div className="container-app panel-page py-4 lg:py-8">
            <PanelPageHeader
                title="Suscripción"
                description="Tu plan mensual para SimpleAgenda."
            />
            <div className="mb-6">
                <PanelSectionTabs
                    items={accountSectionTabs}
                    activeKey="suscripcion"
                    ariaLabel="Secciones de mi cuenta"
                />
            </div>
            <SubscriptionWrapper />
        </div>
    );
}
