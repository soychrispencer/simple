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
import { logError } from '@/lib/logger';

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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL no configurado' }, { status: 500 });
    }

    const backUrlSuccess = `${appUrl}/panel/mis-suscripciones?status=success`;
    const backUrlFailure = `${appUrl}/panel/mis-suscripciones?status=failure`;
    const backUrlPending = `${appUrl}/panel/mis-suscripciones?status=pending`;

    if (type === 'boost') {
      // Pago para boost
      const preference: any = {
        items: [],
        back_urls: {
          success: backUrlSuccess,
          failure: backUrlFailure,
          pending: backUrlPending,
        },
        auto_return: 'approved',
        notification_url: `${appUrl}/api/payments/webhook`,
      };
      const {
        slotId,
        slotKey,
        slot,
        duration,
        listingId,
        vehicleId,
        listingTitle,
        vehicleTitle,
        userId,
      } = data as {
        slotId?: string;
        slotKey?: BoostSlotKey;
        slot?: BoostSlotKey;
        duration: BoostDuration;
        listingId?: string;
        vehicleId?: string;
        listingTitle?: string;
        vehicleTitle?: string;
        userId?: string;
      };

      const resolvedSlotKey = (slotKey ?? slot) as BoostSlotKey | undefined;
      const resolvedListingId = listingId ?? vehicleId;
      const resolvedTitle = listingTitle ?? vehicleTitle ?? 'Publicación SimpleAutos';

      if (!resolvedSlotKey || !resolvedListingId) {
        return NextResponse.json(
          { error: 'Faltan datos para crear el pago de boost' },
          { status: 400 }
        );
      }

      const price = getBoostPrice(resolvedSlotKey, duration);

      preference.items.push({
        id: `boost_${resolvedListingId}_${resolvedSlotKey}_${duration}`,
        title: `Boost: ${resolvedTitle} - ${resolvedSlotKey.replace('_', ' ').toUpperCase()} - ${duration.replace('_', ' ')}`,
        description: `Destacado en ${resolvedSlotKey} por ${duration.replace('_', ' ')}`,
        quantity: 1,
        currency_id: 'CLP',
        unit_price: price,
      });

      preference.external_reference = `boost_${resolvedListingId}_${resolvedSlotKey}_${duration}_${Date.now()}`;
      preference.metadata = {
        type: 'boost',
        listing_id: resolvedListingId,
        listing_title: resolvedTitle,
        slot_id: slotId ?? null,
        slot_key: resolvedSlotKey,
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

  } catch (error) {
    logError('Error creando preferencia de pago', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

