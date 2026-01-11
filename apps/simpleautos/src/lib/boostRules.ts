import type { BoostSlotKey } from '@/lib/pricing';

// Regla principal: no limitamos por cantidad; limitamos por tiempo.
// Cooldown: tiempo mínimo entre impulsos *por publicación y slot*.
export const BOOST_COOLDOWN_HOURS_BY_SLOT: Record<BoostSlotKey, number> = {
  home_main: 24,
  venta_tab: 24,
  arriendo_tab: 24,
  subasta_tab: 24,
  user_page: 24,
};

export function getBoostCooldownHours(slotKey: BoostSlotKey): number {
  return BOOST_COOLDOWN_HOURS_BY_SLOT[slotKey] ?? 24;
}
