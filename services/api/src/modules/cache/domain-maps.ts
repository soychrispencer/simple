import type {
    AccountRecord,
    AccountUserRecord,
    ActiveSubscription,
    AddressBookEntry,
    AppUser,
    BoostOrder,
    FollowRecord,
    InstagramAccountRecord,
    InstagramPublicationRecord,
    TikTokAccountRecord,
    YouTubeAccountRecord,
    ListingRecord,
    PaymentOrderRecord,
    SavedListingRecord,
} from '../../lib/domain-types.js';
import { createPublicProfileCache } from '../public-profile/profile-cache.js';

/** Maps en memoria — bootstrap vía `loadDataFromDB` / escrituras dual-write. */
export const usersById = new Map<string, AppUser>();
export const accountsById = new Map<string, AccountRecord>();
export const accountUsersByUserId = new Map<string, AccountUserRecord[]>();
export const defaultAccountIdByUserId = new Map<string, string>();
export const savedByUser = new Map<string, SavedListingRecord[]>();
export const followsByUser = new Map<string, FollowRecord[]>();
export const boostOrdersByUser = new Map<string, BoostOrder[]>();
export const listingsById = new Map<string, ListingRecord>();
export const addressBookByUser = new Map<string, AddressBookEntry[]>();
export const paymentOrdersByUser = new Map<string, PaymentOrderRecord[]>();
export const activeSubscriptionsByUser = new Map<string, ActiveSubscription[]>();
export const instagramAccountByUserVertical = new Map<string, InstagramAccountRecord>();
export const tiktokAccountByUserVertical = new Map<string, TikTokAccountRecord>();
export const youtubeAccountByUserVertical = new Map<string, YouTubeAccountRecord>();
export const instagramPublicationsByUser = new Map<string, InstagramPublicationRecord[]>();
export const socialPublicationsByUser = new Map<string, import('../../lib/domain-types.js').SocialPublicationRecord[]>();
export const listingIdsByUser = new Map<string, string[]>();

export const {
    publicProfilesByUserVertical,
    publicProfilesByVerticalSlug,
    upsertPublicProfileCache,
    getPublicProfileRecord,
    getPublishedPublicProfileBySlug,
} = createPublicProfileCache();
