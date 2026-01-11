'use server';

import { ensureListingBoost, syncListingBoostSlots } from '@simple/listings';
import { createClient } from '@supabase/supabase-js';
import { logError } from '@/lib/logger';

const DEFAULT_DURATION_DAYS = 15;

function formatUnknownErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const message = typeof record.message === 'string' ? record.message : undefined;
    const details = typeof record.details === 'string' ? record.details : undefined;
    const hint = typeof record.hint === 'string' ? record.hint : undefined;
    const code = typeof record.code === 'string' ? record.code : undefined;

    return {
      message: message ?? 'Unknown error',
      code,
      details,
      hint,
    };
  }

  return { message: 'Unknown error' };
}

function addDays(start: Date, days: number) {
  // Duración exacta (days * 24h) para evitar discrepancias por DST.
  const ms = Math.max(0, days) * 24 * 60 * 60 * 1000;
  return new Date(start.getTime() + ms);
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Faltan credenciales de Supabase para acciones de boost');
  }
  return createClient(supabaseUrl, serviceKey);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function createVehicleBoost(
  listingId: string,
  userId: string,
  planId: number = 1,
  durationDays?: number | null
) {
  try {
    if (!listingId || !isUuid(listingId)) {
      return { success: false, error: 'ID de publicación inválido', details: String(listingId) };
    }

    const adminClient = getAdminClient();

    const { data: listing, error: listingError } = await adminClient
      .from('listings')
      .select('id, user_id, public_profile_id, public_profiles!listings_public_profile_id_fkey(company_id)')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      return {
        success: false,
        error: 'No pudimos validar la publicación',
        details: listingError?.message ?? 'listing not found',
      };
    }

    if (listing.user_id !== userId) {
      return { success: false, error: 'No tienes permiso para impulsar esta publicación' };
    }

    const now = new Date();
    const resolvedEndsAt =
      durationDays === null
        ? null
        : addDays(now, typeof durationDays === 'number' ? durationDays : DEFAULT_DURATION_DAYS).toISOString();

    const companyId = (listing as any)?.public_profiles?.company_id ?? null;

    const boost = await ensureListingBoost({
      supabase: adminClient,
      listingId,
      companyId,
      userId,
      startsAt: now.toISOString(),
      endsAt: resolvedEndsAt,
      metadata: { planId },
    });

    return {
      success: true,
      boost,
    };
  } catch (error) {
    logError('[actions.createVehicleBoost] error', error);
    const formatted = formatUnknownErrorDetails(error);
    return {
      success: false,
      error: 'Error interno del servidor',
      details: formatted.message,
      meta: formatted,
    };
  }
}

export async function updateVehicleBoostSlots(
  listingId: string,
  userId: string,
  activeSlotIds: string[],
  durationDays?: number | null
) {
  try {
    if (!listingId || !isUuid(listingId)) {
      return { success: false, error: 'ID de publicación inválido', details: String(listingId) };
    }

    const adminClient = getAdminClient();

    const { data: listing, error: listingError } = await adminClient
      .from('listings')
      .select('id, user_id, public_profile_id, public_profiles!listings_public_profile_id_fkey(company_id)')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      return {
        success: false,
        error: 'No pudimos validar la publicación',
        details: listingError?.message ?? 'listing not found',
      };
    }

    if (listing.user_id !== userId) {
      return { success: false, error: 'No tienes permiso para modificar esta publicación' };
    }

    // Defensa: user_page requiere que el perfil público esté realmente activo y visible.
    if (Array.isArray(activeSlotIds) && activeSlotIds.length > 0) {
      const { data: slotRows, error: slotRowsError } = await adminClient
        .from('boost_slots')
        .select('id, key')
        .in('id', activeSlotIds as any);

      if (slotRowsError) {
        return { success: false, error: 'No pudimos validar los espacios destacados seleccionados' };
      }

      const includesUserPage = (slotRows || []).some((s: any) => s?.key === 'user_page');
      if (includesUserPage) {
        const publicProfileId = (listing as any)?.public_profile_id as string | null | undefined;
        if (!publicProfileId) {
          return {
            success: false,
            error: 'Tu plan no incluye perfil público. Activa un plan de pago para impulsar en tu perfil de vendedor.',
          };
        }

        const { data: ppRow, error: ppError } = await adminClient
          .from('public_profiles')
          .select('id, is_public, status')
          .eq('id', publicProfileId)
          .maybeSingle();

        if (ppError) {
          return { success: false, error: 'No pudimos validar tu perfil público' };
        }

        const isActivePublic = Boolean((ppRow as any)?.is_public) && String((ppRow as any)?.status) === 'active';
        if (!isActivePublic) {
          return {
            success: false,
            error: 'Tu plan no incluye perfil público activo. Activa Pro para impulsar en tu perfil de vendedor.',
          };
        }
      }
    }

    const now = new Date();
    const windowEnd =
      durationDays === null
        ? null
        : addDays(now, typeof durationDays === 'number' ? durationDays : DEFAULT_DURATION_DAYS).toISOString();

    const companyId = (listing as any)?.public_profiles?.company_id ?? null;

    const boost = await ensureListingBoost({
      supabase: adminClient,
      listingId,
      companyId,
      userId,
      startsAt: now.toISOString(),
      endsAt: windowEnd,
    });

    const result = await syncListingBoostSlots({
      supabase: adminClient,
      listingId,
      boostId: boost.id,
      slotIds: activeSlotIds,
      windowStart: boost.startsAt ?? now.toISOString(),
      windowEnd: boost.endsAt ?? windowEnd,
    });

    return {
      success: true,
      addedCount: result.added,
      removedCount: result.removed,
    };
  } catch (error) {
    logError('[actions.updateVehicleBoostSlots] error', error);
    const formatted = formatUnknownErrorDetails(error);
    return {
      success: false,
      error: 'Error interno del servidor',
      details: formatted.message,
      meta: formatted,
    };
  }
}


