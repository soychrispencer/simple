import { NextRequest, NextResponse } from 'next/server';
import mercadopago from '@/lib/mercadopago';
import { getSupabaseClient } from '@/lib/supabase/supabase';
import { logError, logInfo } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseClient();

    // Verificar que sea un webhook válido de MercadoPago
    const isValidWebhook = await verifyWebhookSignature(request, body);

    if (!isValidWebhook) {
      logError('Webhook signature verification failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, data } = body;

    if (type === 'payment') {
      const paymentId = data.id;

      // Obtener detalles del pago desde MercadoPago
      const payment = await mercadopago.payment.get(paymentId);

      if (payment.body.status === 'approved') {
        const externalReference = payment.body.external_reference;

        if (externalReference.startsWith('boost_')) {
          // Procesar boost pagado
          await processBoostPayment(externalReference, payment.body);
        } else if (externalReference.startsWith('subscription_')) {
          // Procesar suscripción pagada
          await processSubscriptionPayment(externalReference, payment.body);
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

async function verifyWebhookSignature(request: NextRequest, body: any): Promise<boolean> {
  // En producción, verificar la firma del webhook
  // Por ahora, solo verificamos que venga de MercadoPago
  const userAgent = request.headers.get('user-agent');
  return userAgent?.includes('MercadoPago') || false;
}

async function processBoostPayment(externalReference: string, paymentData: any) {
  const supabase = getSupabaseClient();
  const parts = externalReference.split('_');
  const [, vehicleId, slot, duration] = parts;

  // Calcular fecha de expiración
  const durationDays = parseInt(duration.split('_')[0]);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  // Crear registro de boost
  const { error } = await supabase
    .from('vehicle_boost_slots')
    .insert({
      vehicle_id: vehicleId,
      slot_key: slot,
      expires_at: expiresAt.toISOString(),
      payment_id: paymentData.id,
      payment_amount: paymentData.transaction_amount,
      payment_status: 'completed',
    });

  if (error) {
    logError('Error creando boost', error);
    throw error;
  }

  logInfo(`Boost creado: vehicle ${vehicleId}, slot ${slot}, expires ${expiresAt}`);
}

async function processSubscriptionPayment(externalReference: string, paymentData: any) {
  const supabase = getSupabaseClient();
  const parts = externalReference.split('_');
  const [, userId, plan] = parts;

  // Calcular fecha de expiración (1 mes)
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  // Actualizar o crear suscripción del usuario
  const { error } = await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      plan: plan,
      status: 'active',
      expires_at: expiresAt.toISOString(),
      payment_id: paymentData.id,
      payment_amount: paymentData.transaction_amount,
      auto_renew: true,
    });

  if (error) {
    logError('Error creando suscripción', error);
    throw error;
  }

  logInfo(`Suscripción creada: user ${userId}, plan ${plan}, expires ${expiresAt}`);
}