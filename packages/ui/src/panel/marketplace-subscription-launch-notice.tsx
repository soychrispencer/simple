'use client';

import { IconRocket } from '@tabler/icons-react';
import { MARKETPLACE_SUBSCRIPTION_LAUNCH_NOTICE } from './business-copy.js';
import { PanelCard } from './panel-card.js';
import { PanelNotice, PanelStatusBadge } from './panel-primitives.js';

type Props = {
    appLabel: string;
};

export function MarketplaceSubscriptionLaunchNotice({ appLabel }: Props) {
    return (
        <div className="space-y-4">
            <PanelCard size="md" className="space-y-4">
                <div className="flex flex-wrap items-start gap-3">
                    <span
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                        style={{ background: 'color-mix(in oklab, var(--accent) 14%, transparent)', color: 'var(--accent)' }}
                    >
                        <IconRocket size={20} />
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>
                                {MARKETPLACE_SUBSCRIPTION_LAUNCH_NOTICE.title}
                            </h2>
                            <PanelStatusBadge label={MARKETPLACE_SUBSCRIPTION_LAUNCH_NOTICE.badge} tone="info" />
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                            Estamos en período de lanzamiento: todas las funciones de {appLabel} están disponibles sin costo
                            mientras incorporamos usuarios. Pronto activaremos los planes de suscripción.
                        </p>
                    </div>
                </div>
            </PanelCard>

            <PanelNotice tone="neutral">
                Podés usar todas las herramientas del panel sin límites por ahora.
                Te avisaremos antes de activar los planes pagos.
            </PanelNotice>
        </div>
    );
}
