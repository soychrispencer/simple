'use server';

import { cookies } from 'next/headers';
import { verifySessionToken } from '@simple/auth/server';
import { logError } from '@/lib/logger';
import { getDbPool } from '@/lib/server/db';

const DEFAULT_DURATION_DAYS = 15;
type ActiveBoostSlot = { id: string; slotId: string };

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
  const ms = Math.max(0, days) * 24 * 60 * 60 * 1000;
  return new Date(start.getTime() + ms);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function resolveAuthenticatedUserId(expectedUserId?: string | null): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieName = String(process.env.SESSION_COOKIE_NAME || 'sa_session').trim() || 'sa_session';
  const token = cookieStore.get(cookieName)?.value;
  if (!token) return null;

  const verified = verifySessionToken(token);
  const userId = verified.valid ? verified.payload?.sub ?? null : null;
  if (!userId) return null;
  if (expectedUserId && expectedUserId !== userId) return null;
  return userId;
}

async function ensureBoost(params: {
  listingId: string;
  companyId: string | null;
  userId: string;
  startsAt: string;
  endsAt: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string; startsAt: string | null; endsAt: string | null }> {
  const db = getDbPool();
  const existing = await db.query(
    `SELECT id, starts_at, ends_at
     FROM listing_boosts
     WHERE listing_id = $1
       AND status = 'active'
     LIMIT 1`,
    [params.listingId]
  );

  if (existing.rows[0]?.id) {
    return {
      id: String(existing.rows[0].id),
      startsAt: existing.rows[0].starts_at ?? null,
      endsAt: existing.rows[0].ends_at ?? null,
    };
  }

  const inserted = await db.query(
    `INSERT INTO listing_boosts (listing_id, company_id, user_id, status, starts_at, ends_at, metadata)
     VALUES ($1, $2, $3, 'active', $4, $5, $6::jsonb)
     RETURNING id, starts_at, ends_at`,
    [
      params.listingId,
      params.companyId,
      params.userId,
      params.startsAt,
      params.endsAt,
      JSON.stringify(params.metadata || {}),
    ]
  );

  const row = inserted.rows[0] as any;
  if (!row?.id) {
    throw new Error('No se pudo crear boost');
  }

  return {
    id: String(row.id),
    startsAt: row.starts_at ?? null,
    endsAt: row.ends_at ?? null,
  };
}

async function syncBoostSlots(params: {
  listingId: string;
  boostId: string;
  slotIds: string[];
  startsAt: string;
  endsAt: string | null;
}): Promise<{ added: number; removed: number }> {
  const db = getDbPool();
  const normalized = Array.from(new Set((params.slotIds || []).filter(Boolean)));

  const currentRows = await db.query(
    `SELECT id, slot_id
     FROM listing_boost_slots
     WHERE listing_id = $1
       AND is_active = true`,
    [params.listingId]
  );

  const current: ActiveBoostSlot[] = currentRows.rows.map((row: any) => ({
    id: String(row.id),
    slotId: String(row.slot_id),
  }));

  const currentSlotIds = new Set(current.map((row: ActiveBoostSlot) => row.slotId));
  const toAdd = normalized.filter((slotId) => !currentSlotIds.has(slotId));
  const toRemove = current.filter((row: ActiveBoostSlot) => !normalized.includes(row.slotId));

  if (toRemove.length > 0) {
    await db.query(
      `UPDATE listing_boost_slots
       SET is_active = false, ends_at = $2
       WHERE id = ANY($1::uuid[])`,
      [toRemove.map((row: ActiveBoostSlot) => row.id), params.endsAt ?? new Date().toISOString()]
    );
  }

  for (const slotId of toAdd) {
    await db.query(
      `INSERT INTO listing_boost_slots (boost_id, slot_id, listing_id, starts_at, ends_at, is_active)
       VALUES ($1, $2, $3, $4, $5, true)`,
      [params.boostId, slotId, params.listingId, params.startsAt, params.endsAt]
    );
  }

  return { added: toAdd.length, removed: toRemove.length };
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

    const authUserId = await resolveAuthenticatedUserId(userId);
    if (!authUserId) {
      return { success: false, error: 'No autenticado' };
    }

    const db = getDbPool();
    const listingResult = await db.query(
      `SELECT id, user_id, company_id, company_profile_id
       FROM listings
       WHERE id = $1
       LIMIT 1`,
      [listingId]
    );

    const listing = listingResult.rows[0] as any;
    if (!listing?.id) {
      return {
        success: false,
        error: 'No pudimos validar la publicación',
        details: 'listing not found',
      };
    }

    if (String(listing.user_id) !== authUserId) {
      return { success: false, error: 'No tienes permiso para impulsar esta publicación' };
    }

    const now = new Date();
    const resolvedEndsAt =
      durationDays === null
        ? null
        : addDays(now, typeof durationDays === 'number' ? durationDays : DEFAULT_DURATION_DAYS).toISOString();

    const companyId = (listing.company_id ?? listing.company_profile_id ?? null) as string | null;

    const boost = await ensureBoost({
      listingId,
      companyId,
      userId: authUserId,
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

    const authUserId = await resolveAuthenticatedUserId(userId);
    if (!authUserId) {
      return { success: false, error: 'No autenticado' };
    }

    const db = getDbPool();
    const listingResult = await db.query(
      `SELECT id, user_id, public_profile_id, company_id, company_profile_id
       FROM listings
       WHERE id = $1
       LIMIT 1`,
      [listingId]
    );
    const listing = listingResult.rows[0] as any;

    if (!listing?.id) {
      return {
        success: false,
        error: 'No pudimos validar la publicación',
        details: 'listing not found',
      };
    }

    if (String(listing.user_id) !== authUserId) {
      return { success: false, error: 'No tienes permiso para modificar esta publicación' };
    }

    if (Array.isArray(activeSlotIds) && activeSlotIds.length > 0) {
      const slotRowsResult = await db.query(
        `SELECT id, key
         FROM boost_slots
         WHERE id = ANY($1::uuid[])`,
        [activeSlotIds]
      );
      const slotRows = slotRowsResult.rows as any[];

      const includesUserPage = slotRows.some((slot) => slot?.key === 'user_page');
      if (includesUserPage) {
        const publicProfileId = String(listing.public_profile_id || '');
        if (!publicProfileId) {
          return {
            success: false,
            error: 'Tu plan no incluye perfil público. Activa un plan de pago para impulsar en tu perfil de vendedor.',
          };
        }

        const profileResult = await db.query(
          `SELECT id, is_public, status
           FROM public_profiles
           WHERE id = $1
           LIMIT 1`,
          [publicProfileId]
        );
        const pp = profileResult.rows[0] as any;
        const isActivePublic = Boolean(pp?.is_public) && String(pp?.status || '') === 'active';
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

    const companyId = (listing.company_id ?? listing.company_profile_id ?? null) as string | null;
    const boost = await ensureBoost({
      listingId,
      companyId,
      userId: authUserId,
      startsAt: now.toISOString(),
      endsAt: windowEnd,
    });

    const result = await syncBoostSlots({
      listingId,
      boostId: boost.id,
      slotIds: activeSlotIds || [],
      startsAt: boost.startsAt ?? now.toISOString(),
      endsAt: boost.endsAt ?? windowEnd,
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
