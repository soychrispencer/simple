'use client';

import Link from 'next/link';
import { IconUserCircle } from '@tabler/icons-react';
import { PanelButton } from '../panel/panel-button.js';

export type MarketplacePublishProfileCtaProps = {
    miNegocioHref?: string;
    subscriptionHref?: string;
};

/** CTA contextual tras publicar un aviso: invita a completar el perfil público. */
export function MarketplacePublishProfileCta({
    miNegocioHref = '/panel/mi-negocio',
    subscriptionHref = '/panel/mi-cuenta/suscripcion',
}: MarketplacePublishProfileCtaProps) {
    return (
        <div className="rounded-2xl border border-(--border) bg-(--bg-subtle) p-4">
            <div className="flex items-start gap-3">
                <span
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                >
                    <IconUserCircle size={20} />
                </span>
                <div className="min-w-0 flex-1 space-y-3">
                    <div>
                        <p className="text-sm font-semibold text-(--fg)">¿Vendes de forma profesional?</p>
                        <p className="mt-1 text-sm text-(--fg-secondary)">
                            Completa tu perfil en Mi negocio (particular, profesional o empresa). Pro activa tu ficha
                            pública y más avisos; el tipo de operador no se bloquea por plan.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <Link href={miNegocioHref}>
                            <PanelButton type="button" variant="primary">
                                Ir a Mi negocio
                            </PanelButton>
                        </Link>
                        <Link href={subscriptionHref}>
                            <PanelButton type="button" variant="secondary">
                                Ver planes Pro
                            </PanelButton>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
