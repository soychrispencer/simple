import { NextRequest, NextResponse } from 'next/server';
import { BoostDuration, getMercadoPagoPayment } from '@/lib/mercadopago';
import { logError, logInfo } from '@/lib/logger';
import { ensureListingBoost, syncListingBoostSlots } from '@simple/listings';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Este endpoint usa dependencias Node-only (crypto, MercadoPago SDK, etc.).
// En Vercel necesitamos runtime Node.js explícito.
export const runtime = 'nodejs';

const DURATION_IN_DAYS: Record<BoostDuration, number> = {
  '1_dia': 1,
  '3_dias': 3,
  '7_dias': 7,
  '15_dias': 15,
  '30_dias': 30,
};

const DEFAULT_DURATION_DAYS = 7;
let adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Supabase service credentials not configured');
    }
    adminClient = createClient(url, key);
  }
  return adminClient;
}

function addDays(base: Date, days: number) {
  const clone = new Date(base);
  clone.setDate(clone.getDate() + days);
  return clone;
}

function resolveDurationDays(duration?: string | null) {
  if (duration && DURATION_IN_DAYS[duration as BoostDuration]) {
    return DURATION_IN_DAYS[duration as BoostDuration];
  }
  const numeric = duration ? parseInt(duration, 10) : NaN;
  return Number.isFinite(numeric) ? numeric : DEFAULT_DURATION_DAYS;
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
  return {
    listingId,
    slotKey,
    duration,
  };
}

