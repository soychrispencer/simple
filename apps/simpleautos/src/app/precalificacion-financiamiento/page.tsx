import { Suspense } from 'react';
import type { Metadata } from 'next';
import { FinancingPrecheckWizard } from '@/components/financing/financing-precheck-wizard';

export const metadata: Metadata = {
    title: 'Precalificación de financiamiento | SimpleAutos',
    description: 'Asistente para precalificar tu perfil antes de solicitar crédito automotriz en Chile. No es aprobación ni simulación de cuotas.',
};

export default function PrecalificacionFinanciamientoPage() {
    return (
        <Suspense fallback={<div className="marketplace-flow-page container-app marketplace-flow-body text-sm text-[var(--fg-muted)]">Cargando asistente…</div>}>
            <FinancingPrecheckWizard />
        </Suspense>
    );
}
