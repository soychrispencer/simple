import type { SupabaseClient } from '@supabase/supabase-js';

export interface BoostSlotRecord {
  id: string;
  key: string;
  title: string;
  description?: string | null;
  placement?: string | null;
  max_active?: number | null;
  default_duration_days?: number | null;
  price?: number | null;
  currency?: string | null;
  config?: Record<string, any> | null;
}

export interface FetchBoostedListingsParams {
  supabase: SupabaseClient;
  slotKey: string;
  verticalKey: string;
  limit?: number;
  listingSelect?: string;
  listingType?: string;
  userId?: string;
  companyId?: string; // legacy company id (now maps to company_profile_id)
  companyProfileId?: string;
}

export interface BoostedListingRow<TListing = Record<string, any>> {
  slotId: string;
  priority: number;
  startsAt: string | null;
  endsAt: string | null;
  listing: TListing;
}

export interface EnsureListingBoostParams {
  supabase: SupabaseClient;
  listingId: string;
  companyId?: string | null;
  userId?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  status?: 'pending' | 'active';
  metadata?: Record<string, any> | null;
}

export interface EnsureListingBoostResult {
  id: string;
  startsAt: string | null;
  endsAt: string | null;
}

export interface SyncListingBoostSlotsParams {
  supabase: SupabaseClient;
  listingId: string;
  boostId: string;
  slotIds: string[];
  windowStart?: string | null;
  windowEnd?: string | null;
}

export interface SyncListingBoostSlotsResult {
  added: number;
  removed: number;
}

const DEFAULT_LISTING_SELECT = `
  id,
  title,
  listing_type,
  status,
  price,
  currency,
  metadata,
  vertical_id,
  company_profile_id,
  public_profile_id,
  user_id,
  images:images(url, position, is_primary)
`;

async function resolveSlotId(
  supabase: SupabaseClient,
  slotKey: string,
  verticalKey: string
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('boost_slots')
    .select('id, verticals!inner(key)')
    .eq('key', slotKey)
    .eq('verticals.key', verticalKey)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('[boosts] resolveSlotId error', error);
    throw error;
  }

  if (!data?.id) {
    return null;
  }

  return { id: data.id };
}

export async function getBoostSlotsByVertical(
  supabase: SupabaseClient,
  verticalKey: string
): Promise<BoostSlotRecord[]> {
  const { data, error } = await supabase
    .from('boost_slots')
    .select('id, key, title, description, placement, max_active, default_duration_days, price, currency, config, verticals!inner(key)')
    .eq('verticals.key', verticalKey)
    .eq('is_active', true)
    .order('price', { ascending: false });

  if (error) {
    console.error('[boosts] getBoostSlotsByVertical error', error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    key: row.key,
    title: row.title,
    description: row.description,
    placement: row.placement,
    max_active: row.max_active,
    default_duration_days: row.default_duration_days,
    price: row.price,
    currency: row.currency,
    config: row.config,
  }));
}

export async function fetchBoostedListings<TListing = Record<string, any>>({
  supabase,
  slotKey,
  verticalKey,
  limit = 10,
  listingSelect = DEFAULT_LISTING_SELECT,
  listingType,
  userId,
  companyId,
  companyProfileId,
}: FetchBoostedListingsParams): Promise<BoostedListingRow<TListing>[]> {
  const slot = await resolveSlotId(supabase, slotKey, verticalKey);
  if (!slot?.id) {
    return [];
  }

  let query = supabase
    .from('listing_boost_slots')
    .select(
      `
        id,
        priority,
        starts_at,
        ends_at,
        listing:listings!inner(${listingSelect})
      `
    )
    .eq('slot_id', slot.id)
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .limit(limit);

  if (listingType) {
    query = query.eq('listing.listing_type', listingType);
  }
  if (userId) {
    query = query.eq('listing.user_id', userId);
  }
  const targetCompanyProfileId = companyProfileId || companyId;
  if (targetCompanyProfileId) {
    query = query.eq('listing.company_profile_id', targetCompanyProfileId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[boosts] fetchBoostedListings error', error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    slotId: slot.id,
    priority: row.priority ?? 0,
    startsAt: row.starts_at ?? null,
    endsAt: row.ends_at ?? null,
    listing: row.listing as TListing,
  }));
}

export async function ensureListingBoost({
  supabase,
  listingId,
  companyId = null,
  userId = null,
  startsAt,
  endsAt,
  status = 'active',
  metadata = {},
}: EnsureListingBoostParams): Promise<EnsureListingBoostResult> {
  const { data: existing, error: existingError } = await supabase
    .from('listing_boosts')
    .select('id, starts_at, ends_at')
    .eq('listing_id', listingId)
    .eq('status', status)
    .maybeSingle();

  if (existingError) {
    console.error('[boosts] ensureListingBoost existing error', existingError);
    throw existingError;
  }

  if (existing?.id) {
    return {
      id: existing.id,
      startsAt: existing.starts_at ?? null,
      endsAt: existing.ends_at ?? null,
    };
  }

  const now = new Date();
  const payload = {
    listing_id: listingId,
    company_id: companyId,
    user_id: userId,
    status,
    starts_at: startsAt ?? now.toISOString(),
    ends_at: endsAt ?? null,
    metadata: metadata || {},
  };

  const { data, error } = await supabase
    .from('listing_boosts')
    .insert(payload)
    .select('id, starts_at, ends_at')
    .single();

  if (error || !data?.id) {
    console.error('[boosts] ensureListingBoost insert error', error);
    throw error ?? new Error('No se pudo crear el boost');
  }

  return {
    id: data.id,
    startsAt: data.starts_at ?? null,
    endsAt: data.ends_at ?? null,
  };
}

export async function syncListingBoostSlots({
  supabase,
  listingId,
  boostId,
  slotIds,
  windowStart,
  windowEnd,
}: SyncListingBoostSlotsParams): Promise<SyncListingBoostSlotsResult> {
  const normalized = Array.from(new Set(slotIds || [])).filter(Boolean);
  const { data: currentRows, error: currentError } = await supabase
    .from('listing_boost_slots')
    .select('id, slot_id')
    .eq('listing_id', listingId)
    .eq('is_active', true);

  if (currentError) {
    console.error('[boosts] syncListingBoostSlots current error', currentError);
    throw currentError;
  }

  const current = currentRows || [];
  const currentSlotIds = current.map((row) => row.slot_id);

  const toAdd = normalized.filter((slotId) => !currentSlotIds.includes(slotId));
  const toRemove = current.filter((row) => !normalized.includes(row.slot_id));

  let added = 0;
  let removed = 0;

  if (toRemove.length) {
    const ids = toRemove.map((row) => row.id);
    const { error: deactivateError } = await supabase
      .from('listing_boost_slots')
      .update({ is_active: false, ends_at: windowEnd ?? new Date().toISOString() })
      .in('id', ids);

    if (deactivateError) {
      console.error('[boosts] syncListingBoostSlots deactivate error', deactivateError);
      throw deactivateError;
    }

    removed = ids.length;
  }

  if (toAdd.length) {
    const payload = toAdd.map((slotId) => ({
      boost_id: boostId,
      slot_id: slotId,
      listing_id: listingId,
      starts_at: windowStart ?? new Date().toISOString(),
      ends_at: windowEnd ?? null,
      is_active: true,
    }));

    const { error: insertError } = await supabase.from('listing_boost_slots').insert(payload);
    if (insertError) {
      console.error('[boosts] syncListingBoostSlots insert error', insertError);
      throw insertError;
    }

    added = payload.length;
  }

  return { added, removed };
}
