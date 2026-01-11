'use client';

import { useState } from 'react';
import type { BoostSlotKey, BoostDuration } from '@/lib/pricing';
import type { SubscriptionPlan } from '@/lib/mercadopago';
import { useSupabase } from '@/lib/supabase/useSupabase';

interface BoostPaymentData {
  slotId?: string;
  slotIds?: string[];
  slotKey?: BoostSlotKey;
  slotKeys?: BoostSlotKey[];
  duration: BoostDuration;
  listingId: string;
  listingTitle: string;
  userId: string;
}

interface SubscriptionPaymentData {
  plan: SubscriptionPlan;
  userId: string;
  userEmail: string;
}

type PaymentData =
  | { type: 'boost'; data: BoostPaymentData }
  | { type: 'subscription'; data: SubscriptionPaymentData };

export function useMercadoPago() {
  const supabase = useSupabase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPayment = async (paymentData: PaymentData) => {
    setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase?.auth?.getSession?.();
      const accessToken: string | undefined = sessionData?.session?.access_token;

      const response = await fetch('/api/payments/create', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(paymentData),
      });

      const contentType = response.headers.get('content-type') || '';
      const rawText = await response.text().catch(() => '');

      let payload: any = null;
      const looksLikeJson =
        contentType.includes('application/json') ||
        rawText.trim().startsWith('{') ||
        rawText.trim().startsWith('[');

      if (looksLikeJson && rawText) {
        payload = JSON.parse(rawText);
      }

      if (!response.ok) {
        const serverMessage = payload?.details
          ? `${payload?.error || 'Error'}: ${payload.details}`
          : payload?.error || payload?.details;
        const fallback = rawText;
        // Debug útil en dev para ver el motivo real del 500 (aunque el overlay muestre objetos como `{}`).
        // eslint-disable-next-line no-console
        console.error(
          '[useMercadoPago] Payment create failed',
          'status=',
          response.status,
          'url=',
          response.url,
          'contentType=',
          contentType,
          'rawText=',
          rawText?.slice?.(0, 2000) || '',
          'payload=',
          payload
        );
        // eslint-disable-next-line no-console
        console.error('[useMercadoPago] Payment create request body (debug):', paymentData);
        throw new Error(
          serverMessage || fallback || `Error creando pago (HTTP ${response.status})`
        );
      }

      const initPoint = payload?.init_point;
      if (!initPoint) {
        throw new Error('Respuesta inválida: falta init_point');
      }

      window.location.href = initPoint;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createBoostPayment = async (payload: BoostPaymentData) => {
    await createPayment({
      type: 'boost',
      data: payload,
    });
  };

  const createSubscriptionPayment = async (
    plan: SubscriptionPlan,
    userId: string,
    userEmail: string
  ) => {
    await createPayment({
      type: 'subscription',
      data: { plan, userId, userEmail },
    });
  };

  return {
    createBoostPayment,
    createSubscriptionPayment,
    loading,
    error,
  };
}

