import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/server/db";
import { requireAuthUserId } from "@/lib/server/requireAuth";
import { logError } from "@/lib/logger";

function asNullableText(value: unknown): string | null {
  const next = String(value ?? "").trim();
  return next.length ? next : null;
}

function asNullableUuid(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw) ? raw : null;
}

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const raw = String(value ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

async function fetchAddressesByUser(userId: string) {
  const db = getDbPool();
  const result = await db.query(
    `
      SELECT
        pa.id,
        pa.type,
        pa.label,
        pa.line1,
        pa.line2,
        pa.country,
        pa.region_id,
        pa.commune_id,
        pa.postal_code,
        pa.is_default,
        pa.created_at,
        r.name AS region_name,
        c.name AS commune_name
      FROM profile_addresses pa
      LEFT JOIN regions r ON r.id = pa.region_id
      LEFT JOIN communes c ON c.id = pa.commune_id
      WHERE pa.profile_id = $1
      ORDER BY pa.is_default DESC, pa.created_at DESC NULLS LAST
    `,
    [userId]
  );

  return result.rows || [];
}

export async function GET(request: Request) {
  try {
    const auth = requireAuthUserId(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const addresses = await fetchAddressesByUser(auth.userId);
    return NextResponse.json({ addresses });
  } catch (error) {
    logError("[API /api/profile/addresses GET autos] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuthUserId(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({} as Record<string, unknown>));
    const db = getDbPool();

    const type = asNullableText(payload.type) ?? "home";
    const line1 = asNullableText(payload.line1);
    const country = asNullableText(payload.country);
    const regionId = asNullableUuid(payload.region_id);
    const communeId = asNullableUuid(payload.commune_id);
    const isDefault = asBoolean(payload.is_default);

    if (!line1 || !country || !regionId || !communeId) {
      return NextResponse.json({ error: "Campos obligatorios incompletos" }, { status: 400 });
    }

    if (isDefault) {
      await db.query(`UPDATE profile_addresses SET is_default = false WHERE profile_id = $1`, [auth.userId]);
    }

    await db.query(
      `
        INSERT INTO profile_addresses (
          profile_id,
          type,
          label,
          line1,
          line2,
          country,
          region_id,
          commune_id,
          postal_code,
          is_default
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::uuid, $8::uuid, $9, $10)
      `,
      [
        auth.userId,
        type,
        asNullableText(payload.label),
        line1,
        asNullableText(payload.line2),
        country,
        regionId,
        communeId,
        asNullableText(payload.postal_code),
        isDefault,
      ]
    );

    const addresses = await fetchAddressesByUser(auth.userId);
    return NextResponse.json({ ok: true, addresses });
  } catch (error) {
    logError("[API /api/profile/addresses POST autos] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = requireAuthUserId(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({} as Record<string, unknown>));
    const id = asNullableUuid(payload.id);
    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const db = getDbPool();
    const owner = await db.query(
      `SELECT id FROM profile_addresses WHERE id = $1::uuid AND profile_id = $2 LIMIT 1`,
      [id, auth.userId]
    );
    if (!owner.rows[0]?.id) {
      return NextResponse.json({ error: "Dirección no encontrada" }, { status: 404 });
    }

    const type = asNullableText(payload.type) ?? "home";
    const line1 = asNullableText(payload.line1);
    const country = asNullableText(payload.country);
    const regionId = asNullableUuid(payload.region_id);
    const communeId = asNullableUuid(payload.commune_id);
    const isDefault = asBoolean(payload.is_default);

    if (!line1 || !country || !regionId || !communeId) {
      return NextResponse.json({ error: "Campos obligatorios incompletos" }, { status: 400 });
    }

    if (isDefault) {
      await db.query(
        `UPDATE profile_addresses SET is_default = false WHERE profile_id = $1 AND id <> $2::uuid`,
        [auth.userId, id]
      );
    }

    await db.query(
      `
        UPDATE profile_addresses
        SET
          type = $3,
          label = $4,
          line1 = $5,
          line2 = $6,
          country = $7,
          region_id = $8::uuid,
          commune_id = $9::uuid,
          postal_code = $10,
          is_default = $11,
          updated_at = now()
        WHERE id = $1::uuid AND profile_id = $2
      `,
      [
        id,
        auth.userId,
        type,
        asNullableText(payload.label),
        line1,
        asNullableText(payload.line2),
        country,
        regionId,
        communeId,
        asNullableText(payload.postal_code),
        isDefault,
      ]
    );

    const addresses = await fetchAddressesByUser(auth.userId);
    return NextResponse.json({ ok: true, addresses });
  } catch (error) {
    logError("[API /api/profile/addresses PATCH autos] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = requireAuthUserId(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({} as Record<string, unknown>));
    const id = asNullableUuid(payload.id);
    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const db = getDbPool();
    const deleted = await db.query(
      `DELETE FROM profile_addresses WHERE id = $1::uuid AND profile_id = $2 RETURNING id`,
      [id, auth.userId]
    );

    if (!deleted.rows[0]?.id) {
      return NextResponse.json({ error: "Dirección no encontrada" }, { status: 404 });
    }

    const addresses = await fetchAddressesByUser(auth.userId);
    return NextResponse.json({ ok: true, addresses });
  } catch (error) {
    logError("[API /api/profile/addresses DELETE autos] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
