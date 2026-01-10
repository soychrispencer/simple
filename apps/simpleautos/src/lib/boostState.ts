export interface BoostSlotState {
  is_active?: boolean | null;
  ends_at?: string | null;
}

export function hasActiveBoost(slots?: BoostSlotState[] | null): boolean {
  if (!Array.isArray(slots) || slots.length === 0) {
    return false;
  }

  const now = Date.now();
  return slots.some((slot) => {
    if (!slot?.is_active) return false;
    if (!slot.ends_at) return true;
    return new Date(slot.ends_at).getTime() >= now;
  });
}
