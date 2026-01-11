// Este archivo es CLIENT-SAFE (no importar SDKs Node-only aquí).

export type PaidBoostDuration = '1_dia' | '3_dias' | '7_dias' | '15_dias' | '30_dias' | '90_dias';
export type FreeProfileDuration = '7_dias' | '15_dias' | '30_dias' | 'indefinido';
export type BoostDuration = PaidBoostDuration | FreeProfileDuration;

export const PRICING = {
  boosts: {
    home_main: {
      '1_dia': 990,
      '3_dias': 1990,
      '7_dias': 3490,
      '15_dias': 5490,
      '30_dias': 8990,
      '90_dias': 19990,
    },
    venta_tab: {
      '1_dia': 790,
      '3_dias': 1590,
      '7_dias': 2990,
      '15_dias': 4490,
      '30_dias': 7490,
      '90_dias': 16990,
    },
    arriendo_tab: {
      '1_dia': 790,
      '3_dias': 1590,
      '7_dias': 2990,
      '15_dias': 4490,
      '30_dias': 7490,
      '90_dias': 16990,
    },
    subasta_tab: {
      '1_dia': 690,
      '3_dias': 1390,
      '7_dias': 2490,
      '15_dias': 3990,
      '30_dias': 6490,
      '90_dias': 14990,
    },
    user_page: {
      // Perfil vendedor (gratis): solo se usa para selección de duración, no para cobro.
      '7_dias': 0,
      '15_dias': 0,
      '30_dias': 0,
      'indefinido': 0,
    },
  },
} as const;

export type BoostSlotKey = keyof typeof PRICING.boosts;

export function getBoostPrice(slot: BoostSlotKey, duration: BoostDuration): number {
  const slotPricing = (PRICING.boosts as any)[slot] as Record<string, number> | undefined;
  const price = slotPricing?.[duration];
  if (typeof price !== 'number') {
    throw new Error(`Precio no configurado para slot=${slot} duration=${duration}`);
  }
  return price;
}
