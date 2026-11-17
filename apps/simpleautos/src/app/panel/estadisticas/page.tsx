'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PanelSectionHeader from '@/components/panel/panel-section-header';
import {
    fetchMarketplaceOperatorAnalytics,
    fetchSubscriptionCatalog,
    type MarketplaceOperatorAnalytics,
    type SubscriptionCatalogResponse,
} from '@simple/utils';
import { MarketplaceOperatorAnalyticsView, PanelButton, PanelCard, PanelPillNav } from '@simple/ui/panel';

export default function EstadisticasPage() {
    const [analytics, setAnalytics] = useState<MarketplaceOperatorAnalytics | null>(null);
    const [catalog, setCatalog] = useState<SubscriptionCatalogResponse | null>(null);
    const [catalogUnavailable, setCatalogUnavailable] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const subscriptionCatalog = await fetchSubscriptionCatalog('autos');
                if (cancelled) return;
                if (!subscriptionCatalog) {
                    setCatalogUnavailable(true);
                    return;
                }
                setCatalog(subscriptionCatalog);

                if (
                    subscriptionCatalog.entitlements?.capabilities.analytics === true
                    && subscriptionCatalog.accountContext?.role !== 'agent'
                ) {
                    try {
                        const data = await fetchMarketplaceOperatorAnalytics('autos');
                        if (!cancelled) setAnalytics(data);
                    } catch {
                        if (!cancelled) setAnalytics(null);
                    }
                }
            } catch {
                if (!cancelled) setCatalogUnavailable(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);
    const isCompanyAgent = catalog?.accountContext?.role === 'agent';
    const analyticsEnabled = catalog?.entitlements?.capabilities.analytics === true && !isCompanyAgent;
    const isIndividual = catalog?.accountContext?.accountKind === 'individual';

    return (
        <div className="container-app panel-page py-4 lg:py-8">
            <PanelSectionHeader
                title="Estadísticas"
                description="Métricas de tu operación y publicaciones"
                actions={
                    <PanelPillNav
                        items={['Actual'].map((period) => ({ key: period, label: period }))}
                        activeKey="Actual"
                        onChange={() => undefined}
                        showMobileDropdown={false}
                        breakpoint="sm"
                        size="sm"
                        ariaLabel="Rango de estadísticas"
                    />
                }
            />

            {!loading && catalogUnavailable ? (
                <PanelCard size="md" className="space-y-4">
                    <div>
                        <p className="text-base font-semibold" style={{ color: 'var(--fg)' }}>
                            No pudimos consultar tu acceso a estadísticas
                        </p>
                        <p className="mt-1 text-sm leading-6" style={{ color: 'var(--fg-muted)' }}>
                            Revisa el estado de tu cuenta e inténtalo de nuevo.
                        </p>
                    </div>
                    <Link href="/panel/mi-cuenta/suscripcion">
                        <PanelButton variant="secondary">Revisar mi cuenta</PanelButton>
                    </Link>
                </PanelCard>
            ) : !loading && !analyticsEnabled ? (
                <PanelCard size="md" className="space-y-4">
                    <div>
                        <p className="text-base font-semibold" style={{ color: 'var(--fg)' }}>
                            {isCompanyAgent
                                ? 'Estadísticas para administradores del espacio'
                                : isIndividual
                                    ? 'Estadísticas para una actividad profesional'
                                    : 'Conoce qué está funcionando'}
                        </p>
                        <p className="mt-1 text-sm leading-6" style={{ color: 'var(--fg-muted)' }}>
                            {isCompanyAgent
                                ? 'El dueño o administrador del espacio puede revisar las métricas y el plan. Tus publicaciones y contactos asignados siguen disponibles.'
                                : isIndividual
                                    ? 'Configura tu actividad como profesional o empresa para habilitar métricas detalladas.'
                                    : 'Las métricas detalladas están incluidas en el plan Profesional. Tus publicaciones y contactos siguen disponibles.'}
                        </p>
                    </div>
                    <Link href={isCompanyAgent ? '/panel' : isIndividual ? '/panel/mi-negocio/configuraciones' : '/panel/mi-cuenta/suscripcion'}>
                        <PanelButton variant="secondary">
                            {isCompanyAgent ? 'Volver a mi panel' : isIndividual ? 'Configurar mi actividad' : 'Ver mi plan'}
                        </PanelButton>
                    </Link>
                </PanelCard>
            ) : (
                <MarketplaceOperatorAnalyticsView
                    analytics={analytics}
                    loading={loading}
                    miNegocioHref="/panel/mi-negocio"
                />
            )}
        </div>
    );
}
