import { NextRequest, NextResponse } from 'next/server';
import mercadopago from '@/lib/mercadopago';
import { getBoostPrice, getSubscriptionPrice, BoostSlotKey, BoostDuration, SubscriptionPlan } from '@/lib/mercadopago';
import { logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!mercadopago) {
      return NextResponse.json(
        { error: 'MercadoPago no configurado' },
        { status: 500 }
      );
    }

    const preference: any = {
      items: [],
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/panel/facturacion?status=success`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/panel/facturacion?status=failure`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/panel/facturacion?status=pending`,
      },
      auto_return: 'approved',
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook`,
    };

    if (type === 'boost') {
      // Pago para boost
      const { slot, duration, vehicleId, vehicleTitle } = data as {
        slot: BoostSlotKey;
        duration: BoostDuration;
        vehicleId: string;
        vehicleTitle: string;
      };

      const price = getBoostPrice(slot, duration);

      preference.items.push({
        id: `boost_${vehicleId}_${slot}_${duration}`,
        title: `Boost: ${vehicleTitle} - ${slot.replace('_', ' ').toUpperCase()} - ${duration.replace('_', ' ')}`,
        description: `Destacado en ${slot} por ${duration.replace('_', ' ')}`,
        quantity: 1,
        currency_id: 'CLP',
        unit_price: price,
      });

      preference.external_reference = `boost_${vehicleId}_${slot}_${duration}_${Date.now()}`;

    } else if (type === 'subscription') {
      // Pago para suscripción
      const { plan, userId, userEmail } = data as {
        plan: SubscriptionPlan;
        userId: string;
        userEmail: string;
      };

      const price = getSubscriptionPrice(plan);

      preference.items.push({
        id: `subscription_${userId}_${plan}`,
        title: `Suscripción ${plan.toUpperCase()} - Mensual`,
        description: `Plan ${plan} - Renovación automática mensual`,
        quantity: 1,
        currency_id: 'CLP',
        unit_price: price,
      });

      preference.external_reference = `subscription_${userId}_${plan}_${Date.now()}`;

      // Para suscripciones, configurar pago recurrente
      preference.payer = {
        email: userEmail,
      };

    } else {
      return NextResponse.json(
        { error: 'Tipo de pago no válido' },
        { status: 400 }
      );
    }

    // Crear preferencia en MercadoPago
    const result = await mercadopago.preferences.create(preference);

    return NextResponse.json({
      id: result.body.id,
      init_point: result.body.init_point,
      sandbox_init_point: result.body.sandbox_init_point,
    });

  } catch (error) {
    logError('Error creando preferencia de pago', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}