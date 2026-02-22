import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { BoostDuration, getMercadoPagoPayment } from '@/lib/mercadopago';
import { getBoostCooldownHours } from '@/lib/boostRules';
import { logError, logInfo } from '@/lib/logger';
import { getDbPool } from '@/lib/server/db';

export const runtime = 'nodejs';

const DURATION_IN_DAYS = {
  '1_dia': 1,
  '3_dias': 3,
  '7_dias': 7,
  '15_dias': 15,
  '30_dias': 30,
  '90_dias': 90,
} as const satisfies Partial<Record<BoostDuration, number>>;

const DEFAULT_DURATION_DAYS = 7;

function addDays(base: Date, days: number) {
  const ms = Math.max(0, days) * 24 * 60 * 60 * 1000;
  return new Date(base.getTime() + ms);
}

function resolveDurationDays(duration?: string | null) {
  if (duration === 'indefinido') return null;
  if (duration && Object.prototype.hasOwnProperty.call(DURATION_IN_DAYS, duration)) {
    return (DURATION_IN_DAYS as any)[duration] as number;
  }
  const numeric = duration ? parseInt(duration, 10) : NaN;
  return Number.isFinite(numeric) ? numeric : DEFAULT_DURATION_DAYS;
}

function resolveWindowEnd(now: Date, duration?: string | null) {
  const days = resolveDurationDays(duration);
  if (days === null) return null;
  return addDays(now, days);
}

function parseLegacyBoostReference(reference: string): {
  listingId: string | null;
  slotKey: string | null;
  duration: string | null;
} {
  if (!reference?.startsWith('boost_')) {
    return { listingId: null, slotKey: null, duration: null };
  }
  const trimmed = reference.replace(/^boost_/, '');
  const parts = trimmed.split('_');
  if (parts.length < 4) return { listingId: null, slotKey: null, duration: null };
  parts.pop(); // timestamp
  const durationPartB = parts.pop();
  const durationPartA = parts.pop();
  if (!durationPartA || !durationPartB) return { listingId: null, slotKey: null, duration: null };
  const duration = `${durationPartA}_${durationPartB}`;
  const listingId = parts.shift() ?? null;
  const slotKey = parts.length ? parts.join('_') : null;
  return { listingId, slotKey, duration };
}

async function resolveSlotId(providedSlotId: string | null | undefined, slotKey: string | undefined, verticalId: string | null) {
  if (providedSlotId) return providedSlotId;
  if (!slotKey) return null;
  const db = getDbPool();
  const query = verticalId
    ? await db.query(
        `SELECT id
         FROM boost_slots
         WHERE key = $1 AND is_active = true AND vertical_id = $2
         LIMIT 1`,
        [slotKey, verticalId]
      )
    : await db.query(
        `SELECT id
         FROM boost_slots
         WHERE key = $1 AND is_active = true
         LIMIT 1`,
        [slotKey]
      );
  return query.rows[0]?.id ? String(query.rows[0].id) : null;
}

async function checkListingBoostCooldown(params: { listingId: string; slotId: string; cooldownHours: number }) {
  const db = getDbPool();
  const result = await db.query(
    `SELECT starts_at, ends_at, is_active
     FROM listing_boost_slots
     WHERE listing_id = $1 AND slot_id = $2
     ORDER BY starts_at DESC
     LIMIT 1`,
    [params.listingId, params.slotId]
  );
  const row = result.rows[0] as any;
  if (!row) return { allowed: true as const };

  const now = Date.now();
  const startsAt = row.starts_at ? new Date(row.starts_at).getTime() : null;
  const endsAt = row.ends_at ? new Date(row.ends_at).getTime() : null;

  if (row.is_active && !endsAt) return { allowed: false as const, reason: 'active' as const, endsAt: null };
  if (row.is_active && endsAt && endsAt > now) {
    return { allowed: false as const, reason: 'active' as const, endsAt: new Date(endsAt).toISOString() };
  }

  if (startsAt) {
    const next = startsAt + Math.max(0, params.cooldownHours) * 60 * 60 * 1000;
    if (now < next) {
      return { allowed: false as const, reason: 'cooldown' as const, nextAvailableAt: new Date(next).toISOString() };
    }
  }
  return { allowed: true as const };
}

