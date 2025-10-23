import { MercadoPagoConfig } from 'mercadopago';

// Configurar MercadoPago
let mercadopago: any = null;

if (typeof window === 'undefined') {
  // Solo configurar en servidor
  mercadopago = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
  });
}

export default mercadopago;

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
  // Planes de suscripción mensuales
  subscriptions: {
    basic: 15000,    // 15.000 CLP/mes
    pro: 35000,      // 35.000 CLP/mes
    enterprise: 75000, // 75.000 CLP/mes
  },
} as const;

export type BoostSlotKey = 'home_main' | 'venta_tab' | 'arriendo_tab' | 'subasta_tab' | 'user_page';
export type BoostDuration = '1_dia' | '3_dias' | '7_dias' | '15_dias' | '30_dias';
export type SubscriptionPlan = 'basic' | 'pro' | 'enterprise';

// Función helper para calcular precio de boost
export function getBoostPrice(slot: BoostSlotKey, duration: BoostDuration): number {
  return PRICING.boosts[slot][duration];
}

// Función helper para calcular precio de suscripción
export function getSubscriptionPrice(plan: SubscriptionPlan): number {
  return PRICING.subscriptions[plan];
}