import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
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
import { checkListingBoostCooldown } from '@/lib/boostCooldown';

// Este endpoint usa dependencias Node-only (MercadoPago SDK, winston, etc.).
// En Vercel puede intentar ejecutarse como Edge si no se especifica runtime.
export const runtime = 'nodejs';

export async function OPTIONS() {
  // Respuesta segura para cualquier preflight o verificación.
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  // Algunos clientes/herramientas pueden golpear este endpoint con GET.
  // Respondemos con JSON para evitar fallos de parseo en el frontend.
  return NextResponse.json(
    { error: 'Method Not Allowed', details: 'Use POST /api/payments/create' },
    { status: 405 }
  );
}

export async function POST(request: NextRequest) {
  try {
    // 1) Intentar auth por cookies (auth-helpers)
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any });
    const cookieAuth = await supabase.auth.getUser();
    let user = cookieAuth.data.user;
    let authError = cookieAuth.error;

    // 2) Fallback: auth por Bearer token (cuando la sesión vive en localStorage)
    if (!user) {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
      const match = authHeader?.match(/^Bearer\s+(.+)$/i);
      const token = match?.[1];

      if (token) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !anonKey) {
          return NextResponse.json(
            { error: 'Supabase no configurado (public env vars)' },
            { status: 500 }
          );
        }

        const bearerClient = createClient(url, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });

        const bearerAuth = await bearerClient.auth.getUser(token);
        user = bearerAuth.data.user;
        authError = bearerAuth.error;
      }
    }

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado', details: authError?.message }, { status: 401 });
    }

    const body = await request.json();
    const { type, data } = body;

    const rawAppUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl?.origin;
    if (!rawAppUrl) {
      return NextResponse.json(
        {
          error: 'NEXT_PUBLIC_APP_URL no configurado',
          details: 'No se pudo inferir el origin de la request',
        },
        { status: 500 }
      );
    }

    // Asegurar que el base URL sea absoluto con esquema.
    // Si NEXT_PUBLIC_APP_URL viene sin http(s), MercadoPago puede rechazar back_urls.
    const appUrl = /^https?:\/\//i.test(rawAppUrl)
      ? rawAppUrl
      : `https://${rawAppUrl}`;

    const makeBackUrl = (status: 'success' | 'failure' | 'pending') => {
      const u = new URL('/panel/mis-suscripciones', appUrl);
      u.searchParams.set('status', status);
      return u.toString();
    };

    const backUrlSuccess = makeBackUrl('success');
    const backUrlFailure = makeBackUrl('failure');
    const backUrlPending = makeBackUrl('pending');

    if (type === 'boost') {
      // Pago para boost
      const isLocalhost = (() => {
        const origin = request.nextUrl?.origin || '';
        return /localhost|127\.0\.0\.1/i.test(origin);
      })();

      const isHttpsAppUrl = /^https:\/\//i.test(appUrl);

      const preference: any = {
        items: [],
        back_urls: {
          success: backUrlSuccess,
          failure: backUrlFailure,
          pending: backUrlPending,
        },
        // MercadoPago suele requerir back_urls válidas (y a veces https) cuando auto_return está presente.
        // En localhost / http evitamos setear auto_return para no gatillar invalid_auto_return.
        ...(isHttpsAppUrl ? { auto_return: 'approved' } : {}),
        ...(isLocalhost
          ? {}
          : { notification_url: new URL('/api/payments/webhook', appUrl).toString() }),
      };
      const {
        slotId,
        slotIds,
        slotKey,
        slotKeys,
        slot,
        duration,
        listingId,
        vehicleId,
        listingTitle,
        vehicleTitle,
        userId,
      } = data as {
        slotId?: string;
        slotIds?: string[];
        slotKey?: BoostSlotKey;
        slotKeys?: BoostSlotKey[];
        slot?: BoostSlotKey;
        duration: BoostDuration;
        listingId?: string;
        vehicleId?: string;
        listingTitle?: string;
        vehicleTitle?: string;
        userId?: string;
      };

      if (duration === 'indefinido') {
        return NextResponse.json(
          { error: 'Duración inválida para pago', details: 'La opción indefinido es solo para el slot gratis (perfil vendedor).' },
          { status: 400 }
        );
      }

      const resolvedSlotKey = (slotKey ?? slot) as BoostSlotKey | undefined;
      const resolvedSlotKeys = (Array.isArray(slotKeys) && slotKeys.length > 0
        ? slotKeys
        : resolvedSlotKey
        ? [resolvedSlotKey]
        : []) as BoostSlotKey[];
      const resolvedListingId = listingId ?? vehicleId;
      const resolvedTitle = listingTitle ?? vehicleTitle ?? 'Publicación SimpleAutos';

      if (!resolvedSlotKeys.length || !resolvedListingId) {
        return NextResponse.json(
          { error: 'Faltan datos para crear el pago de boost' },
          { status: 400 }
        );
      }

      if (resolvedSlotKeys.includes('user_page' as any)) {
        return NextResponse.json(
          { error: 'Slot no válido para pago', details: 'El impulso en perfil vendedor es gratis y requiere perfil público (plan de pago).' },
          { status: 400 }
        );
      }

      // Validar que el listing exista y sea del usuario (o que RLS permita verlo).
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('id, user_id, vertical_id')
        .eq('id', resolvedListingId)
        .maybeSingle();

      if (listingError) {
        return NextResponse.json(
          { error: 'No se pudo validar la publicación', details: listingError.message },
          { status: 400 }
        );
      }

      if (!listing?.id) {
        return NextResponse.json(
          { error: 'Publicación no encontrada o sin acceso' },
          { status: 404 }
        );
      }

      if (listing.user_id !== user.id) {
        return NextResponse.json(
          { error: 'No tienes permiso para impulsar esta publicación' },
          { status: 403 }
        );
      }

      // Resolver slots y validar que existan para el vertical.
      const { data: slotRows, error: slotError } = await supabase
        .from('boost_slots')
        .select('id, key, price')
        .eq('is_active', true)
        .eq('vertical_id', listing.vertical_id)
        .in('key', resolvedSlotKeys as any);

      if (slotError) {
        return NextResponse.json(
          { error: 'No se pudo validar el/los slot(s) de impulso', details: slotError.message },
          { status: 400 }
        );
      }

      const slotIdByKey = new Map<string, string>();
      const slotPriceByKey = new Map<string, number>();
      for (const r of slotRows || []) {
        if (r?.key && r?.id) slotIdByKey.set(String(r.key), String(r.id));
        slotPriceByKey.set(String(r.key), Number((r as any).price ?? 0));
      }

      const resolvedSlotIds: string[] = [];
      for (const k of resolvedSlotKeys) {
        const id = slotIdByKey.get(k);
        if (!id) {
          return NextResponse.json(
            { error: `Slot de impulso inválido o no disponible (${k})` },
            { status: 400 }
          );
        }
        resolvedSlotIds.push(id);
      }

      // Cooldown por publicación+slot: 24h (se valida para todos los slots seleccionados)
      try {
        for (let i = 0; i < resolvedSlotKeys.length; i++) {
          const key = resolvedSlotKeys[i];
          const sid = resolvedSlotIds[i];
          const cooldownHours = getBoostCooldownHours(key);
          const cooldown = await checkListingBoostCooldown({
            supabase: supabase as any,
            listingId: resolvedListingId,
            slotId: sid,
            cooldownHours,
          });

          if (!cooldown.allowed) {
            if (cooldown.reason === 'active') {
              return NextResponse.json(
                {
                  error: 'Esta publicación ya está impulsada en este espacio',
                  slot_key: key,
                  ends_at: cooldown.endsAt,
                },
                { status: 409 }
              );
            }
            return NextResponse.json(
              {
                error: 'Debes esperar antes de volver a impulsar esta publicación',
                slot_key: key,
                next_available_at: cooldown.nextAvailableAt,
              },
              { status: 409 }
            );
          }
        }
      } catch (e: any) {
        return NextResponse.json(
          { error: 'No se pudo validar el cooldown del impulso', details: e?.message },
          { status: 400 }
        );
      }

      // Items: solo cobramos slots "pagados" (según tabla boost_slots.price). Igual guardamos todos los slots en metadata.
      const paidSlotKeys: BoostSlotKey[] = resolvedSlotKeys.filter((k) => (slotPriceByKey.get(k) ?? 0) > 0);

      if (paidSlotKeys.length === 0) {
        return NextResponse.json(
          { error: 'No hay slots pagados para cobrar', details: 'Revisa boost_slots.price o la selección del usuario.' },
          { status: 400 }
        );
      }

      for (const key of paidSlotKeys) {
        let price: number;
        try {
          price = getBoostPrice(key, duration);
        } catch (e: any) {
          return NextResponse.json(
            { error: 'Precio no configurado', details: e?.message || String(e) },
            { status: 400 }
          );
        }
        preference.items.push({
          id: `boost_${resolvedListingId}_${key}_${duration}`,
          title: `Boost: ${resolvedTitle} - ${key.replace(/_/g, ' ').toUpperCase()} - ${duration.replace('_', ' ')}`,
          description: `Destacado en ${key} por ${duration.replace('_', ' ')}`,
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
        user_id: user.id,
      };

      // Crear preferencia en MercadoPago (pago único)
      const result: any = await createMercadoPagoPreference(preference);
      const payload = result?.body ?? result;

      return NextResponse.json({
        id: payload?.id,
        init_point: payload?.init_point,
        sandbox_init_point: payload?.sandbox_init_point,
      });

    } else if (type === 'subscription') {
      // Pago para suscripción
      const { plan } = data as {
        plan: SubscriptionPlan;
      };

      if (!plan) {
        return NextResponse.json({ error: 'Falta plan' }, { status: 400 });
      }

      // El plan Empresa aún no está disponible.
      if (plan === 'business') {
        return NextResponse.json(
          { error: 'Plan Empresa próximamente disponible' },
          { status: 409 }
        );
      }

      const price = getSubscriptionPrice(plan);
      const planName = SUBSCRIPTION_PLANS[plan]?.name ?? plan;

      // Suscripción recurrente mensual (MercadoPago PreApproval)
      // Nota: a diferencia de Preference, el PreApproval no soporta notification_url por request;
      // para renovaciones automáticas debes tener el webhook configurado a nivel de cuenta en MercadoPago.
      const externalReference = `subscription_${user.id}_${plan}`;
      const startDate = new Date();
      startDate.setMinutes(startDate.getMinutes() + 2);

      const preapprovalBody: any = {
        reason: `Plan ${planName} - Mensual`,
        external_reference: externalReference,
        payer_email: user.email,
        back_url: backUrlSuccess,
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

      return NextResponse.json({
        id: payload?.id,
        init_point: payload?.init_point,
      });

    } else {
      return NextResponse.json(
        { error: 'Tipo de pago no válido' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    // Importante: este endpoint debe ser ultra-resiliente.
    // Evitamos depender de un logger con sanitizers/transports que pueda fallar al cargar.
    console.error('Error creando preferencia de pago', error);

    const safeStringify = (value: any) => {
      try {
        const seen = new WeakSet();
        return JSON.stringify(
          value,
          (_key, val) => {
            if (typeof val === 'bigint') return val.toString();
            if (typeof val === 'object' && val !== null) {
              if (seen.has(val)) return '[Circular]';
              seen.add(val);
            }
            return val;
          },
          2
        );
      } catch {
        try {
          return String(value);
        } catch {
          return '[Unserializable]';
        }
      }
    };

    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : safeStringify(error);

    const devDetails = (() => {
      if (process.env.NODE_ENV === 'production') return undefined;
      const parts: string[] = [];
      if (message) parts.push(message);

      const status =
        (error as any)?.status ||
        (error as any)?.statusCode ||
        (error as any)?.response?.status ||
        (error as any)?.response?.data?.status;
      if (status) parts.push(`status=${status}`);

      const cause = (error as any)?.cause;
      if (cause) parts.push(`cause=${typeof cause === 'string' ? cause : safeStringify(cause)}`);

      const mpResponse =
        (error as any)?.response?.data ??
        (error as any)?.response?.body ??
        (error as any)?.response;
      if (mpResponse) parts.push(`mp_response=${safeStringify(mpResponse)}`);

      if (error && typeof error === 'object') {
        const errName = (error as any)?.name;
        if (errName) parts.push(`name=${errName}`);
      }

      return parts.filter(Boolean).join(' | ') || undefined;
    })();

    const upstreamStatus = Number(
      (error as any)?.status ||
        (error as any)?.statusCode ||
        (error as any)?.response?.status ||
        (error as any)?.response?.data?.status
    );
    const statusToReturn =
      Number.isFinite(upstreamStatus) && upstreamStatus >= 400 && upstreamStatus < 500
        ? upstreamStatus
        : 500;

    return NextResponse.json(
      { error: 'Error interno del servidor', ...(devDetails ? { details: devDetails } : {}) },
      { status: statusToReturn }
    );
  }
}

