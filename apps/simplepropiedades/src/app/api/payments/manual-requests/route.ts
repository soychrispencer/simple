import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeSubscriptionPlanId } from "@simple/config";
import { getDbPool } from "@/lib/server/db";
import { resolveRequestToken } from "@/lib/server/sessionCookie";
import { verifySessionToken } from "@simple/auth/server";

const BodySchema = z.object({
  requestType: z
    .enum(["subscription_upgrade", "featured_listing", "urgent_listing", "custom"])
    .default("subscription_upgrade"),
  planKey: z.enum(["pro", "business", "enterprise"]).optional(),
  listingId: z.string().uuid().optional(),
  proofNote: z.string().trim().max(2000).optional(),
  amount: z.coerce.number().min(0).max(999999999).optional(),
  currency: z.string().trim().min(3).max(10).optional()
});

function requireAuth(request: Request): { userId: string } | { error: string } {
  const token = resolveRequestToken(request);
  if (!token) return { error: "No autenticado" };
  const verified = verifySessionToken(token);
  if (!verified.valid || !verified.payload?.sub) return { error: "No autenticado" };
  return { userId: verified.payload.sub };
}

async function resolveVerticalId(db: ReturnType<typeof getDbPool>) {
  const result = await db.query(`SELECT id FROM verticals WHERE key IN ('properties','propiedades') LIMIT 1`);
  return String(result.rows[0]?.id || "");
}

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const db = getDbPool();
    const verticalId = await resolveVerticalId(db);
    if (!verticalId) return NextResponse.json({ ok: true, data: [] });

    const result = await db.query(
      `SELECT id, created_at, request_type, plan_key, listing_id, amount, currency, status, proof_note, admin_note, reviewed_at
       FROM manual_payment_requests
       WHERE user_id = $1 AND vertical_id = $2
       ORDER BY created_at DESC
       LIMIT 20`,
      [auth.userId, verticalId]
    );

    return NextResponse.json({ ok: true, data: result.rows || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const parsed = BodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const db = getDbPool();
    const verticalId = await resolveVerticalId(db);
    if (!verticalId) {
      return NextResponse.json({ error: "Vertical properties no configurada" }, { status: 500 });
    }

    const payload = parsed.data;
    let planKey: string | null = null;
    let amount = Number(payload.amount ?? 0);
    let currency = String(payload.currency || "CLP").trim().toUpperCase();

    if (payload.requestType === "subscription_upgrade") {
      if (!payload.planKey) {
        return NextResponse.json({ error: "Debes indicar un plan" }, { status: 400 });
      }
      planKey = normalizeSubscriptionPlanId(payload.planKey);

      const plan = await db.query(
        `SELECT plan_key, price_monthly, currency
         FROM subscription_plans
         WHERE vertical_id = $1 AND is_active = true AND plan_key = ANY($2::text[])
         LIMIT 1`,
        [verticalId, planKey === "enterprise" ? ["enterprise", "business"] : ["pro"]]
      );

      const row = plan.rows[0] as any;
      if (!row?.plan_key) {
        return NextResponse.json({ error: "No encontramos un plan activo para esta vertical" }, { status: 404 });
      }
      planKey = String(row.plan_key);
      amount = Number(row.price_monthly || 0);
      currency = String(row.currency || "CLP");
    }

    const inserted = await db.query(
      `INSERT INTO manual_payment_requests (
         user_id, vertical_id, request_type, plan_key, listing_id, amount, currency, status, proof_note, metadata
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9)
       RETURNING id, created_at, request_type, plan_key, listing_id, amount, currency, status, proof_note, admin_note, reviewed_at`,
      [
        auth.userId,
        verticalId,
        payload.requestType,
        planKey,
        payload.listingId || null,
        amount,
        currency,
        payload.proofNote || null,
        { source: "simplepropiedades", app: "simplepropiedades" }
      ]
    );

    return NextResponse.json({ ok: true, data: inserted.rows[0] || null }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error interno" }, { status: 500 });
  }
}
