export const BILLING_TRIAL_DAYS = 30;

export function defaultTrialEndsAt(from = new Date()): Date {
    const trialEndsAt = new Date(from);
    trialEndsAt.setDate(trialEndsAt.getDate() + BILLING_TRIAL_DAYS);
    return trialEndsAt;
}
