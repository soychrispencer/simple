import { NextRequest, NextResponse } from 'next/server';
import {
  createMercadoPagoPreference,
  createMercadoPagoPreapproval,
  getBoostPrice,
  getSubscriptionPrice,
  BoostSlotKey,
  BoostDuration,
  SubscriptionPlan,
} from '@/lib/mercadopago';
import { SUBSCRIPTION_PLANS } from '@simple/config';
import { getBoostCooldownHours } from '@/lib/boostRules';
import { getDbPool } from '@/lib/server/db';
import { requireAuthUserId } from '@/lib/server/requireAuth';

export const runtime = 'nodejs';

type PaidBoostDuration = Exclude<BoostDuration, 'indefinido'>;

type CooldownResult =
  | { allowed: true }
  | { allowed: false; reason: 'cooldown'; nextAvailableAt: string }
  | { allowed: false; reason: 'active'; endsAt: string | null };

async function checkListingBoostCooldown(params: {
  listingId: string;
  slotId: string;
  cooldownHours: number;
}): Promise<CooldownResult> {
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
  if (!row) return { allowed: true };

  const now = Date.now();
  const startsAt = row.starts_at ? new Date(row.starts_at).getTime() : null;
  const endsAt = row.ends_at ? new Date(row.ends_at).getTime() : null;

  if (row.is_active && !endsAt) return { allowed: false, reason: 'active', endsAt: null };
  if (row.is_active && endsAt && endsAt > now) {
    return { allowed: false, reason: 'active', endsAt: new Date(endsAt).toISOString() };
  }
  if (startsAt) {
    const next = startsAt + Math.max(0, params.cooldownHours) * 60 * 60 * 1000;
    if (now < next) {
      return { allowed: false, reason: 'cooldown', nextAvailableAt: new Date(next).toISOString() };
    }
  }

  return { allowed: true };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method Not Allowed', details: 'Use POST /api/payments/create' },
    { status: 405 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuthUserId(request);
    if ('error' in auth) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const type = String(body?.type || '').trim();
    const data = (body?.data || {}) as any;

    const rawAppUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl?.origin;
    if (!rawAppUrl) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_APP_URL no configurado', details: 'No se pudo inferir el origin de la request' },
        { status: 500 }
      );
    }
    const appUrl = /^https?:\/\//i.test(rawAppUrl) ? rawAppUrl : `https://${rawAppUrl}`;
    const makeBackUrl = (status: 'success' | 'failure' | 'pending') => {
      const u = new URL('/panel/mis-suscripciones', appUrl);
      u.searchParams.set('status', status);
      return u.toString();
    };

    if (type === 'boost') {
      const {
        slotKey,
        slotKeys,
        slot,
        duration,
        listingId,
        vehicleId,
        listingTitle,
        vehicleTitle,
      } = data as {
        slotKey?: BoostSlotKey;
        slotKeys?: BoostSlotKey[];
        slot?: BoostSlotKey;
        duration: PaidBoostDuration | 'indefinido';
        listingId?: string;
        vehicleId?: string;
        listingTitle?: string;
        vehicleTitle?: string;
      };

      if (duration === 'indefinido') {
        return NextResponse.json(
          { error: 'Duración inválida para pago', details: 'La opción indefinido es solo para el slot gratis (perfil vendedor).' },
          { status: 400 }
        );
      }

      const resolvedSlotKeys = (Array.isArray(slotKeys) && slotKeys.length > 0
        ? slotKeys
        : slotKey
          ? [slotKey]
          : slot
            ? [slot]
            : []) as BoostSlotKey[];
      const resolvedListingId = String(listingId || vehicleId || '').trim();
      const resolvedTitle = String(listingTitle || vehicleTitle || 'Publicación SimpleAutos');

      if (!resolvedSlotKeys.length || !resolvedListingId) {
        return NextResponse.json({ error: 'Faltan datos para crear el pago de boost' }, { status: 400 });
      }
      if (resolvedSlotKeys.includes('user_page' as any)) {
        return NextResponse.json(
          { error: 'Slot no válido para pago', details: 'El impulso en perfil vendedor es gratis y requiere perfil público (plan de pago).' },
          { status: 400 }
        );
      }

      const db = getDbPool();
      const listingRes = await db.query(
        `SELECT id, user_id, vertical_id
         FROM listings
         WHERE id = $1
         LIMIT 1`,
        [resolvedListingId]
      );
      const listing = listingRes.rows[0] as any;
      if (!listing?.id) {
        return NextResponse.json({ error: 'Publicación no encontrada o sin acceso' }, { status: 404 });
      }
      if (String(listing.user_id) !== auth.userId) {
        return NextResponse.json({ error: 'No tienes permiso para impulsar esta publicación' }, { status: 403 });
      }

      const slotsRes = await db.query(
        `SELECT id, key, price
         FROM boost_slots
         WHERE is_active = true
           AND vertical_id = $1
           AND key = ANY($2::text[])`,
        [listing.vertical_id, resolvedSlotKeys]
      );
      const slotRows = slotsRes.rows as any[];
      const slotIdByKey = new Map<string, string>();
      const slotPriceByKey = new Map<string, number>();
      for (const row of slotRows) {
        slotIdByKey.set(String(row.key), String(row.id));
        slotPriceByKey.set(String(row.key), Number(row.price ?? 0));
      }

      const resolvedSlotIds: string[] = [];
      for (const key of resolvedSlotKeys) {
        const id = slotIdByKey.get(String(key));
        if (!id) {
          return NextResponse.json({ error: `Slot de impulso inválido o no disponible (${key})` }, { status: 400 });
        }
        resolvedSlotIds.push(id);
      }

      for (let i = 0; i < resolvedSlotKeys.length; i++) {
        const key = resolvedSlotKeys[i];
        const sid = resolvedSlotIds[i];
        const cooldown = await checkListingBoostCooldown({
          listingId: resolvedListingId,
          slotId: sid,
          cooldownHours: getBoostCooldownHours(key as any),
        });
        if (!cooldown.allowed) {
          if (cooldown.reason === 'active') {
            return NextResponse.json(
              { error: 'Esta publicación ya está impulsada en este espacio', slot_key: key, ends_at: cooldown.endsAt },
              { status: 409 }
            );
          }
          return NextResponse.json(
            { error: 'Debes esperar antes de volver a impulsar esta publicación', slot_key: key, next_available_at: cooldown.nextAvailableAt },
            { status: 409 }
          );
        }
      }

      const paidSlotKeys = resolvedSlotKeys.filter((k) => (slotPriceByKey.get(String(k)) ?? 0) > 0);
      if (paidSlotKeys.length === 0) {
        return NextResponse.json(
          { error: 'No hay slots pagados para cobrar', details: 'Revisa boost_slots.price o la selección del usuario.' },
          { status: 400 }
        );
      }

      const preference: any = {
        items: [],
        back_urls: {
          success: makeBackUrl('success'),
          failure: makeBackUrl('failure'),
          pending: makeBackUrl('pending'),
        },
        ...( /^https:\/\//i.test(appUrl) ? { auto_return: 'approved' } : {} ),
        ...( /localhost|127\.0\.0\.1/i.test(request.nextUrl?.origin || '')
          ? {}
          : { notification_url: new URL('/api/payments/webhook', appUrl).toString() } ),
      };

      for (const key of paidSlotKeys) {
        const price = getBoostPrice(key, duration as PaidBoostDuration);
        preference.items.push({
          id: `boost_${resolvedListingId}_${key}_${duration}`,
          title: `Boost: ${resolvedTitle} - ${String(key).replace(/_/g, ' ').toUpperCase()} - ${String(duration).replace('_', ' ')}`,
          description: `Destacado en ${key} por ${String(duration).replace('_', ' ')}`,
          quantity: 1,
          currency_id: 'CLP',
          unit_price: price,
        });
      }

      preference.external_reference = `boost_${resolvedListingId}_${Date.now()}`;
      preference.metadata = {
        type: 'boost',
        listing_id: resolvedListingId,
        listing_title: resolvedTitle,
        slot_keys: resolvedSlotKeys,
        slot_ids: resolvedSlotIds,
        duration,
        user_id: auth.userId,
      };

      const result: any = await createMercadoPagoPreference(preference);
      const payload = result?.body ?? result;
      return NextResponse.json({
        id: payload?.id,
        init_point: payload?.init_point,
        sandbox_init_point: payload?.sandbox_init_point,
      });
    }

    if (type === 'subscription') {
      const { plan } = data as { plan: SubscriptionPlan };
      if (!plan) return NextResponse.json({ error: 'Falta plan' }, { status: 400 });
      if (plan === 'business') {
        return NextResponse.json({ error: 'Plan Empresa próximamente disponible' }, { status: 409 });
      }

      const db = getDbPool();
      const emailRes = await db.query(
        `SELECT COALESCE(alu.email, p.email) AS email
         FROM profiles p
         LEFT JOIN auth_local_users alu ON alu.profile_id = p.id
         WHERE p.id = $1
         LIMIT 1`,
        [auth.userId]
      );
      const payerEmail = String(emailRes.rows[0]?.email || '').trim();
      if (!payerEmail) {
        return NextResponse.json({ error: 'No se encontró email del usuario autenticado' }, { status: 400 });
      }

      const price = getSubscriptionPrice(plan);
      const planName = SUBSCRIPTION_PLANS[plan]?.name ?? plan;
      const externalReference = `subscription_${auth.userId}_${plan}`;
      const startDate = new Date();
      startDate.setMinutes(startDate.getMinutes() + 2);

      const preapprovalBody: any = {
        reason: `Plan ${planName} - Mensual`,
        external_reference: externalReference,
        payer_email: payerEmail,
        back_url: makeBackUrl('success'),
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          start_date: startDate.toISOString(),
          transaction_amount: price,
          currency_id: 'CLP',
        },
      };

      const result: any = await createMercadoPagoPreapproval(preapprovalBody);
      const payload = result?.body ?? result;
      return NextResponse.json({ id: payload?.id, init_point: payload?.init_point });
    }

    return NextResponse.json({ error: 'Tipo de pago no válido' }, { status: 400 });
  } catch (error: any) {
    console.error('Error creando preferencia de pago', error);
    const message = error instanceof Error ? error.message : String(error || 'Unknown error');
    return NextResponse.json(
      { error: 'Error interno del servidor', ...(process.env.NODE_ENV !== 'production' ? { details: message } : {}) },
      { status: 500 }
    );
  }
}
