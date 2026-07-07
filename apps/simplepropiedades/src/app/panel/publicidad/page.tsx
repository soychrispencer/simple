'use client';

import { useCallback } from 'react';
import PanelSectionHeader from '@/components/panel/panel-section-header';
import BoostManager from '@/components/panel/boost-manager';
import { fetchMyPanelListings } from '@/lib/panel-listings';
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
import { MarketplaceCampaignBuilder, MarketplacePublicidadShell } from '@simple/ui/panel';
import { getVerticalAdvertisingConfig } from '@simple/utils';

const VERTICAL = 'propiedades' as const;
const config = getVerticalAdvertisingConfig(VERTICAL);

export default function PublicidadPage() {
  const fetchListingOptions = useCallback(async () => {
    const result = await fetchMyPanelListings();
    return result.items
      .filter((item) => item.href)
      .map((item) => ({
        label: item.title,
        href: item.href,
      }));
  }, []);

  return (
    <MarketplacePublicidadShell
      vertical={VERTICAL}
      header={
        <PanelSectionHeader
          title={config.copy.pageTitle}
          description={config.copy.pageDescription}
        />
      }
      boostContent={<BoostManager />}
      campaignsContent={
        <MarketplaceCampaignBuilder
          vertical={VERTICAL}
          fetchListingOptions={fetchListingOptions}
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
