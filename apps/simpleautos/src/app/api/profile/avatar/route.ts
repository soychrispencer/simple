import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/server/db";
import { requireAuthUserId } from "@/lib/server/requireAuth";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";

function asNullableText(value: unknown): string | null {
  const next = String(value ?? "").trim();
  return next ? next : null;
}

async function ensurePublicProfileForOwner(userId: string) {
  const db = getDbPool();
  const existing = await db.query(
    `SELECT id, avatar_url, slug FROM public_profiles WHERE owner_profile_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [userId]
  );
  if (existing.rows[0]?.id) {
    return existing.rows[0];
  }

  const username = await db.query(`SELECT username FROM profiles WHERE id = $1 LIMIT 1`, [userId]);
  const slug = asNullableText(username.rows[0]?.username) || `u-${userId}`;

  const created = await db.query(
    `INSERT INTO public_profiles (owner_profile_id, profile_type, slug, status, is_public)
     VALUES ($1, 'business', $2, 'draft', false)
     RETURNING id, avatar_url, slug`,
    [userId, slug]
  );

  return created.rows[0] || null;
}

export async function GET(request: Request) {
  try {
    const auth = requireAuthUserId(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const db = getDbPool();
    const [profile, publicProfile] = await Promise.all([
      db.query(`SELECT avatar_url FROM profiles WHERE id = $1 LIMIT 1`, [auth.userId]),
      db.query(`SELECT id, avatar_url FROM public_profiles WHERE owner_profile_id = $1 ORDER BY created_at ASC LIMIT 1`, [auth.userId]),
    ]);

    const avatarUrl = profile.rows[0]?.avatar_url || publicProfile.rows[0]?.avatar_url || null;
    return NextResponse.json({
      avatar_url: avatarUrl,
      profile_avatar_url: profile.rows[0]?.avatar_url || null,
      public_avatar_url: publicProfile.rows[0]?.avatar_url || null,
      public_profile_id: publicProfile.rows[0]?.id || null,
    });
  } catch (error) {
    logError("[API /api/profile/avatar GET] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuthUserId(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const avatarUrl = asNullableText(body.avatar_url);
    if (!avatarUrl) {
      return NextResponse.json({ error: "avatar_url requerida" }, { status: 400 });
    }

    const db = getDbPool();
    const [profileBefore, publicBefore] = await Promise.all([
      db.query(`SELECT avatar_url FROM profiles WHERE id = $1 LIMIT 1`, [auth.userId]),
      db.query(`SELECT id, avatar_url FROM public_profiles WHERE owner_profile_id = $1 ORDER BY created_at ASC LIMIT 1`, [auth.userId]),
    ]);

    await db.query(
      `UPDATE profiles SET avatar_url = $2, updated_at = now() WHERE id = $1`,
      [auth.userId, avatarUrl]
    );

    const publicProfile = publicBefore.rows[0]?.id
      ? publicBefore.rows[0]
      : await ensurePublicProfileForOwner(auth.userId);

    if (publicProfile?.id) {
      await db.query(
        `UPDATE public_profiles SET avatar_url = $2, updated_at = now() WHERE id = $1`,
        [publicProfile.id, avatarUrl]
      );
    }

    return NextResponse.json({
      ok: true,
      avatar_url: avatarUrl,
      previous_avatar_url: profileBefore.rows[0]?.avatar_url || publicBefore.rows[0]?.avatar_url || null,
      public_profile_id: publicProfile?.id || null,
    });
  } catch (error) {
    logError("[API /api/profile/avatar POST] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = requireAuthUserId(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const db = getDbPool();
    const [profileBefore, publicBefore] = await Promise.all([
      db.query(`SELECT avatar_url FROM profiles WHERE id = $1 LIMIT 1`, [auth.userId]),
      db.query(`SELECT id, avatar_url FROM public_profiles WHERE owner_profile_id = $1 ORDER BY created_at ASC LIMIT 1`, [auth.userId]),
    ]);

    await db.query(
      `UPDATE profiles SET avatar_url = NULL, updated_at = now() WHERE id = $1`,
      [auth.userId]
    );

    if (publicBefore.rows[0]?.id) {
      await db.query(
        `UPDATE public_profiles SET avatar_url = NULL, updated_at = now() WHERE id = $1`,
        [publicBefore.rows[0].id]
      );
    }

    return NextResponse.json({
      ok: true,
      previous_avatar_url: profileBefore.rows[0]?.avatar_url || publicBefore.rows[0]?.avatar_url || null,
    });
  } catch (error) {
    logError("[API /api/profile/avatar DELETE] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
