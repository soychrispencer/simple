'use client';

import { useState } from 'react';
import { BoostSlotKey, BoostDuration, SubscriptionPlan } from '@/lib/mercadopago';
import { useSupabase } from '@/lib/supabase/useSupabase';

interface BoostPaymentData {
  slotId: string;
  slotKey: BoostSlotKey;
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
      const isJson = contentType.includes('application/json');
      const payload = isJson ? await response.json().catch(() => null) : null;

      if (!response.ok) {
        const serverMessage = payload?.error || payload?.details;
        const fallback = await response.text().catch(() => '');
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
      setError(err instanceof Error ? err.message : 'Error desconocido');
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

