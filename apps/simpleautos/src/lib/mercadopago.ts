import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { SUBSCRIPTION_PLANS } from '@simple/config';

let mpClient: MercadoPagoConfig | null = null;

export function getMercadoPagoClient(): MercadoPagoConfig {
  if (typeof window !== 'undefined') {
    throw new Error('MercadoPago client is server-only');
  }
  if (!mpClient) {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN is not configured');
    }
    mpClient = new MercadoPagoConfig({ accessToken });
  }
  return mpClient;
}

export async function createMercadoPagoPreference(body: Record<string, any>) {
  const preference = new Preference(getMercadoPagoClient());
  return preference.create({ body } as any);
}

export async function getMercadoPagoPayment(id: string | number) {
  const payment = new Payment(getMercadoPagoClient());
  const numericId = typeof id === 'string' ? Number(id) : id;
  return payment.get({ id: numericId } as any);
}

// Configuración de precios (en pesos chilenos)
export const PRICING = {
  // Boosts por slot y duración
  boosts: {
    home_main: {
      '1_dia': 5000,
      '3_dias': 12000,
      '7_dias': 25000,
      '15_dias': 45000,
      '30_dias': 80000,
    },
    venta_tab: {
      '1_dia': 3000,
      '3_dias': 7000,
      '7_dias': 15000,
      '15_dias': 28000,
      '30_dias': 50000,
    },
    arriendo_tab: {
      '1_dia': 3000,
      '3_dias': 7000,
      '7_dias': 15000,
      '15_dias': 28000,
      '30_dias': 50000,
    },
    subasta_tab: {
      '1_dia': 2500,
      '3_dias': 6000,
      '7_dias': 12000,
      '15_dias': 22000,
      '30_dias': 40000,
    },
    user_page: {
      '1_dia': 2000,
      '3_dias': 5000,
      '7_dias': 10000,
      '15_dias': 18000,
      '30_dias': 30000,
    },
  },
} as const;

export type BoostSlotKey = 'home_main' | 'venta_tab' | 'arriendo_tab' | 'subasta_tab' | 'user_page';
export type BoostDuration = '1_dia' | '3_dias' | '7_dias' | '15_dias' | '30_dias';
export type SubscriptionPlan = 'pro' | 'business';

// Función helper para calcular precio de boost
export function getBoostPrice(slot: BoostSlotKey, duration: BoostDuration): number {
  return PRICING.boosts[slot][duration];
}

// Función helper para calcular precio de suscripción
export function getSubscriptionPrice(plan: SubscriptionPlan): number {
  return SUBSCRIPTION_PLANS[plan].price;
}

