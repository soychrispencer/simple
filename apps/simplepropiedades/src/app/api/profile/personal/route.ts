import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/server/db";
import { requireAuthUserId } from "@/lib/server/requireAuth";
import { logError } from "@/lib/logger";

function asNullableText(value: unknown): string | null {
  const next = String(value ?? "").trim();
  return next ? next : null;
}

function asNullableDate(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw;
}

export async function GET(request: Request) {
  try {
    const auth = requireAuthUserId(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const db = getDbPool();
    const result = await db.query(
      `
        SELECT
          id,
          email,
          first_name,
          last_name,
          phone,
          whatsapp,
          document_type,
          document_number,
          birth_date,
          gender,
          nationality,
          user_role
        FROM profiles
        WHERE id = $1
        LIMIT 1
      `,
      [auth.userId]
    );

    return NextResponse.json({ profile: result.rows[0] || null });
  } catch (error) {
    logError("[API /api/profile/personal GET props] Unexpected error", error);
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

    const values = {
      first_name: asNullableText(payload.first_name),
      last_name: asNullableText(payload.last_name),
      phone: asNullableText(payload.phone),
      whatsapp: asNullableText(payload.whatsapp),
      document_type: asNullableText(payload.document_type),
      document_number: asNullableText(payload.document_number),
      birth_date: asNullableDate(payload.birth_date),
      gender: asNullableText(payload.gender),
      nationality: asNullableText(payload.nationality),
      user_role: asNullableText(payload.user_role),
    };

    const updated = await db.query(
      `
        UPDATE profiles
        SET
          first_name = $2,
          last_name = $3,
          phone = $4,
          whatsapp = $5,
          document_type = $6,
          document_number = $7,
          birth_date = $8::date,
          gender = $9,
          nationality = $10,
          user_role = $11,
          updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [
        auth.userId,
        values.first_name,
        values.last_name,
        values.phone,
        values.whatsapp,
        values.document_type,
        values.document_number,
        values.birth_date,
        values.gender,
        values.nationality,
        values.user_role,
      ]
    );

    if (!updated.rows[0]) {
      const inserted = await db.query(
        `
          INSERT INTO profiles (
            id,
            first_name,
            last_name,
            phone,
            whatsapp,
            document_type,
            document_number,
            birth_date,
            gender,
            nationality,
            user_role
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9, $10, $11)
          RETURNING *
        `,
        [
          auth.userId,
          values.first_name,
          values.last_name,
          values.phone,
          values.whatsapp,
          values.document_type,
          values.document_number,
          values.birth_date,
          values.gender,
          values.nationality,
          values.user_role,
        ]
      );
      return NextResponse.json({ ok: true, profile: inserted.rows[0] || null });
    }

    return NextResponse.json({ ok: true, profile: updated.rows[0] || null });
  } catch (error) {
    logError("[API /api/profile/personal POST props] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
