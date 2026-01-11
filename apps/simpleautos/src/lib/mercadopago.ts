import { MercadoPagoConfig, Payment, Preference, PreApproval } from 'mercadopago';
import { SUBSCRIPTION_PLANS } from '@simple/config';
import { PRICING, getBoostPrice, type BoostSlotKey, type BoostDuration } from '@/lib/pricing';

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

export async function createMercadoPagoPreapproval(body: Record<string, any>) {
  const preapproval = new PreApproval(getMercadoPagoClient());
  return preapproval.create({ body } as any);
}

export async function getMercadoPagoPreapproval(id: string) {
  const preapproval = new PreApproval(getMercadoPagoClient());
  return preapproval.get({ id } as any);
}

export { PRICING };
export type { BoostSlotKey, BoostDuration };
export type SubscriptionPlan = 'pro' | 'business';

// Función helper para calcular precio de boost
export { getBoostPrice };

// Función helper para calcular precio de suscripción
export function getSubscriptionPrice(plan: SubscriptionPlan): number {
  return SUBSCRIPTION_PLANS[plan].price;
}

