'use client';

import Link from 'next/link';
import { IconSparkles } from '@tabler/icons-react';
import { PanelBlockHeader, PanelNotice, PanelStatusBadge } from './panel-primitives.js';
import { PanelButton } from './panel-button.js';
import { PanelCard } from './panel-card.js';

export type PanelMarketplacePlanBannerProps = {
    listingCount: number;
    maxListings: number;
    planLabel: string;
    billingStatus: 'free' | 'trial' | 'pro' | 'expired';
    trialDaysRemaining?: number | null;
    subscriptionHref: string;
    miNegocioHref?: string;
    loading?: boolean;
};

function formatListingLimit(maxListings: number): string {
    return maxListings < 0 ? 'Ilimitadas' : String(maxListings);
}

export function PanelMarketplacePlanBanner({
    listingCount,
    maxListings,
    planLabel,
    billingStatus,
    trialDaysRemaining,
    subscriptionHref,
    miNegocioHref = '/panel/mi-negocio',
    loading = false,
}: PanelMarketplacePlanBannerProps) {
    if (loading) return null;

    const atLimit = maxListings >= 0 && listingCount >= maxListings;
    const nearLimit = maxListings >= 0 && listingCount >= Math.max(1, maxListings - 1);
    const showProfileCta = billingStatus === 'free' || billingStatus === 'expired';
    const showUpgradeCta = atLimit || billingStatus === 'expired';

    return (
        <PanelCard size="md" className="space-y-4">
            <PanelBlockHeader
                title="Plan y capacidad"
                description="Tu plan define cuántos avisos activos puedes mantener y si puedes activar tu perfil público."
                className="mb-0"
            />
            <div className="flex flex-wrap items-center gap-2">
                <PanelStatusBadge label={planLabel} tone={billingStatus === 'trial' ? 'info' : billingStatus === 'pro' ? 'success' : 'neutral'} />
                <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                    {listingCount}/{formatListingLimit(maxListings)} avisos
                </span>
                {billingStatus === 'trial' && trialDaysRemaining != null ? (
                    <span className="text-sm" style={{ color: 'var(--accent)' }}>
                        {trialDaysRemaining} {trialDaysRemaining === 1 ? 'día' : 'días'} de prueba Pro
                    </span>
                ) : null}
            </div>

            {atLimit ? (
                <PanelNotice tone="warning">
                    Alcanzaste el límite de avisos de tu plan. Mejora a Pro para publicar más.
                </PanelNotice>
            ) : nearLimit && billingStatus !== 'pro' ? (
                <PanelNotice tone="neutral">
                    Te queda poco cupo de avisos en el plan actual.
                </PanelNotice>
            ) : null}

            {showProfileCta ? (
                <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}>
                    <div className="flex items-start gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'color-mix(in oklab, var(--accent) 14%, transparent)', color: 'var(--accent)' }}>
                            <IconSparkles size={16} />
                        </span>
                        <div className="space-y-1">
                            <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Activa tu perfil profesional</p>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                                Completa tu perfil en Mi negocio y activa la ficha pública para generar confianza en tus avisos.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link href={miNegocioHref}>
                            <PanelButton type="button">Ir a Mi negocio</PanelButton>
                        </Link>
                        <Link href={subscriptionHref}>
                            <PanelButton type="button" variant="secondary">Ver planes</PanelButton>
                        </Link>
                    </div>
                </div>
            ) : showUpgradeCta ? (
                <div className="flex justify-end">
                    <Link href={subscriptionHref}>
                        <PanelButton type="button">Mejorar plan</PanelButton>
                    </Link>
                </div>
            ) : null}
        </PanelCard>
    );
}