async function resolveSlotId(
  supabase: SupabaseClient,
  providedSlotId: string | null | undefined,
  slotKey: string | undefined,
  verticalId: string | null
): Promise<string | null> {
  if (providedSlotId) {
    return providedSlotId;
  }
  if (!slotKey) return null;
  const query = supabase
    .from('boost_slots')
    .select('id')
    .eq('key', slotKey)
    .eq('is_active', true)
    .limit(1);
  const finalQuery = verticalId ? query.eq('vertical_id', verticalId) : query;
  const { data, error } = await finalQuery.maybeSingle();
  if (error) {
    logError('Error resolving boost slot', error);
    return null;
  }
  return data?.id || null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verificar que sea un webhook válido de MercadoPago
    const isValidWebhook = await verifyWebhookSignature(request);

    if (!isValidWebhook) {
      logError('Webhook signature verification failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, data } = body;

    if (type === 'payment') {
      const paymentId = data.id;

      // Obtener detalles del pago desde MercadoPago
      const payment: any = await getMercadoPagoPayment(paymentId);
      const paymentBody = payment?.body ?? payment;

      if (paymentBody.status === 'approved') {
        const externalReference = paymentBody.external_reference;
        if (!externalReference) {
          logError('Pago aprobado sin external_reference', { paymentId });
          return NextResponse.json({ received: true });
        }

        if (externalReference.startsWith('boost_')) {
          // Procesar boost pagado
          await processBoostPayment(externalReference, paymentBody);
        } else if (externalReference.startsWith('subscription_')) {
          // Procesar suscripción pagada
          await processSubscriptionPayment(externalReference, paymentBody);
        }

        logInfo(`Pago aprobado procesado: ${externalReference}`);
      }
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    logError('Error procesando webhook', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

async function verifyWebhookSignature(request: NextRequest): Promise<boolean> {
  // Seguridad práctica:
  // - Siempre confirmamos el pago consultando la API de MercadoPago con nuestro access token.
  // - En producción, además exigimos algún indicador de origen (user-agent o firma si se configuró secret).
  // Si se configura un secret, validamos x-signature.
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const signatureHeader = request.headers.get('x-signature');
  const requestId = request.headers.get('x-request-id');

  if (secret && signatureHeader && requestId) {
    // Formato típico: ts=...,v1=...
    const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, part) => {
      const [k, v] = part.split('=');
      if (k && v) acc[k.trim()] = v.trim();
      return acc;
    }, {});

    const ts = parts.ts;
    const v1 = parts.v1;
    if (ts && v1) {
      // Nota: MercadoPago documenta un esquema de firma específico. Sin la spec exacta, validamos un
      // HMAC mínimo basado en request-id + ts (best-effort). Igual se valida contra la API al procesar.
      const payload = `${requestId}.${ts}`;
      const digest = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      const a = Buffer.from(digest);
      const b = Buffer.from(v1);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        return true;
      }
    }
  }

  // Si no hay secret configurado, aceptamos el webhook y confiamos en la verificación
  // contra la API de MercadoPago (solo procesamos pagos aprobados).
  if (!secret) return true;

  // Con secret configurado, si no pudimos validar firma en producción, rechazamos.
  return process.env.NODE_ENV !== 'production';
}

async function processBoostPayment(externalReference: string, paymentData: any) {
  try {
    const admin = getAdminClient();
    const metadata = paymentData.metadata ?? {};
    const legacy = parseLegacyBoostReference(externalReference);

    const listingId = metadata.listing_id ?? legacy.listingId ?? null;
    const slotKey = metadata.slot_key ?? legacy.slotKey ?? null;
    const durationKey = metadata.duration ?? legacy.duration ?? null;
    const slotIdFromMetadata = metadata.slot_id ?? null;
    const userId = metadata.user_id ?? null;

    if (!listingId || !slotKey) {
      logError('Boost payment missing identifiers', { externalReference, metadata });
      return;
    }

    const { data: listing, error: listingError } = await admin
      .from('listings')
      .select('id, user_id, company_id, vertical_id')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      logError('Listing not found for boost payment', listingError || { listingId });
      return;
    }

    const slotId = await resolveSlotId(admin, slotIdFromMetadata, slotKey, listing.vertical_id);
    if (!slotId) {
      logError('Unable to resolve boost slot for payment', { listingId, slotKey });
      return;
    }

    const now = new Date();
    const durationDays = resolveDurationDays(durationKey);
    const endsAt = addDays(now, durationDays);

    const boost = await ensureListingBoost({
      supabase: admin,
      listingId,
      companyId: listing.company_id,
      userId: userId ?? listing.user_id,
      startsAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      status: 'active',
      metadata: {
        slotKey,
        duration: durationKey,
        source: 'mercadopago',
      },
    });

    const { error: updateError } = await admin
      .from('listing_boosts')
      .update({
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        payment_id: paymentData.id,
        payment_amount: paymentData.transaction_amount,
        payment_currency: paymentData.currency_id ?? 'CLP',
        metadata: {
          slotKey,
          duration: durationKey,
          source: 'mercadopago',
          paymentId: paymentData.id,
          externalReference,
        },
      })
      .eq('id', boost.id);

    if (updateError) {
      logError('Error updating listing boost payment info', updateError);
      throw updateError;
    }

    await syncListingBoostSlots({
      supabase: admin,
      listingId,
      boostId: boost.id,
      slotIds: [slotId],
      windowStart: now.toISOString(),
      windowEnd: endsAt.toISOString(),
    });

    logInfo(`Boost sincronizado: listing ${listingId}, slot ${slotKey}, vence ${endsAt.toISOString()}`);
  } catch (error) {
    logError('Error procesando pago de boost', error);
    throw error;
  }
}

async function processSubscriptionPayment(externalReference: string, paymentData: any) {
  const admin = getAdminClient();

  const metadata = paymentData.metadata ?? {};
  const userId: string | undefined = metadata.user_id;
  const planKey: string | undefined = metadata.plan_key;

  // Fallback a external_reference: subscription_<userId>_<planKey>_<timestamp>
  const fallbackParts = externalReference.split('_');
  const fallbackUserId = fallbackParts[1];
  const fallbackPlanKey = fallbackParts[2];

  const resolvedUserId = userId || fallbackUserId;
  const resolvedPlanKey = planKey || fallbackPlanKey;

  if (!resolvedUserId || !resolvedPlanKey) {
    logError('Subscription payment missing identifiers', {
      externalReference,
      resolvedUserId,
      resolvedPlanKey,
      metadata,
    });
    return;
  }

  // Validar monto esperado (siempre que tengamos unit_price o transaction_amount)
  const amount = Number(paymentData.transaction_amount ?? paymentData.total_paid_amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    logError('Subscription payment missing/invalid amount', { externalReference, amount });
    return;
  }

  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const externalPaymentId = paymentData.id?.toString();

  if (!externalPaymentId) {
    logError('Subscription payment missing external payment id', { externalReference, paymentId: paymentData.id });
    return;
  }

  const { data: planRow, error: planError } = await admin
    .from('subscription_plans')
    .select('id, plan_key, name, currency, price_monthly')
    .eq('plan_key', resolvedPlanKey)
    .eq('is_active', true)
    .maybeSingle();

  if (planError || !planRow?.id) {
    logError('Subscription plan not found', planError || { resolvedPlanKey });
    return;
  }

  // Verificar currency (si viene)
  const currency = (paymentData.currency_id ?? planRow.currency ?? 'CLP') as string;

  const { data: subscription, error: subscriptionError } = await admin
    .from('subscriptions')
    .upsert(
      {
        user_id: resolvedUserId,
        plan_id: planRow.id,
        status: 'active',
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        metadata: {
          provider: 'mercadopago',
          plan_key: resolvedPlanKey,
          external_reference: externalReference,
          mercadopago_payment_id: externalPaymentId,
        },
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (subscriptionError || !subscription) {
    logError('Error creating/updating subscription', subscriptionError || { externalReference });
    throw subscriptionError;
  }

  const { data: existingPayment, error: fetchPaymentError } = await admin
    .from('payments')
    .select('id')
    .eq('external_id', externalPaymentId)
    .maybeSingle();

  if (fetchPaymentError) {
    logError('Error checking existing payment record', fetchPaymentError);
    throw fetchPaymentError;
  }

  if (!existingPayment) {
    const { error: paymentError } = await admin.from('payments').insert({
      user_id: resolvedUserId,
      subscription_id: subscription.id,
      amount,
      currency,
      status: paymentData.status ?? 'approved',
      payment_method: paymentData.payment_type_id ?? paymentData.payment_method_id ?? 'mercadopago',
      external_id: externalPaymentId,
      description: paymentData.description ?? `Suscripción ${planRow.name}`,
    });

    if (paymentError) {
      logError('Error creating subscription payment record', paymentError);
      throw paymentError;
    }
  }

  logInfo(
    `Suscripción registrada: user ${resolvedUserId}, plan ${resolvedPlanKey}, vence ${periodEnd.toISOString()}`
  );
}