async function verifyWebhookSignature(request: NextRequest): Promise<boolean> {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const signatureHeader = request.headers.get('x-signature');
  const requestId = request.headers.get('x-request-id');

  if (secret && signatureHeader && requestId) {
    const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, part) => {
      const [k, v] = part.split('=');
      if (k && v) acc[k.trim()] = v.trim();
      return acc;
    }, {});
    const ts = parts.ts;
    const v1 = parts.v1;
    if (ts && v1) {
      const payload = `${requestId}.${ts}`;
      const digest = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      const a = Buffer.from(digest);
      const b = Buffer.from(v1);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        return true;
      }
    }
  }

  if (!secret) return true;
  return process.env.NODE_ENV !== 'production';
}

async function ensureBoost(params: {
  listingId: string;
  companyId: string | null;
  userId: string | null;
  startsAt: string;
  endsAt: string | null;
  metadata: Record<string, unknown>;
}) {
  const db = getDbPool();
  const existing = await db.query(
    `SELECT id, starts_at, ends_at
     FROM listing_boosts
     WHERE listing_id = $1 AND status = 'active'
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
     VALUES ($1,$2,$3,'active',$4,$5,$6::jsonb)
     RETURNING id, starts_at, ends_at`,
    [params.listingId, params.companyId, params.userId, params.startsAt, params.endsAt, JSON.stringify(params.metadata)]
  );

  const row = inserted.rows[0] as any;
  return {
    id: String(row.id),
    startsAt: row.starts_at ?? null,
    endsAt: row.ends_at ?? null,
  };
}

