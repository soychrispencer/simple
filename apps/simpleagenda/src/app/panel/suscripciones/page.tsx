'use client';

import SubscriptionWrapper from './subscription-wrapper';

export default function SuscripcionesPage() {
    return (
        <div className="container-app panel-page py-4 lg:py-8">
            <div className="mb-5 lg:mb-6">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Suscripción</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>Tu plan mensual para SimpleAgenda.</p>
            </div>
            <SubscriptionWrapper />
        </div>
    );
}
