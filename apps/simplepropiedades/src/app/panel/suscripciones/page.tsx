'use client';

import PanelSectionHeader from '@/components/panel/panel-section-header';
import SubscriptionManager from '@/components/panel/subscription-manager';

export default function SuscripcionesPage() {
    return (
        <div className="container-app panel-page py-4 lg:py-8">
            <PanelSectionHeader
                title="Suscripciones"
                description="Planes mensuales para impulsar tu cuenta."
            />
            <SubscriptionManager />
        </div>
    );
}
