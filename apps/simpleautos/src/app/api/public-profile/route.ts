import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/server/db";
import { requireAuthUserId } from "@/lib/server/requireAuth";
import { logError } from "@/lib/logger";

function normalizeSlug(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "")
    .slice(0, 20);
}

function isPlaceholderSlug(value: string | null | undefined) {
  if (!value) return false;
  return /^u-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isValidSlug(value: string) {
  return /^[a-z0-9][a-z0-9._-]{2,19}$/.test(value) && !isPlaceholderSlug(value);
}

function asNullableText(value: unknown): string | null {
  const next = String(value ?? "").trim();
  return next ? next : null;
}

function asNullableUuid(value: unknown): string | null {
  const next = String(value ?? "").trim();
  if (!next) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(next)) {
    return next;
  }
  return null;
}

function parseRating(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

async function loadPublicProfileByOwner(userId: string) {
  const db = getDbPool();
  const result = await db.query(
    `
      SELECT
        pp.*,
        json_build_object('name', r.name) AS region,
        json_build_object('name', c.name) AS commune,
        CASE
          WHEN co.id IS NULL THEN NULL
          ELSE json_build_object(
            'id', co.id,
            'legal_name', co.legal_name,
            'name', co.legal_name,
            'billing_data', co.billing_data,
            'address_legal', co.address_legal,
            'email', co.billing_email,
            'billing_email', co.billing_email,
            'billing_phone', co.billing_phone,
            'region', json_build_object('name', cr.name),
            'commune', json_build_object('name', cc.name)
          )
        END AS company
      FROM public_profiles pp
      LEFT JOIN regions r ON r.id = pp.region_id
      LEFT JOIN communes c ON c.id = pp.commune_id
      LEFT JOIN companies co ON co.id = pp.company_id
      LEFT JOIN regions cr ON cr.id = co.region_id
      LEFT JOIN communes cc ON cc.id = co.commune_id
      WHERE pp.owner_profile_id = $1
      ORDER BY
        CASE WHEN pp.status = 'active' THEN 0 ELSE 1 END,
        pp.created_at ASC
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

async function ensureOwnerPublicProfile(userId: string) {
  const db = getDbPool();
  const existing = await loadPublicProfileByOwner(userId);
  if (existing?.id) return existing;

  const created = await db.query(
    `
      INSERT INTO public_profiles (owner_profile_id, profile_type, slug, status, is_public)
      VALUES ($1, 'business', $2, 'draft', false)
      RETURNING *
    `,
    [userId, `u-${userId}`]
  );
  return created.rows[0] || null;
}

async function loadSchedules(publicProfileId: string) {
  const db = getDbPool();
  const [weekly, specials] = await Promise.all([
    db.query(
      `
        SELECT id, weekday, start_time, end_time, closed
        FROM schedules
        WHERE public_profile_id = $1
      `,
      [publicProfileId]
    ),
    db.query(
      `
        SELECT id, date, start_time, end_time, closed
        FROM special_schedules
        WHERE public_profile_id = $1
        ORDER BY date ASC
      `,
      [publicProfileId]
    ),
  ]);

  return {
    weekly: weekly.rows || [],
    specials: specials.rows || [],
  };
}

async function loadReviews(publicProfileId: string) {
  const db = getDbPool();
  const result = await db.query(
    `
      SELECT id, rating, comment, created_at, reviewer_id, reviewed_profile_id
      FROM reviews
      WHERE reviewed_profile_id = $1
        AND coalesce(is_public, true) = true
      ORDER BY created_at DESC
      LIMIT 200
    `,
    [publicProfileId]
  );
  return result.rows || [];
}

async function loadListingContact(publicProfileId: string, ownerProfileId: string | null) {
  const db = getDbPool();
  const result = ownerProfileId
    ? await db.query(
        `
          SELECT id, title, contact_email, contact_phone, contact_whatsapp
          FROM listings
          WHERE status = 'published'
            AND coalesce(visibility, 'normal') <> 'hidden'
            AND (public_profile_id = $1 OR user_id = $2)
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [publicProfileId, ownerProfileId]
      )
    : await db.query(
        `
          SELECT id, title, contact_email, contact_phone, contact_whatsapp
          FROM listings
          WHERE status = 'published'
            AND coalesce(visibility, 'normal') <> 'hidden'
            AND public_profile_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [publicProfileId]
      );

  return result.rows[0] || null;
}

async function resolvePublicProfileByUsername(username: string) {
  const db = getDbPool();
  const candidate = String(username || "").trim();
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const placeholderRe = /^u-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

  const bySlug = await db.query(
    `
      SELECT
        pp.*,
        json_build_object('name', r.name) AS region,
        json_build_object('name', c.name) AS commune,
        CASE
          WHEN co.id IS NULL THEN NULL
          ELSE json_build_object(
            'id', co.id,
            'legal_name', co.legal_name,
            'name', co.legal_name,
            'billing_data', co.billing_data,
            'address_legal', co.address_legal,
            'email', co.billing_email,
            'billing_email', co.billing_email,
            'billing_phone', co.billing_phone,
            'region', json_build_object('name', cr.name),
            'commune', json_build_object('name', cc.name)
          )
        END AS company
      FROM public_profiles pp
      LEFT JOIN regions r ON r.id = pp.region_id
      LEFT JOIN communes c ON c.id = pp.commune_id
      LEFT JOIN companies co ON co.id = pp.company_id
      LEFT JOIN regions cr ON cr.id = co.region_id
      LEFT JOIN communes cc ON cc.id = co.commune_id
      WHERE pp.slug = $1
      LIMIT 1
    `,
    [candidate]
  );
  if (bySlug.rows[0]) return bySlug.rows[0];

  const maybeUserId = placeholderRe.test(candidate)
    ? candidate.match(placeholderRe)?.[1] || null
    : uuidRe.test(candidate)
      ? candidate
      : null;
  if (!maybeUserId) return null;

  const byOwner = await db.query(
    `
      SELECT
        pp.*,
        json_build_object('name', r.name) AS region,
        json_build_object('name', c.name) AS commune,
        CASE
          WHEN co.id IS NULL THEN NULL
          ELSE json_build_object(
            'id', co.id,
            'legal_name', co.legal_name,
            'name', co.legal_name,
            'billing_data', co.billing_data,
            'address_legal', co.address_legal,
            'email', co.billing_email,
            'billing_email', co.billing_email,
            'billing_phone', co.billing_phone,
            'region', json_build_object('name', cr.name),
            'commune', json_build_object('name', cc.name)
          )
        END AS company
      FROM public_profiles pp
      LEFT JOIN regions r ON r.id = pp.region_id
      LEFT JOIN communes c ON c.id = pp.commune_id
      LEFT JOIN companies co ON co.id = pp.company_id
      LEFT JOIN regions cr ON cr.id = co.region_id
      LEFT JOIN communes cc ON cc.id = co.commune_id
      WHERE pp.owner_profile_id = $1
      ORDER BY pp.created_at DESC
      LIMIT 1
    `,
    [maybeUserId]
  );
  return byOwner.rows[0] || null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = String(url.searchParams.get("mode") || "").trim();

    if (mode === "mine") {
      const auth = requireAuthUserId(request);
      if ("error" in auth) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
      }

      const profile = await loadPublicProfileByOwner(auth.userId);
      if (!profile?.id) {
        return NextResponse.json({ profile: null, schedules: [], specialSchedules: [], reviews: [] });
      }

      const [schedules, reviews, listingContact] = await Promise.all([
        loadSchedules(profile.id),
        loadReviews(profile.id),
        loadListingContact(profile.id, profile.owner_profile_id || null),
      ]);

      return NextResponse.json({
        profile,
        schedules: schedules.weekly,
        specialSchedules: schedules.specials,
        reviews,
        listingContact,
      });
    }

    if (mode === "username-check") {
      const rawUsername = String(url.searchParams.get("username") || "");
      const candidate = normalizeSlug(rawUsername);
      if (!candidate || !isValidSlug(candidate)) {
        return NextResponse.json({
          available: false,
          username: candidate,
          reason: "invalid",
        });
      }

      const auth = requireAuthUserId(request);
      const currentUserId = "error" in auth ? null : auth.userId;
      const db = getDbPool();
      const result = await db.query(
        `SELECT owner_profile_id FROM public_profiles WHERE slug = $1 LIMIT 1`,
        [candidate]
      );
      const owner = result.rows[0]?.owner_profile_id || null;
      const available = !owner || (currentUserId && owner === currentUserId);
      return NextResponse.json({
        available: Boolean(available),
        username: candidate,
      });
    }

    if (mode === "reviews") {
      const profileId = String(url.searchParams.get("profile_id") || "").trim();
      if (!profileId) {
        return NextResponse.json({ reviews: [] });
      }
      const reviews = await loadReviews(profileId);
      return NextResponse.json({ reviews });
    }

    const username = String(url.searchParams.get("username") || "").trim();
    if (!username) {
      return NextResponse.json({ error: "username requerido" }, { status: 400 });
    }

    const profile = await resolvePublicProfileByUsername(username);
    if (!profile?.id) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
    }

    const shouldIncrement = String(url.searchParams.get("increment") || "") === "1";
    if (shouldIncrement) {
      const db = getDbPool();
      await db.query(
        `UPDATE public_profiles SET visits = coalesce(visits, 0) + 1 WHERE id = $1`,
        [profile.id]
      );
      profile.visits = Number(profile.visits || 0) + 1;
    }

    const [schedules, reviews, listingContact] = await Promise.all([
      loadSchedules(profile.id),
      loadReviews(profile.id),
      loadListingContact(profile.id, profile.owner_profile_id || null),
    ]);

    return NextResponse.json({
      profile,
      schedules: schedules.weekly,
      specialSchedules: schedules.specials,
      reviews,
      listingContact,
    });
  } catch (error) {
    logError("[API /api/public-profile GET] Unexpected error", error);
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
    const action = String(payload.action || "").trim();
    const db = getDbPool();

    if (action === "save_slug") {
      const candidate = normalizeSlug(String(payload.username || ""));
      if (!candidate || !isValidSlug(candidate)) {
        return NextResponse.json({ error: "Nombre de usuario inválido" }, { status: 400 });
      }

      const existingBySlug = await db.query(
        `SELECT owner_profile_id FROM public_profiles WHERE slug = $1 LIMIT 1`,
        [candidate]
      );
      const owner = existingBySlug.rows[0]?.owner_profile_id || null;
      if (owner && owner !== auth.userId) {
        return NextResponse.json({ error: "Nombre de usuario no disponible" }, { status: 409 });
      }

      const ensured = await ensureOwnerPublicProfile(auth.userId);
      if (!ensured?.id) {
        return NextResponse.json({ error: "No se pudo crear el perfil público" }, { status: 500 });
      }

      await db.query(
        `UPDATE public_profiles SET slug = $2, updated_at = now() WHERE id = $1`,
        [ensured.id, candidate]
      );
      await db.query(
        `UPDATE profiles SET username = $2, updated_at = now() WHERE id = $1`,
        [auth.userId, candidate]
      );

      const updated = await loadPublicProfileByOwner(auth.userId);
      return NextResponse.json({
        ok: true,
        slug: candidate,
        publicProfileId: updated?.id || ensured.id,
        profile: updated || null,
      });
    }

    if (action === "save_public") {
      const ensured = await ensureOwnerPublicProfile(auth.userId);
      if (!ensured?.id) {
        return NextResponse.json({ error: "No se pudo preparar el perfil público" }, { status: 500 });
      }

      const candidateSlug = normalizeSlug(String(payload.username || ""));
      const slug = candidateSlug && isValidSlug(candidateSlug) ? candidateSlug : null;
      if (slug) {
        const existingBySlug = await db.query(
          `SELECT owner_profile_id FROM public_profiles WHERE slug = $1 LIMIT 1`,
          [slug]
        );
        const owner = existingBySlug.rows[0]?.owner_profile_id || null;
        if (owner && owner !== auth.userId) {
          return NextResponse.json({ error: "Nombre de usuario no disponible" }, { status: 409 });
        }
      }

      const updateFields = {
        slug: slug || undefined,
        public_name: asNullableText(payload.nombre_publico ?? payload.public_name),
        headline: asNullableText(payload.descripcion ?? payload.headline),
        bio: asNullableText(payload.descripcion ?? payload.bio),
        cover_url: payload.cover_url !== undefined ? asNullableText(payload.cover_url) : undefined,
        website: asNullableText(payload.pagina_web ?? payload.website),
        address: asNullableText(payload.direccion ?? payload.address),
        region_id: asNullableUuid(payload.region_id),
        commune_id: asNullableUuid(payload.commune_id),
        whatsapp: asNullableText(payload.whatsapp),
        whatsapp_type: asNullableText(payload.whatsapp_type) || "personal",
        facebook: asNullableText(payload.facebook),
        instagram: asNullableText(payload.instagram),
        linkedin: asNullableText(payload.linkedin),
        tiktok: asNullableText(payload.tiktok),
        twitter: asNullableText(payload.twitter),
        youtube: asNullableText(payload.youtube),
      } as Record<string, unknown>;

      const keys = Object.keys(updateFields).filter((key) => updateFields[key] !== undefined);
      const values = keys.map((key) => updateFields[key]);
      if (keys.length) {
        const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(", ");
        await db.query(
          `UPDATE public_profiles SET ${setClause}, updated_at = now() WHERE id = $1`,
          [ensured.id, ...values]
        );
      }

      if (slug || payload.whatsapp !== undefined) {
        await db.query(
          `
            UPDATE profiles
            SET
              username = COALESCE($2, username),
              whatsapp = $3,
              updated_at = now()
            WHERE id = $1
          `,
          [auth.userId, slug, asNullableText(payload.whatsapp)]
        );
      }

      const updated = await loadPublicProfileByOwner(auth.userId);
      return NextResponse.json({
        ok: true,
        slug: updated?.slug || slug || null,
        publicProfileId: updated?.id || ensured.id,
        profile: updated || null,
      });
    }

    if (action === "save_schedule") {
      const targetProfileId = asNullableUuid(payload.publicProfileId) || (await ensureOwnerPublicProfile(auth.userId))?.id;
      if (!targetProfileId) {
        return NextResponse.json({ error: "No se pudo resolver perfil público" }, { status: 500 });
      }

      const ownership = await db.query(
        `SELECT id FROM public_profiles WHERE id = $1 AND owner_profile_id = $2 LIMIT 1`,
        [targetProfileId, auth.userId]
      );
      if (!ownership.rows[0]?.id) {
        return NextResponse.json({ error: "Perfil público no permitido" }, { status: 403 });
      }

      const horario247 = Boolean(payload.horario247);
      const horarioRaw = (payload.horario && typeof payload.horario === "object")
        ? (payload.horario as Record<string, { inicio?: string; fin?: string; cerrado?: boolean }>)
        : {};
      const especialesRaw = Array.isArray(payload.horarioEspecial) ? payload.horarioEspecial : [];
      const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

      const weeklyRows = dias.map((dia) => {
        const item = horario247
          ? { inicio: "00:00", fin: "23:59", cerrado: false }
          : (horarioRaw[dia] || {});
        return {
          weekday: dia,
          start_time: asNullableText(item.inicio),
          end_time: asNullableText(item.fin),
          closed: Boolean(item.cerrado),
        };
      });

      const specialsSeen = new Set<string>();
      const specialsRows = especialesRaw
        .map((row: any) => ({
          date: String(row?.fecha || "").trim(),
          start_time: asNullableText(row?.inicio),
          end_time: asNullableText(row?.fin),
          closed: Boolean(row?.cerrado),
        }))
        .filter((row: { date: string; start_time: string | null; end_time: string | null; closed: boolean }) => {
          if (!row.date) return false;
          if (specialsSeen.has(row.date)) return false;
          specialsSeen.add(row.date);
          return true;
        });

      const client = await db.connect();
      try {
        await client.query("BEGIN");
        await client.query(`DELETE FROM schedules WHERE public_profile_id = $1`, [targetProfileId]);
        for (const row of weeklyRows) {
          await client.query(
            `
              INSERT INTO schedules (public_profile_id, weekday, start_time, end_time, closed)
              VALUES ($1, $2, $3, $4, $5)
            `,
            [targetProfileId, row.weekday, row.start_time, row.end_time, row.closed]
          );
        }

        await client.query(`DELETE FROM special_schedules WHERE public_profile_id = $1`, [targetProfileId]);
        for (const row of specialsRows) {
          await client.query(
            `
              INSERT INTO special_schedules (public_profile_id, date, start_time, end_time, closed)
              VALUES ($1, $2::date, $3, $4, $5)
            `,
            [targetProfileId, row.date, row.start_time, row.end_time, row.closed]
          );
        }

        await client.query(
          `
            UPDATE public_profiles
            SET
              preferences = jsonb_set(
                coalesce(preferences, '{}'::jsonb),
                '{horario247}',
                to_jsonb($2::boolean),
                true
              ),
              updated_at = now()
            WHERE id = $1
          `,
          [targetProfileId, horario247]
        );

        await client.query("COMMIT");
      } catch (transactionError) {
        await client.query("ROLLBACK");
        throw transactionError;
      } finally {
        client.release();
      }

      const schedules = await loadSchedules(targetProfileId);
      return NextResponse.json({
        ok: true,
        publicProfileId: targetProfileId,
        schedules: schedules.weekly,
        specialSchedules: schedules.specials,
      });
    }

    if (action === "add_review") {
      const reviewedProfileId = asNullableUuid(payload.profileId ?? payload.reviewedProfileId);
      const rating = parseRating(payload.rating);
      const comment = asNullableText(payload.comment);

      if (!reviewedProfileId || !rating) {
        return NextResponse.json({ error: "Datos de reseña inválidos" }, { status: 400 });
      }

      await db.query(
        `
          INSERT INTO reviews (reviewer_id, reviewed_profile_id, rating, comment, is_public)
          VALUES ($1, $2, $3, $4, true)
        `,
        [auth.userId, reviewedProfileId, rating, comment]
      );

      const reviews = await loadReviews(reviewedProfileId);
      return NextResponse.json({ ok: true, reviews });
    }

    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  } catch (error) {
    logError("[API /api/public-profile POST] Unexpected error", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
