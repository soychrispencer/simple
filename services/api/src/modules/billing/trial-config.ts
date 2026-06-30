export const BILLING_TRIAL_DAYS = 30;

export function defaultTrialEndsAt(from = new Date()): Date {
    const trialEndsAt = new Date(from);
    trialEndsAt.setDate(trialEndsAt.getDate() + BILLING_TRIAL_DAYS);
    return trialEndsAt;
}

/** Fechas de prueba irreales (p. ej. seeds en 2099) → ventana canónica de 30 días. */
const FAR_FUTURE_TRIAL_YEAR = 2035;

export function normalizeTrialEndsAtForDisplay(
    trialEndsAt: Date,
    anchorDate: Date = new Date(),
): Date {
    if (Number.isNaN(trialEndsAt.getTime()) || trialEndsAt.getFullYear() >= FAR_FUTURE_TRIAL_YEAR) {
        return defaultTrialEndsAt(anchorDate);
    }
    return trialEndsAt;
}
