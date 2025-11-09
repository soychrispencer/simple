'use client';

import { useState } from 'react';
import { BoostSlotKey, BoostDuration, SubscriptionPlan } from '@/lib/mercadopago';

interface PaymentData {
  type: 'boost' | 'subscription';
  data: any;
}

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

  const createBoostPayment = async (
    slot: BoostSlotKey,
    duration: BoostDuration,
    vehicleId: string,
    vehicleTitle: string
  ) => {
    await createPayment({
      type: 'boost',
      data: { slot, duration, vehicleId, vehicleTitle },
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