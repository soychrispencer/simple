import type { SupabaseClient } from '@supabase/supabase-js';

export type BoostCooldownCheckResult =
  | { allowed: true }
  | { allowed: false; reason: 'cooldown'; nextAvailableAt: string }
  | { allowed: false; reason: 'active'; endsAt: string | null };

export async function checkListingBoostCooldown(params: {
  supabase: SupabaseClient;
  listingId: string;
  slotId: string;
  cooldownHours: number;
}): Promise<BoostCooldownCheckResult> {
  const { supabase, listingId, slotId, cooldownHours } = params;

  const { data, error } = await supabase
    .from('listing_boost_slots')
    .select('starts_at, ends_at, is_active')
    .eq('listing_id', listingId)
    .eq('slot_id', slotId)
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return { allowed: true };
  }

  const now = Date.now();
  const startsAt = data.starts_at ? new Date(data.starts_at).getTime() : null;
  const endsAt = data.ends_at ? new Date(data.ends_at).getTime() : null;

  // Si no hay ends_at pero sigue activo, consideramos el boost activo de forma indefinida.
  if (data.is_active && !endsAt) {
    return { allowed: false, reason: 'active', endsAt: null };
  }

  if (endsAt && endsAt > now && data.is_active) {
    return { allowed: false, reason: 'active', endsAt: new Date(endsAt).toISOString() };
  }

  if (startsAt) {
    const cooldownMs = Math.max(0, cooldownHours) * 60 * 60 * 1000;
    const next = startsAt + cooldownMs;
    if (now < next) {
      return { allowed: false, reason: 'cooldown', nextAvailableAt: new Date(next).toISOString() };
    }
  }

  return { allowed: true };
}
