'use client';

import Link from 'next/link';
import {
    formatOperatorPromotionLabel,
    type OperatorServicePromotionRecord,
    type PublicOperatorProviderSummary,
} from '@simple/utils';
import { PanelStatusBadge } from './panel-primitives.js';

export type BusinessOperatorPromotionBannerData = OperatorServicePromotionRecord & {
    provider?: PublicOperatorProviderSummary | null;
};

function formatPromotionDates(promo: OperatorServicePromotionRecord) {
    if (!promo.startsAt && !promo.endsAt) return null;
    const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
    if (promo.startsAt && promo.endsAt) return `Válida del ${fmt(promo.startsAt)} al ${fmt(promo.endsAt)}`;
    if (promo.endsAt) return `Hasta el ${fmt(promo.endsAt)}`;
    if (promo.startsAt) return `Desde el ${fmt(promo.startsAt)}`;
    return null;
}

export function BusinessOperatorPromotionBanner({
    item,
    href,
    compact = false,
}: {
    item: BusinessOperatorPromotionBannerData;
    href?: string | null;
    compact?: boolean;
}) {
    const discountLabel = formatOperatorPromotionLabel(item);
    const datesLabel = formatPromotionDates(item);
    const provider = item.provider;
    const cardLinked = Boolean(href);

    const content = (
        <div className={`flex flex-col gap-1 ${compact ? '' : 'rounded-xl border border-border bg-[var(--bg-subtle)] p-4'}`}>
            <div className="flex flex-wrap items-center gap-2">
                <PanelStatusBadge label={discountLabel} tone="info" size="sm" />
                <span className="text-sm font-semibold text-fg">{item.label}</span>
            </div>
            {item.description && !compact ? (
                <p className="text-sm text-fg-secondary">{item.description}</p>
            ) : null}
            {datesLabel ? <p className="text-xs text-fg-muted">{datesLabel}</p> : null}
            {provider ? (
                <p className="text-xs text-fg-muted">
                    {href && !cardLinked ? (
                        <Link href={href} className="underline-offset-2 hover:underline">{provider.name}</Link>
                    ) : (
                        <span>{provider.name}</span>
                    )}
                </p>
            ) : null}
        </div>
    );

    if (href && compact) {
        return <Link href={href} className="block transition-opacity hover:opacity-90">{content}</Link>;
    }
    return content;
}
