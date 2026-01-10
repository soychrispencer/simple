import { ensureListingBoost, fetchBoostedListings, getBoostSlotsByVertical, syncListingBoostSlots } from '@simple/listings';
import { getSupabaseClient } from './supabase/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export const AUTOS_VERTICAL_KEY = 'vehicles';

export function getClient(client?: SupabaseClient) {
  return client ?? getSupabaseClient();
}

export function listAutosBoostSlots(client?: SupabaseClient) {
  const supabase = getClient(client);
  return getBoostSlotsByVertical(supabase, AUTOS_VERTICAL_KEY);
}

export function fetchAutosBoostedListings(params: {
  supabase?: SupabaseClient;
  slotKey: string;
  limit?: number;
  listingSelect?: string;
  listingType?: string;
  userId?: string;
  companyId?: string;
  companyProfileId?: string;
}) {
  const { supabase: providedClient, ...rest } = params;
  const supabase = getClient(providedClient);
  return fetchBoostedListings({
    supabase,
    verticalKey: AUTOS_VERTICAL_KEY,
    ...rest,
  });
}

export function ensureAutosListingBoost(params: {
  supabase?: SupabaseClient;
  listingId: string;
  companyId?: string | null;
  userId?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  metadata?: Record<string, any> | null;
}) {
  const { supabase: providedClient, ...rest } = params;
  const supabase = getClient(providedClient);
  return ensureListingBoost({
    supabase,
    status: 'active',
    ...rest,
  });
}

export function syncAutosListingBoostSlots(params: {
  supabase?: SupabaseClient;
  listingId: string;
  boostId: string;
  slotIds: string[];
  windowStart?: string | null;
  windowEnd?: string | null;
}) {
  const { supabase: providedClient, ...rest } = params;
  const supabase = getClient(providedClient);
  return syncListingBoostSlots({ supabase, ...rest });
}
