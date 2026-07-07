'use client';

import { useCallback } from 'react';
import { SubscriptionManager } from '@simple/ui/panel';
import {
    confirmCheckout,
    fetchSubscriptionCatalog,
    startSubscriptionCheckout,
    type SubscriptionPlanId,
} from '@/lib/payments';
import { fetchAgendaProfile } from '@/lib/agenda-api';

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
            startSubscriptionCheckout={(input) =>
                startSubscriptionCheckout({
                    returnUrl: input.returnUrl,
                    planId: input.planId as Extract<SubscriptionPlanId, 'pro'>,
                })
            }
            subscriptionsPath="/panel/mi-cuenta/suscripcion"
            fetchCompanyBillingContext={fetchCompanyBillingContext}
            launchVertical="agenda"
        />
    );
}
