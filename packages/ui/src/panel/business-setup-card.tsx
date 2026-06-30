'use client';

import Link from 'next/link';
import { PanelButton } from './panel-button.js';
import { PanelCard } from './panel-card.js';
import { PanelStatusBadge } from './panel-primitives.js';
import {
    billingAccessBadgeLabel,
    businessSetupProgress,
    isBusinessSetupComplete,
    nextBusinessSetupStep,
    type BusinessSetupStep,
    type PanelBillingAccess,
} from './business-setup.js';

export type PanelBusinessSetupCardProps = {
    steps: BusinessSetupStep[];
    billing: PanelBillingAccess;
    businessHref?: string;
    loading?: boolean;
    title?: string;
};

export function PanelBusinessSetupCard({
    steps,
    billing,
    loading = false,
    title = 'Configura tu negocio',
}: PanelBusinessSetupCardProps) {
    if (loading) {
        return null;
    }

    if (billing.status === 'expired' || steps.length === 0 || isBusinessSetupComplete(steps)) {
        return null;
    }

    const { completed, total, percent } = businessSetupProgress(steps);
    const nextStep = nextBusinessSetupStep(steps);
    const badgeLabel = billingAccessBadgeLabel(billing);

    if (!nextStep) {
        return null;
    }

    return (
        <PanelCard size="md">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-(--fg)">{title}</h2>
                        {badgeLabel ? (
                            <PanelStatusBadge
                                label={badgeLabel}
                                tone={billing.status === 'pro' ? 'success' : 'info'}
                                size="sm"
                            />
                        ) : null}
                    </div>
                    <p className="text-sm text-fg-muted">
                        Siguiente:{' '}
                        <span className="font-medium text-(--fg)">{nextStep.label}</span>
                        {' · '}
                        {completed} de {total}
                    </p>
                    <div
                        className="h-1.5 overflow-hidden rounded-full"
                        style={{ background: 'color-mix(in oklab, var(--accent) 18%, var(--border))' }}
                        role="progressbar"
                        aria-valuenow={percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Progreso de configuración del negocio"
                    >
                        <div
                            className="h-full rounded-full transition-[width] duration-300"
                            style={{ width: `${percent}%`, background: 'var(--accent)' }}
                        />
                    </div>
                </div>
                <Link href={nextStep.href} className="shrink-0">
                    <PanelButton type="button" className="w-full sm:w-auto">
                        {completed === 0 ? 'Empezar' : 'Continuar'}
                    </PanelButton>
                </Link>
            </div>
        </PanelCard>
    );
}
