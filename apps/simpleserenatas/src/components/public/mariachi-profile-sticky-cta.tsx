'use client';

import type { ProviderGroup, ProviderGroupService } from '@/lib/serenatas-api';
import { MarketplaceContractButton } from '@/components/public/marketplace-contract-button';
import { money } from '@/components/panel/shared';
import { serviceEffectivePrice, serviceHasPromoPrice } from '@/lib/service-pricing';

type MariachiProfileStickyCtaProps = {
    group: ProviderGroup;
    service: ProviderGroupService;
    onContract: () => void;
};

/** Barra fija en móvil: precio + contratar sin perder el CTA al hacer scroll. */
export function MariachiProfileStickyCta({ group, service, onContract }: MariachiProfileStickyCtaProps) {
    const hasPromo = serviceHasPromoPrice(service);
    return (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md md:hidden">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-xs text-fg-muted">{group.name}</p>
                    <p className="text-lg font-bold tabular-nums leading-none text-fg">{money(serviceEffectivePrice(service))}</p>
                    {hasPromo ? <p className="mt-0.5 text-xs text-fg-muted line-through">{money(service.price)}</p> : null}
                </div>
                <MarketplaceContractButton
                    group={group}
                    className="shrink-0 px-5"
                    onContract={onContract}
                />
            </div>
        </div>
    );
}
