'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    type PublicOperatorCatalog,
    type PublicOperatorPackItem,
    type PublicOperatorPromotionItem,
    type PublicOperatorServiceItem,
    type PublicProfileVertical,
    resolveServicePublicBadge,
} from '@simple/utils';
import { BusinessOperatorPackPublicCard } from './business-operator-pack-public-card.js';
import { BusinessOperatorPromotionBanner } from './business-operator-promotion-banner.js';
import { BusinessServicePublicCard } from './business-service-public-card.js';
import { BUSINESS_CATALOG_TAB_LABELS_PUBLIC } from './business-catalog-tabs.js';
import { PUBLIC_PROFILE_CATALOG_EMPTY_MESSAGE } from './business-copy.js';
import { BusinessCatalogTabs } from './business-catalog-tabs.js';
import { PanelEmptyState } from './panel-display.js';

type CatalogTab = 'services' | 'packs' | 'promotions';

export type BusinessOperatorServiceCatalogProps = {
    vertical: PublicProfileVertical;
    catalog: PublicOperatorCatalog;
    showProvider?: boolean;
};

export function BusinessOperatorServiceCatalog({
    vertical,
    catalog,
    showProvider = false,
}: BusinessOperatorServiceCatalogProps) {
    const { services, packs, promotions } = catalog;
    const catalogSignature = useMemo(
        () => [
            ...services.map((item) => item.id),
            ...packs.map((item) => item.id),
            ...promotions.map((item) => item.id),
        ].join('|'),
        [services, packs, promotions],
    );

    const tabs = useMemo(() => {
        const items: Array<{ key: CatalogTab; label: string; count: number }> = [];
        if (services.length > 0) {
            items.push({ key: 'services', label: BUSINESS_CATALOG_TAB_LABELS_PUBLIC.services, count: services.length });
        }
        if (packs.length > 0) {
            items.push({ key: 'packs', label: BUSINESS_CATALOG_TAB_LABELS_PUBLIC.packs, count: packs.length });
        }
        if (promotions.length > 0) {
            items.push({ key: 'promotions', label: BUSINESS_CATALOG_TAB_LABELS_PUBLIC.promotions, count: promotions.length });
        }
        return items;
    }, [services.length, packs.length, promotions.length]);

    const defaultTab = tabs[0]?.key ?? 'services';
    const [tab, setTab] = useState<CatalogTab>(defaultTab);

    useEffect(() => {
        setTab(defaultTab);
    }, [catalogSignature, defaultTab]);

    const activeTab = tabs.some((item) => item.key === tab) ? tab : defaultTab;

    const totalCount = services.length + packs.length + promotions.length;
    if (totalCount === 0) {
        return <PanelEmptyState title="Sin catálogo por ahora" description={PUBLIC_PROFILE_CATALOG_EMPTY_MESSAGE} />;
    }

    function serviceCard(item: PublicOperatorServiceItem) {
        const provider = showProvider ? item.provider : null;
        return (
            <BusinessServicePublicCard
                key={item.id}
                vertical={vertical}
                href={showProvider ? `/servicios/${encodeURIComponent(item.id)}` : undefined}
                item={{
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    imageUrl: item.imageUrl,
                    imageFallbackUrl: item.provider.coverImageUrl ?? item.provider.avatarImageUrl ?? null,
                    category: item.category,
                    pricingMode: item.pricingMode,
                    price: item.price,
                    promoPrice: item.promoPrice,
                    currency: item.currency,
                    durationMinutes: item.durationMinutes,
                    isOnline: item.isOnline,
                    isPresential: item.isPresential,
                    providerName: provider?.name ?? null,
                    providerHref: provider?.profileHref ?? null,
                    locationLabel: provider?.city ?? provider?.region ?? null,
                    badge: resolveServicePublicBadge(item.id, item, promotions),
                }}
            />
        );
    }

    function packCard(item: PublicOperatorPackItem) {
        const href = showProvider ? item.provider.profileHref : undefined;
        return (
            <BusinessOperatorPackPublicCard
                key={item.id}
                vertical={vertical}
                href={href}
                item={showProvider ? item : { ...item, provider: null }}
            />
        );
    }

    function promotionBanner(item: PublicOperatorPromotionItem) {
        const href = showProvider ? item.provider.profileHref : undefined;
        return (
            <BusinessOperatorPromotionBanner
                key={item.id}
                href={href}
                item={showProvider ? item : { ...item, provider: null }}
            />
        );
    }

    const showTabs = tabs.length > 1;

    return (
        <div className="space-y-6">
            {showTabs ? (
                <BusinessCatalogTabs
                    active={activeTab}
                    variant="buttons"
                    onChange={setTab}
                    labelsVariant="public"
                    counts={{
                        services: services.length,
                        packs: packs.length,
                        promotions: promotions.length,
                    }}
                />
            ) : null}

            {(!showTabs || activeTab === 'services') && services.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {services.map(serviceCard)}
                </div>
            ) : null}

            {(!showTabs || activeTab === 'packs') && packs.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {packs.map(packCard)}
                </div>
            ) : null}

            {(!showTabs || activeTab === 'promotions') && promotions.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                    {promotions.map(promotionBanner)}
                </div>
            ) : null}

            {showTabs && activeTab === 'services' && services.length === 0 ? (
                <PanelEmptyState title="Sin servicios" description="No hay servicios en esta sección." />
            ) : null}
            {showTabs && activeTab === 'packs' && packs.length === 0 ? (
                <PanelEmptyState title="Sin packs" description="No hay packs en esta sección." />
            ) : null}
            {showTabs && activeTab === 'promotions' && promotions.length === 0 ? (
                <PanelEmptyState title="Sin ofertas" description="No hay promociones activas." />
            ) : null}
        </div>
    );
}
