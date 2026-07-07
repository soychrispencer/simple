'use client';

import { useCallback } from 'react';
import { SubscriptionManager } from '@simple/ui/panel';
import {
    confirmCheckout,
    fetchSubscriptionCatalog,
    startSubscriptionCheckout,
    type SubscriptionPlanId,
} from '@/lib/payments';
import { serenatasApi } from '@/lib/serenatas-api';

export function SubscriptionSection() {
    const fetchCompanyBillingContext = useCallback(async () => {
        const response = await serenatasApi.myProviderGroups();
        if (!response.ok) return null;
        const group = response.items[0];
        if (!group) return null;
        return { isCompany: group.accountKind === 'company' };
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
            subscriptionsPath="/panel/mi-cuenta?account_tab=subscription"
            fetchCompanyBillingContext={fetchCompanyBillingContext}
            launchVertical="serenatas"
        />
    );
}
