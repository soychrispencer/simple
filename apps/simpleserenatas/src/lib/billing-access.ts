import type { PanelBillingAccess } from '@simple/ui/panel';
import {
    clampTrialDaysRemaining,
    panelBillingDaysRemaining,
    PANEL_BILLING_TRIAL_DAYS,
    resolvePanelBillingFromCatalog,
} from '@simple/ui/panel';
import type { SubscriptionCatalogResponse } from '@simple/utils';
import type { SerenataMePlan } from '@/lib/serenatas-api';

const SERENATAS_SUBSCRIPTION_HREF = '/panel/mi-cuenta?account_tab=subscription';

export function resolveSerenatasBillingAccessFromCatalog(
    catalog: SubscriptionCatalogResponse | null,
): PanelBillingAccess {
    return resolvePanelBillingFromCatalog(catalog, SERENATAS_SUBSCRIPTION_HREF);
}

export function resolveSerenatasBillingAccess(plan: SerenataMePlan): PanelBillingAccess {
    const hasPaidPlan = plan.plan === 'pro' || plan.profileVisibilityStatus === 'active';

    if (hasPaidPlan) {
        return { status: 'pro', daysRemaining: null, subscriptionHref: SERENATAS_SUBSCRIPTION_HREF };
    }

    if (plan.subscriptionRequired) {
        return { status: 'expired', daysRemaining: 0, subscriptionHref: SERENATAS_SUBSCRIPTION_HREF };
    }

    if (plan.trialActive) {
        const maxDays = plan.trialDays || PANEL_BILLING_TRIAL_DAYS;
        const rawDays = plan.trialEndsAt ? panelBillingDaysRemaining(plan.trialEndsAt) : null;
        const daysRemaining = rawDays === null ? maxDays : clampTrialDaysRemaining(rawDays, maxDays);
        return { status: 'trial', daysRemaining, subscriptionHref: SERENATAS_SUBSCRIPTION_HREF };
    }

    return { status: 'free', daysRemaining: null, subscriptionHref: SERENATAS_SUBSCRIPTION_HREF };
}
