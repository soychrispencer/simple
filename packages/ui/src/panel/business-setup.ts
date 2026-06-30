export type BusinessSetupStep = {
    id: string;
    label: string;
    description?: string;
    href: string;
    complete: boolean;
};

export type PanelBillingStatus = 'pro' | 'trial' | 'free' | 'expired';

export type PanelBillingAccess = {
    status: PanelBillingStatus;
    daysRemaining: number | null;
    subscriptionHref: string;
};

export const PANEL_BILLING_TRIAL_DAYS = 30;

function parseDate(value: string | number | Date | null | undefined): Date | null {
    if (value == null) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function panelBillingDaysRemaining(expiresAt: string | number | Date | null | undefined): number | null {
    const date = parseDate(expiresAt);
    if (!date) return null;
    return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
}

export function clampTrialDaysRemaining(
    daysRemaining: number,
    maxTrialDays: number = PANEL_BILLING_TRIAL_DAYS,
): number {
    return Math.max(0, Math.min(daysRemaining, maxTrialDays));
}

export function resolvePanelBillingAccess(input: {
    planId: string;
    planExpiresAt?: string | number | Date | null;
    trialEndsAt?: string | number | Date | null;
    subscriptionHref: string;
}): PanelBillingAccess {
    const plan = input.planId;
    const subscriptionHref = input.subscriptionHref;

    if (plan === 'pro' || plan === 'enterprise') {
        const expiresAt = parseDate(input.planExpiresAt);
        if (expiresAt && expiresAt.getTime() < Date.now()) {
            return { status: 'expired', daysRemaining: 0, subscriptionHref };
        }
        return { status: 'pro', daysRemaining: null, subscriptionHref };
    }

    const trialDate = parseDate(input.trialEndsAt) ?? parseDate(input.planExpiresAt);
    if (trialDate) {
        const rawDays = panelBillingDaysRemaining(trialDate);
        if (rawDays !== null && rawDays > 0) {
            return {
                status: 'trial',
                daysRemaining: clampTrialDaysRemaining(rawDays),
                subscriptionHref,
            };
        }
        return { status: 'expired', daysRemaining: 0, subscriptionHref };
    }

    return { status: 'free', daysRemaining: null, subscriptionHref };
}

export function resolvePanelBillingFromCatalog(
    catalog: {
        currentSubscription: {
            planId: string;
            status: string;
            planExpiresAt: number | null;
            providerStatus?: string | null;
        } | null;
    } | null,
    subscriptionHref: string,
): PanelBillingAccess {
    const sub = catalog?.currentSubscription;
    if (!sub) {
        return { status: 'free', daysRemaining: null, subscriptionHref };
    }

    if (sub.providerStatus === 'trial' && sub.planId === 'free') {
        return resolvePanelBillingAccess({
            planId: 'free',
            planExpiresAt: sub.planExpiresAt,
            subscriptionHref,
        });
    }

    return resolvePanelBillingAccess({
        planId: sub.planId,
        planExpiresAt: sub.planExpiresAt,
        subscriptionHref,
    });
}

export function businessSetupProgress(steps: BusinessSetupStep[]): { completed: number; total: number; percent: number } {
    const total = steps.length;
    const completed = steps.filter((step) => step.complete).length;
    const percent = total === 0 ? 100 : Math.round((completed / total) * 100);
    return { completed, total, percent };
}

export function isBusinessSetupComplete(steps: BusinessSetupStep[]): boolean {
    return steps.length > 0 && steps.every((step) => step.complete);
}

export function nextBusinessSetupStep(steps: BusinessSetupStep[]): BusinessSetupStep | null {
    return steps.find((step) => !step.complete) ?? null;
}

export function billingAccessBadgeLabel(billing: PanelBillingAccess): string | null {
    if (billing.status === 'pro') return 'Plan Pro';
    if (billing.status === 'trial' && billing.daysRemaining !== null) {
        const days = billing.daysRemaining;
        return days === 0 ? 'Prueba · termina hoy' : `Prueba · ${days} ${days === 1 ? 'día' : 'días'}`;
    }
    return null;
}

export function businessSetupSubtitle(billing: PanelBillingAccess): string {
    if (billing.status === 'trial' && billing.daysRemaining !== null) {
        if (billing.daysRemaining === 0) {
            return 'Tu prueba termina hoy. Completa tu negocio y activa Pro para seguir sin interrupciones.';
        }
        return 'Tienes acceso completo durante la prueba. Completa estos pasos para empezar a recibir contactos.';
    }
    if (billing.status === 'pro') {
        return 'Completa tu perfil para que tus clientes te encuentren y operes con tu marca.';
    }
    return 'Completa estos pasos para publicar tu negocio y empezar a recibir contactos.';
}
