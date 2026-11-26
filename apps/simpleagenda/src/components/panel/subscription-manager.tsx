'use client';

import { useCallback } from 'react';
import { SubscriptionManager } from '@simple/ui/panel';
import {
    cancelSubscription,
    activateAgendaTrial,
    confirmCheckout,
    fetchAgendaTrialStatus,
    fetchSubscriptionCatalog,
    startSubscriptionCheckout,
    type SubscriptionPlanId,
} from '@/lib/payments';
import { fetchAgendaProfile } from '@/lib/agenda-api';
import { fetchCurrentAccountContext } from '@simple/utils';
import { track } from '@/lib/analytics';

export default function AppSubscriptionManager() {
    const fetchCompanyBillingContext = useCallback(async () => {
        const [profile, accountContext] = await Promise.all([
            fetchAgendaProfile(),
            fetchCurrentAccountContext(),
        ]);
        if (accountContext?.account?.isPersonal === false) return { isCompany: true };
        if (!profile && !accountContext) return null;
        return { isCompany: profile?.accountKind === 'company' };
    }, []);

    return (
        <SubscriptionManager
            fetchSubscriptionCatalog={fetchSubscriptionCatalog}
            confirmCheckout={confirmCheckout}
            cancelSubscription={cancelSubscription}
            fetchAgendaTrialStatus={fetchAgendaTrialStatus}
            activateAgendaTrial={activateAgendaTrial}
            startSubscriptionCheckout={(input) => {
                track('subscription_checkout_started', { plan: input.planId, billing_cycle: input.billingCycle });
                return startSubscriptionCheckout({
                    returnUrl: input.returnUrl,
                    planId: input.planId as Extract<SubscriptionPlanId, 'pro' | 'pro_plus' | 'enterprise'>,
                    billingCycle: input.billingCycle,
                });
            }}
            subscriptionsPath="/panel/mi-negocio/plan"
            fetchCompanyBillingContext={fetchCompanyBillingContext}
            launchVertical="agenda"
        />
    );
}
