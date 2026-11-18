import { Suspense } from 'react';
import { AgendaMiNegocioShell } from '@/components/panel/agenda-mi-negocio-shell';
import SubscriptionWrapper from '../../mi-cuenta/suscripcion/subscription-wrapper';

export default function PlanPage() {
    return (
        <AgendaMiNegocioShell
            activeKey="plan"
            title="Plan y facturación"
            description="Gestiona tu suscripción a SimpleAgenda y revisa los datos de facturación."
            showPublishToggle={false}
        >
            <Suspense fallback={<p className="text-sm text-fg-muted">Cargando planes…</p>}>
                <SubscriptionWrapper />
            </Suspense>
        </AgendaMiNegocioShell>
    );
}
