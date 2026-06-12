'use client';

import SubscriptionManager from '@/components/panel/subscription-manager';
import { PanelSectionTabs, accountSectionTabs } from '@/components/panel/panel-section-tabs';
import { PanelPageHeader } from '@simple/ui/panel';

export default function SuscripcionesPage() {
    return (
        <div className="container-app panel-page py-4 lg:py-8">
            <PanelPageHeader title="Suscripciones" description="Planes mensuales para impulsar tu cuenta." />
            <PanelSectionTabs items={accountSectionTabs} activeKey="suscripcion" />
            <SubscriptionManager />
        </div>
    );
}
