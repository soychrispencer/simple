/** Orígenes explícitos de demanda generada por la plataforma (comisión 8 % + IVA aparte) */
export const SERENATA_SOURCES_PLATFORM_COMMISSION = ['platform_lead', 'platform_assigned'] as const;

/** Serenatas cargadas por el coordinador — sin comisión */
export const SERENATA_SOURCES_SELF_FREE = ['self_captured'] as const;

export const PLATFORM_COMMISSION_RATE = 0.08;

/** IVA sobre la parte comisión (referencia Chile); se suma, no incluido en el 8 % */
export const PLATFORM_COMMISSION_VAT_RATE = 0.19;

/** Trial coordinador: meses gratis promoción */
export const COORDINATOR_TRIAL_MONTHS = 3;

export function isPlatformCommissionSource(source: string | null | undefined): boolean {
  const s = source || '';
  return s === 'platform_lead' || s === 'platform_assigned';
}

/** Coordinador con funciones de negocio: suscripción activa, plan distinto de free vigente y periodo no vencido */
export function isCoordinatorSubscriptionActive(profile: {
  subscriptionStatus?: string | null;
  subscriptionEndsAt?: Date | null;
  subscriptionPlan?: string | null;
}): boolean {
  if (!profile.subscriptionStatus || profile.subscriptionStatus !== 'active') return false;
  if (profile.subscriptionEndsAt && new Date(profile.subscriptionEndsAt).getTime() < Date.now()) return false;
  const plan = profile.subscriptionPlan || 'free';
  if (plan === 'free') return false;
  return true;
}

export function computeSerenataPlatformFees(amountClp: number, source: string | null | undefined) {
  if (!isPlatformCommissionSource(source)) {
    return {
      platformCommission: 0,
      commissionVat: 0,
      coordinatorEarnings: amountClp,
    };
  }
  const net = Math.round(amountClp * PLATFORM_COMMISSION_RATE);
  const vat = Math.round(net * PLATFORM_COMMISSION_VAT_RATE);
  const coordinatorEarnings = Math.max(0, amountClp - net - vat);
  return { platformCommission: net, commissionVat: vat, coordinatorEarnings };
}
