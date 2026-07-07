'use client';

import { useCallback } from 'react';
import BoostManager from '@/components/panel/boost-manager';
import { fetchAgendaProfile } from '@/lib/agenda-api';
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
import { MarketplaceCampaignBuilder, MarketplacePublicidadShell, PanelPageHeader } from '@simple/ui/panel';
import { getVerticalAdvertisingConfig } from '@simple/utils';

const VERTICAL = 'agenda' as const;
const config = getVerticalAdvertisingConfig(VERTICAL);

export default function PublicidadPage() {
    const fetchListingOptions = useCallback(async () => {
        const profile = await fetchAgendaProfile();
        if (!profile?.isPublished || !profile.slug) return [];
        return [
            {
                label: profile.displayName ?? profile.slug,
                href: `/${profile.slug}`,
            },
        ];
    }, []);

    const fetchProfileSlug = useCallback(async () => {
        const profile = await fetchAgendaProfile();
        return profile?.isPublished && profile.slug ? profile.slug : null;
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
