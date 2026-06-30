'use client';

import { Suspense } from 'react';
import { IconLoader2 } from '@tabler/icons-react';
import {
    ACCOUNT_INTEGRATIONS_PAGE,
    PanelAccountShell,
    accountIntegrationsDescription,
} from '@simple/ui/panel';
import { MercadoPagoIntegrationCard } from '@simple/ui/integrations';
import { accountSectionTabs } from '@/components/panel/panel-section-tabs';
import { AgendaGoogleCalendarIntegrationCard } from '@/components/panel/agenda-google-calendar-integration-card';

function IntegracionesPageInner() {
    return (
        <PanelAccountShell
            activeKey="integraciones"
            tabs={accountSectionTabs}
            title={ACCOUNT_INTEGRATIONS_PAGE.title}
            description={accountIntegrationsDescription('Simple Agenda')}
        >
            <div className="flex flex-col gap-4">
                <MercadoPagoIntegrationCard
                    vertical="agenda"
                    lockedHint="MercadoPago requiere plan Pro o un periodo de prueba activo."
                />
                <AgendaGoogleCalendarIntegrationCard />
            </div>
        </PanelAccountShell>
    );
}

export default function IntegracionesPage() {
    return (
        <Suspense fallback={
            <div className="container-app panel-page py-4 lg:py-8 flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                <IconLoader2 size={16} className="animate-spin" /> Cargando...
            </div>
        }>
            <IntegracionesPageInner />
        </Suspense>
    );
}
