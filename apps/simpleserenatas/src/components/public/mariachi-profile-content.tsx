'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    MariachiProfileHero,
    MariachiProfilePacksList,
    MariachiProfilePromotionsList,
    MariachiProfileServicesList,
} from '@/components/panel/mariachi-profile-layout';
import type { ProviderGroup, ProviderGroupService, ProviderGroupServicePack, ProviderGroupServicePromotion } from '@/lib/serenatas-api';
import { MarketplaceContractButton } from '@/components/public/marketplace-contract-button';
import { cheapestService } from '@/lib/marketplace-group-display';
import { useSerenataRequestModal } from '@/components/serenata-request/serenata-request-modal-context';
import { MariachiProfileStickyCta } from '@/components/public/mariachi-profile-sticky-cta';
import { MariachiRepertoireSection } from '@/components/public/mariachi-repertoire-section';
import { MariachiReviewsSection } from '@/components/public/mariachi-reviews-section';

function sortServicesForDisplay(services: ProviderGroupService[]): ProviderGroupService[] {
    if (services.length <= 1) return services;
    const cheapest = cheapestService(services);
    if (!cheapest) return services;
    const rest = services.filter((service) => service.id !== cheapest.id);
    return [cheapest, ...rest];
}

export function MariachiProfileContent({
    group,
    services,
    packs,
    promotions,
}: {
    group: ProviderGroup;
    services: ProviderGroupService[];
    packs: ProviderGroupServicePack[];
    promotions: ProviderGroupServicePromotion[];
}) {
    const { openRequest } = useSerenataRequestModal();
    const searchParams = useSearchParams();
    const initialDate = searchParams.get('fecha')?.trim() || searchParams.get('date')?.trim() || undefined;

    const sortedServices = useMemo(() => sortServicesForDisplay(services), [services]);
    const featuredService = sortedServices[0] ?? null;
    const featuredServiceId = featuredService?.id ?? null;

    const openContract = (service: ProviderGroupService) => {
        openRequest({ group, service, date: initialDate });
    };

    return (
        <>
            <div className="grid min-w-0 gap-4 pb-24 sm:gap-5 md:pb-0">
                <MariachiProfileHero group={group} />

                <MariachiReviewsSection group={group} />

                <MariachiRepertoireSection groupSlug={group.slug} />

                <MariachiProfilePromotionsList promotions={promotions} />

                <MariachiProfileServicesList
                    services={sortedServices}
                    featuredServiceId={featuredServiceId}
                    renderAction={(service) => (
                        <MarketplaceContractButton
                            group={group}
                            onContract={() => openContract(service)}
                        />
                    )}
                />

                <MariachiProfilePacksList packs={packs} />

                <p className="text-center">
                    <Link href="/mariachis" className="text-sm font-medium text-accent hover:underline">
                        Explorar más mariachis
                    </Link>
                </p>
            </div>

            {featuredService ? (
                <MariachiProfileStickyCta
                    group={group}
                    service={featuredService}
                    onContract={() => openContract(featuredService)}
                />
            ) : null}
        </>
    );
}
