import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import {
  createMercadoPagoPreference,
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
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado', details: authError?.message }, { status: 401 });
    }

    const body = await request.json();
    const { type, data } = body;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL no configurado' }, { status: 500 });
    }

    const preference: any = {
      items: [],
      back_urls: {
        success: `${appUrl}/panel/mis-suscripciones?status=success`,
        failure: `${appUrl}/panel/mis-suscripciones?status=failure`,
        pending: `${appUrl}/panel/mis-suscripciones?status=pending`,
      },
      auto_return: 'approved',
      notification_url: `${appUrl}/api/payments/webhook`,
    };

    if (type === 'boost') {
      // Pago para boost
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

      preference.items.push({
        id: `subscription_${user.id}_${plan}`,
        title: `Plan ${planName} - Mensual`,
        description: `Suscripción ${planName} (mensual)`,
        quantity: 1,
        currency_id: 'CLP',
        unit_price: price,
      });

      preference.external_reference = `subscription_${user.id}_${plan}_${Date.now()}`;

      preference.metadata = {
        type: 'subscription',
        user_id: user.id,
        plan_key: plan,
      };

      // Para suscripciones, configurar pago recurrente
      preference.payer = {
        email: user.email,
      };

    } else {
      return NextResponse.json(
        { error: 'Tipo de pago no válido' },
        { status: 400 }
      );
    }

    // Crear preferencia en MercadoPago
    const result: any = await createMercadoPagoPreference(preference);
    const payload = result?.body ?? result;

    return NextResponse.json({
      id: payload?.id,
      init_point: payload?.init_point,
      sandbox_init_point: payload?.sandbox_init_point,
    });

  } catch (error) {
    logError('Error creando preferencia de pago', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

