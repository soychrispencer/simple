'use server';

import { cookies } from 'next/headers';
import { verifySessionToken } from '@simple/auth/server';
import { logError } from '@/lib/logger';
import { getDbPool } from '@/lib/server/db';

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; details?: string };

function cleanName(raw: string) {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

function normalizeForMatch(raw: string) {
  const cleaned = cleanName(raw);
  // Aproxima el normalize_catalog_name() (lower + unaccent + trim + collapse spaces)
  // usando NFD para remover diacríticos en JS.
  return cleaned
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

async function getRequestUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const cookieName = String(process.env.SESSION_COOKIE_NAME || 'sa_session').trim() || 'sa_session';
    const token = cookieStore.get(cookieName)?.value;
    if (!token) return null;
    const verified = verifySessionToken(token);
    if (!verified.valid || !verified.payload?.sub) return null;
    return verified.payload.sub;
  } catch {
    return null;
  }
}

export async function upsertBrand(params: { name: string }): Promise<ActionResult<{ id: string; name: string; is_verified: boolean }>> {
  try {
    const name = cleanName(params.name || '');
    if (!name || name.length < 2) {
      return { ok: false, error: 'Nombre de marca inválido' };
    }

    const db = getDbPool();

    // Si hay usuario autenticado, lo dejamos como created_by (trazabilidad)
    const userId = await getRequestUserId();

    const nameNorm = normalizeForMatch(name);

    const existing = await db.query(
      `SELECT id, name, COALESCE(is_verified, false) AS is_verified
       FROM brands
       WHERE regexp_replace(lower(trim(name)), '\s+', ' ', 'g') = $1
       LIMIT 1`,
      [nameNorm]
    );

    if (existing.rows[0]?.id) {
      const found = existing.rows[0] as any;
      return { ok: true, data: { id: found.id, name: found.name, is_verified: Boolean(found.is_verified) } };
    }

    try {
      const inserted = await db.query(
        `INSERT INTO brands (name, is_verified, created_by)
         VALUES ($1, false, $2)
         RETURNING id, name, COALESCE(is_verified, false) AS is_verified`,
        [name, userId]
      );
      const row = inserted.rows[0] as any;
      return {
        ok: true,
        data: { id: row.id, name: row.name, is_verified: Boolean(row.is_verified) },
      };
    } catch (insertError: any) {
      // Fallback por esquemas antiguos (sin created_by o por conflicto de nombre)
      if (String(insertError?.code || '') === '42703') {
        const fallback = await db.query(
          `INSERT INTO brands (name, is_verified)
           VALUES ($1, false)
           RETURNING id, name, COALESCE(is_verified, false) AS is_verified`,
          [name]
        );
        const row = fallback.rows[0] as any;
        return {
          ok: true,
          data: { id: row.id, name: row.name, is_verified: Boolean(row.is_verified) },
        };
      }

      const retry = await db.query(
        `SELECT id, name, COALESCE(is_verified, false) AS is_verified
         FROM brands
         WHERE regexp_replace(lower(trim(name)), '\s+', ' ', 'g') = $1
         LIMIT 1`,
        [nameNorm]
      );
      if (retry.rows[0]?.id) {
        const found = retry.rows[0] as any;
        return { ok: true, data: { id: found.id, name: found.name, is_verified: Boolean(found.is_verified) } };
      }
      return { ok: false, error: 'No pudimos crear la marca', details: insertError?.message };
    }
  } catch (error: any) {
    logError('[actions.upsertBrand] error', error);
    return { ok: false, error: 'Error interno del servidor', details: error?.message };
  }
}

export async function upsertModel(params: {
  brandId: string;
  vehicleTypeId: string;
  name: string;
}): Promise<ActionResult<{ id: string; name: string; is_verified: boolean }>> {
  try {
    const name = cleanName(params.name || '');
    const brandId = params.brandId;
    const vehicleTypeId = params.vehicleTypeId;

    if (!brandId) return { ok: false, error: 'Falta la marca' };
    if (!vehicleTypeId) return { ok: false, error: 'Falta el tipo de vehículo' };
    if (!name || name.length < 1) return { ok: false, error: 'Nombre de modelo inválido' };

    const db = getDbPool();
    const userId = await getRequestUserId();

    const nameNorm = normalizeForMatch(name);

    const existing = await db.query(
      `SELECT id, name, COALESCE(is_verified, false) AS is_verified
       FROM models
       WHERE brand_id = $1
         AND regexp_replace(lower(trim(name)), '\s+', ' ', 'g') = $2
       LIMIT 1`,
      [brandId, nameNorm]
    );

    if (existing.rows[0]?.id) {
      const found = existing.rows[0] as any;
      return { ok: true, data: { id: found.id, name: found.name, is_verified: Boolean(found.is_verified) } };
    }

    try {
      const inserted = await db.query(
        `INSERT INTO models (name, brand_id, vehicle_type_id, is_verified, created_by)
         VALUES ($1, $2, $3, false, $4)
         RETURNING id, name, COALESCE(is_verified, false) AS is_verified`,
        [name, brandId, vehicleTypeId, userId]
      );
      const row = inserted.rows[0] as any;
      return {
        ok: true,
        data: { id: row.id, name: row.name, is_verified: Boolean(row.is_verified) },
      };
    } catch (insertError: any) {
      if (String(insertError?.code || '') === '42703') {
        const fallback = await db.query(
          `INSERT INTO models (name, brand_id, vehicle_type_id, is_verified)
           VALUES ($1, $2, $3, false)
           RETURNING id, name, COALESCE(is_verified, false) AS is_verified`,
          [name, brandId, vehicleTypeId]
        );
        const row = fallback.rows[0] as any;
        return {
          ok: true,
          data: { id: row.id, name: row.name, is_verified: Boolean(row.is_verified) },
        };
      }

      const retry = await db.query(
        `SELECT id, name, COALESCE(is_verified, false) AS is_verified
         FROM models
         WHERE brand_id = $1
           AND regexp_replace(lower(trim(name)), '\s+', ' ', 'g') = $2
         LIMIT 1`,
        [brandId, nameNorm]
      );
      if (retry.rows[0]?.id) {
        const found = retry.rows[0] as any;
        return { ok: true, data: { id: found.id, name: found.name, is_verified: Boolean(found.is_verified) } };
      }
      return { ok: false, error: 'No pudimos crear el modelo', details: insertError?.message };
    }
  } catch (error: any) {
    logError('[actions.upsertModel] error', error);
    return { ok: false, error: 'Error interno del servidor', details: error?.message };
  }
}
