'use client';

import { useCallback } from 'react';
import { SubscriptionManager } from '@simple/ui/panel';
import {
    cancelSubscription,
    confirmCheckout,
    fetchSubscriptionCatalog,
    startSubscriptionCheckout,
    type SubscriptionPlanId,
} from '@/lib/payments';
import { fetchAgendaProfile } from '@/lib/agenda-api';
import { track } from '@/lib/analytics';

export default function AppSubscriptionManager() {
    const fetchCompanyBillingContext = useCallback(async () => {
        const profile = await fetchAgendaProfile();
        if (!profile) return null;
        return { isCompany: profile.accountKind === 'company' };
    }, []);

    return (
        <SubscriptionManager
            fetchSubscriptionCatalog={fetchSubscriptionCatalog}
            confirmCheckout={confirmCheckout}
            cancelSubscription={cancelSubscription}
            startSubscriptionCheckout={(input) => {
                track('subscription_checkout_started', { plan: input.planId, billing_cycle: input.billingCycle });
                return startSubscriptionCheckout({
                    returnUrl: input.returnUrl,
                    planId: input.planId as Extract<SubscriptionPlanId, 'pro' | 'pro_plus'>,
                    billingCycle: input.billingCycle,
                });
            }}
            subscriptionsPath="/panel/mi-negocio/plan"
            fetchCompanyBillingContext={fetchCompanyBillingContext}
            launchVertical="agenda"
        />
    );
}
