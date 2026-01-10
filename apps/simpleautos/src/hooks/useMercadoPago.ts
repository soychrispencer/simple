'use client';

import { useState } from 'react';
import { BoostSlotKey, BoostDuration, SubscriptionPlan } from '@/lib/mercadopago';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPayment = async (paymentData: PaymentData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error creando pago');
      }

      // Redirigir a MercadoPago
      window.location.href = data.init_point;

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