async function syncSlots(params: {
  listingId: string;
  boostId: string;
  slotIds: string[];
  startsAt: string;
  endsAt: string | null;
}) {
  const db = getDbPool();
  const normalized = Array.from(new Set((params.slotIds || []).filter(Boolean)));
  const currentRows = await db.query(
    `SELECT id, slot_id
     FROM listing_boost_slots
     WHERE listing_id = $1 AND is_active = true`,
    [params.listingId]
  );

  const current = currentRows.rows.map((row: any) => ({ id: String(row.id), slotId: String(row.slot_id) }));
  const currentSet = new Set(current.map((row) => row.slotId));
  const toAdd = normalized.filter((slotId) => !currentSet.has(slotId));
  const toRemove = current.filter((row) => !normalized.includes(row.slotId));

  if (toRemove.length > 0) {
    await db.query(
      `UPDATE listing_boost_slots
       SET is_active = false, ends_at = $2
       WHERE id = ANY($1::uuid[])`,
      [toRemove.map((row) => row.id), params.endsAt ?? new Date().toISOString()]
    );
  }

  for (const slotId of toAdd) {
    await db.query(
      `INSERT INTO listing_boost_slots (boost_id, slot_id, listing_id, starts_at, ends_at, is_active)
       VALUES ($1,$2,$3,$4,$5,true)`,
      [params.boostId, slotId, params.listingId, params.startsAt, params.endsAt]
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const isValidWebhook = await verifyWebhookSignature(request);
    if (!isValidWebhook) {
      logError('Webhook signature verification failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, data } = body as any;
    if (type === 'payment') {
      const paymentId = data?.id;
      const payment: any = await getMercadoPagoPayment(paymentId);
      const paymentBody = payment?.body ?? payment;

      if (paymentBody?.status === 'approved') {
        const externalReference = String(paymentBody.external_reference || '');
        if (externalReference.startsWith('boost_')) {
          await processBoostPayment(externalReference, paymentBody);
        } else if (externalReference.startsWith('subscription_')) {
          await processSubscriptionPayment(externalReference, paymentBody);
        }
        logInfo(`Pago aprobado procesado: ${externalReference}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logError('Error procesando webhook', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

async function processBoostPayment(externalReference: string, paymentData: any) {
  const db = getDbPool();
  const metadata = paymentData.metadata ?? {};
  const legacy = parseLegacyBoostReference(externalReference);

  const listingId = metadata.listing_id ?? legacy.listingId ?? null;
  const slotKey = metadata.slot_key ?? legacy.slotKey ?? null;
  const slotKeysFromMetadata = Array.isArray(metadata.slot_keys) ? (metadata.slot_keys as any[]) : null;
  const durationKey = metadata.duration ?? legacy.duration ?? null;
  const slotIdFromMetadata = metadata.slot_id ?? null;
  const slotIdsFromMetadata = Array.isArray(metadata.slot_ids) ? (metadata.slot_ids as any[]) : null;
  const userId = metadata.user_id ?? null;

  const resolvedSlotKeys: string[] = slotKeysFromMetadata?.length
    ? slotKeysFromMetadata.map((k) => String(k)).filter(Boolean)
    : slotKey
      ? [String(slotKey)]
      : [];

  if (!listingId || resolvedSlotKeys.length === 0) {
    logError('Boost payment missing identifiers', { externalReference, metadata });
    return;
  }

  const listingRes = await db.query(
    `SELECT id, user_id, company_id, company_profile_id, vertical_id, public_profile_id
     FROM listings
     WHERE id = $1
     LIMIT 1`,
    [listingId]
  );
  const listing = listingRes.rows[0] as any;
  if (!listing?.id) {
    logError('Listing not found for boost payment', { listingId });
    return;
  }

  const resolvedSlotIds: string[] = [];
  const blocked: Array<{ slotKey: string; reason: string; endsAt?: string | null; nextAvailableAt?: string | null }> = [];

  for (let i = 0; i < resolvedSlotKeys.length; i++) {
    const key = resolvedSlotKeys[i];
    if (key === 'user_page') {
      const publicProfileId = String(listing.public_profile_id || '');
      if (!publicProfileId) {
        blocked.push({ slotKey: key, reason: 'no_public_profile' });
        continue;
      }
      const ppRes = await db.query(
        `SELECT id, is_public, status
         FROM public_profiles
         WHERE id = $1
         LIMIT 1`,
        [publicProfileId]
      );
      const pp = ppRes.rows[0] as any;
      const isActivePublic = Boolean(pp?.is_public) && String(pp?.status || '') === 'active';
      if (!isActivePublic) {
        blocked.push({ slotKey: key, reason: 'no_public_profile' });
        continue;
      }
    }

    const providedId = (slotIdsFromMetadata?.[i] ?? (i === 0 ? slotIdFromMetadata : null)) as string | null;
    const slotId = await resolveSlotId(providedId, key, listing.vertical_id ?? null);
    if (!slotId) {
      blocked.push({ slotKey: key, reason: 'slot_not_found' });
      continue;
    }

    const cooldown = await checkListingBoostCooldown({
      listingId,
      slotId,
      cooldownHours: getBoostCooldownHours(key as any),
    });

    if (!cooldown.allowed) {
      blocked.push({
        slotKey: key,
        reason: cooldown.reason,
        ...(cooldown.reason === 'active'
          ? { endsAt: (cooldown as any).endsAt ?? null }
          : { nextAvailableAt: (cooldown as any).nextAvailableAt ?? null }),
      });
      continue;
    }

    resolvedSlotIds.push(slotId);
  }

  if (resolvedSlotIds.length === 0) {
    logInfo('Boost payment had no applicable slots after validation', {
      listingId,
      externalReference,
      paymentId: paymentData?.id,
      blocked,
    });
    return;
  }

  const now = new Date();
  const endsAt = resolveWindowEnd(now, durationKey);
  const companyId = listing.company_id ?? listing.company_profile_id ?? null;
  const boost = await ensureBoost({
    listingId,
    companyId,
    userId: userId ?? listing.user_id ?? null,
    startsAt: now.toISOString(),
    endsAt: endsAt ? endsAt.toISOString() : null,
    metadata: {
      slotKeys: resolvedSlotKeys,
      duration: durationKey,
      source: 'mercadopago',
    },
  });

  await db.query(
    `UPDATE listing_boosts
     SET starts_at = $2,
         ends_at = $3,
         payment_id = $4,
         payment_amount = $5,
         payment_currency = $6,
         metadata = $7::jsonb
     WHERE id = $1`,
    [
      boost.id,
      now.toISOString(),
      endsAt ? endsAt.toISOString() : null,
      paymentData.id,
      paymentData.transaction_amount,
      paymentData.currency_id ?? 'CLP',
      JSON.stringify({
        slotKeys: resolvedSlotKeys,
        duration: durationKey,
        source: 'mercadopago',
        paymentId: paymentData.id,
        externalReference,
        blockedSlots: blocked,
      }),
    ]
  );

  await syncSlots({
    listingId,
    boostId: boost.id,
    slotIds: resolvedSlotIds,
    startsAt: now.toISOString(),
    endsAt: endsAt ? endsAt.toISOString() : null,
  });
}

async function processSubscriptionPayment(externalReference: string, paymentData: any) {
  const db = getDbPool();

  const verticalRes = await db.query(
    `SELECT id
     FROM verticals
     WHERE key IN ('vehicles','autos')
     ORDER BY key = 'vehicles' DESC
     LIMIT 1`
  );
  const vehiclesVerticalId = verticalRes.rows[0]?.id;
  if (!vehiclesVerticalId) {
    logError('No se pudo resolver vertical vehicles para suscripción');
    return;
  }

  const metadata = paymentData.metadata ?? {};
  const userId: string | undefined = metadata.user_id;
  const planKey: string | undefined = metadata.plan_key;

  const fallbackParts = externalReference.split('_');
  const fallbackUserId = fallbackParts[1];
  const fallbackPlanKey = fallbackParts[2];

  const resolvedUserId = userId || fallbackUserId;
  const resolvedPlanKey = planKey || fallbackPlanKey;
  if (!resolvedUserId || !resolvedPlanKey) {
    logError('Subscription payment missing identifiers', { externalReference, metadata });
    return;
  }

  const amount = Number(paymentData.transaction_amount ?? paymentData.total_paid_amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    logError('Subscription payment missing/invalid amount', { externalReference, amount });
    return;
  }

  const existingSubRes = await db.query(
    `SELECT id, current_period_end
     FROM subscriptions
     WHERE user_id = $1 AND vertical_id = $2 AND status = 'active'
     LIMIT 1`,
    [resolvedUserId, vehiclesVerticalId]
  );
  const now = new Date();
  const existingEnd = existingSubRes.rows[0]?.current_period_end ? new Date(existingSubRes.rows[0].current_period_end as any) : null;
  const periodStart = existingEnd && existingEnd > now ? existingEnd : now;
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const externalPaymentId = paymentData.id?.toString();
  if (!externalPaymentId) {
    logError('Subscription payment missing external payment id', { externalReference, paymentId: paymentData.id });
    return;
  }

  const planRes = await db.query(
    `SELECT id, plan_key, name, currency, price_monthly
     FROM subscription_plans
     WHERE plan_key = $1
       AND vertical_id = $2
       AND is_active = true
     LIMIT 1`,
    [resolvedPlanKey, vehiclesVerticalId]
  );
  const planRow = planRes.rows[0] as any;
  if (!planRow?.id) {
    logError('Subscription plan not found', { resolvedPlanKey });
    return;
  }

  const expectedAmount = Number(planRow.price_monthly ?? 0);
  if (Number.isFinite(expectedAmount) && expectedAmount > 0 && amount !== expectedAmount) {
    logError('Subscription payment amount mismatch', {
      externalReference,
      amount,
      expectedAmount,
      plan: resolvedPlanKey,
      paymentId: externalPaymentId,
    });
    return;
  }

  const metadataPayload = JSON.stringify({
    provider: 'mercadopago',
    plan_key: resolvedPlanKey,
    external_reference: externalReference,
    mercadopago_payment_id: externalPaymentId,
  });

  const upsertSub = await db.query(
    `INSERT INTO subscriptions
      (user_id, vertical_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end, metadata)
     VALUES ($1,$2,$3,'active',$4,$5,false,$6::jsonb)
     ON CONFLICT (user_id, vertical_id)
     DO UPDATE SET
       plan_id = EXCLUDED.plan_id,
       status = EXCLUDED.status,
       current_period_start = EXCLUDED.current_period_start,
       current_period_end = EXCLUDED.current_period_end,
       cancel_at_period_end = EXCLUDED.cancel_at_period_end,
       metadata = EXCLUDED.metadata
     RETURNING id`,
    [resolvedUserId, vehiclesVerticalId, planRow.id, periodStart.toISOString(), periodEnd.toISOString(), metadataPayload]
  );
  const subscriptionId = upsertSub.rows[0]?.id;
  if (!subscriptionId) return;

  const existingPayment = await db.query(`SELECT id FROM payments WHERE external_id = $1 LIMIT 1`, [externalPaymentId]);
  if (!existingPayment.rows[0]?.id) {
    await db.query(
      `INSERT INTO payments
       (user_id, subscription_id, amount, currency, status, payment_method, external_id, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        resolvedUserId,
        subscriptionId,
        amount,
        paymentData.currency_id ?? planRow.currency ?? 'CLP',
        paymentData.status ?? 'approved',
        paymentData.payment_type_id ?? paymentData.payment_method_id ?? 'mercadopago',
        externalPaymentId,
        paymentData.description ?? `Suscripción ${planRow.name}`,
      ]
    );
  }

  logInfo(`Suscripción registrada: user ${resolvedUserId}, plan ${resolvedPlanKey}, vence ${periodEnd.toISOString()}`);
}
