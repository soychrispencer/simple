export {
    createAdvertisingClient,
    type AdFormat,
    type AdStatus,
    type AdPaymentStatus,
    type AdDestinationType,
    type AdOverlayAlign,
    type AdPlacementSection,
    type AdCampaign,
    type AdCounters,
    type CreateAdCampaignInput,
    type UpdateAdCampaignContentInput,
    normalizeCampaigns,
    getCampaignCounters,
    getActiveHeroCampaigns,
    getActiveCampaignsByFormat,
    getCampaignDestinationHref,
    isValidHttpUrl,
    MAX_CAMPAIGNS_TOTAL,
    MAX_ACTIVE_HERO_CAMPAIGNS,
} from '@simple/utils';

import { createAdvertisingClient } from '@simple/utils';

const client = createAdvertisingClient('serenatas');

export const AD_UPDATE_EVENT = client.AD_UPDATE_EVENT;
export const emitCampaignsUpdated = client.emitCampaignsUpdated;
export const fetchMyAdCampaigns = client.fetchMyAdCampaigns;
export const fetchPublicAdCampaigns = client.fetchPublicAdCampaigns;
export const createAdCampaign = client.createAdCampaign;
export const updateAdCampaignContent = client.updateAdCampaignContent;
export const updateAdCampaignLifecycle = client.updateAdCampaignLifecycle;
export const deleteAdCampaign = client.deleteAdCampaign;
