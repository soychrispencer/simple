'use client';

import { useCallback } from 'react';
import BoostManager from '@/components/panel/boost-manager';
import {
    AD_UPDATE_EVENT,
    createAdCampaign,
    deleteAdCampaign,
    emitCampaignsUpdated,
    fetchMyAdCampaigns,
    updateAdCampaignContent,
    updateAdCampaignLifecycle,
} from '@/lib/advertising';
import { confirmCheckout, startAdvertisingCheckout } from '@/lib/payments';
import { publicMariachiPath } from '@/lib/public-mariachi-routes';
import { serenatasApi } from '@/lib/serenatas-api';
import { MarketplaceCampaignBuilder, MarketplacePublicidadShell, PanelPageHeader } from '@simple/ui/panel';
import { getVerticalAdvertisingConfig } from '@simple/utils';

const VERTICAL = 'serenatas' as const;
const config = getVerticalAdvertisingConfig(VERTICAL);

export function PublicidadView() {
    const fetchListingOptions = useCallback(async () => {
        const response = await serenatasApi.myProviderGroups();
        if (!response.ok) return [];
        return response.items
            .filter((group) => group.status === 'active' && group.slug)
            .map((group) => ({
                label: group.name,
                href: publicMariachiPath(group.slug),
            }));
    }, []);

    const fetchProfileSlug = useCallback(async () => {
        const response = await serenatasApi.myProviderGroups();
        if (!response.ok) return null;
        const group = response.items.find((item) => item.status === 'active' && item.slug);
        return group?.slug ?? null;
    }, []);

    return (
        <MarketplacePublicidadShell
            vertical={VERTICAL}
            header={
                <PanelPageHeader
                    title={config.copy.pageTitle}
                    description={config.copy.pageDescription}
                />
            }
            boostContent={<BoostManager />}
            campaignsContent={
                <MarketplaceCampaignBuilder
                    vertical={VERTICAL}
                    fetchListingOptions={fetchListingOptions}
                    fetchProfileSlug={fetchProfileSlug}
                    startAdvertisingCheckout={startAdvertisingCheckout}
                    confirmCheckout={confirmCheckout}
                    advertising={{
                        AD_UPDATE_EVENT,
                        fetchMyAdCampaigns,
                        createAdCampaign,
                        updateAdCampaignContent,
                        updateAdCampaignLifecycle,
                        deleteAdCampaign,
                        emitCampaignsUpdated,
                    }}
                />
            }
        />
    );
}
