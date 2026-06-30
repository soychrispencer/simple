'use client';

import { useEffect, useState } from 'react';
import PanelSectionHeader from '@/components/panel/panel-section-header';
import { fetchMarketplaceOperatorAnalytics, type MarketplaceOperatorAnalytics } from '@simple/utils';
import { MarketplaceOperatorAnalyticsView, PanelPillNav } from '@simple/ui/panel';

export default function EstadisticasPage() {
    const [analytics, setAnalytics] = useState<MarketplaceOperatorAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void (async () => {
            const data = await fetchMarketplaceOperatorAnalytics('autos');
            setAnalytics(data);
            setLoading(false);
        })();
    }, []);

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

            <MarketplaceOperatorAnalyticsView
                analytics={analytics}
                loading={loading}
                miNegocioHref="/panel/mi-negocio"
            />
        </div>
    );
}
