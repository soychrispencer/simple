'use client';

import { useCallback } from 'react';
import { PanelNotice, SubscriptionManager } from '@simple/ui/panel';
import {
    confirmCheckout,
    fetchSubscriptionCatalog,
    startSubscriptionCheckout,
    type SubscriptionPlanId,
} from '@/lib/payments';
import { serenatasApi } from '@/lib/serenatas-api';

export function SubscriptionSection({ billingProfileType }: { billingProfileType: 'provider' | 'musician' }) {
    const profileLabel = billingProfileType === 'provider' ? 'proveedor' : 'músico';
    const fetchCompanyBillingContext = useCallback(async () => {
        if (billingProfileType !== 'provider') return null;
        const response = await serenatasApi.myProviderGroups();
        if (!response.ok) return null;
        const group = response.items[0];
        if (!group) return null;
        return { isCompany: group.accountKind === 'company' };
    }, [billingProfileType]);

    return (
        <div className="space-y-4">
            <PanelNotice tone="neutral">
                Este plan pertenece a tu perfil de {profileLabel}. Si también tienes perfil de músico y de proveedor, cada uno tiene su propio plan.
            </PanelNotice>
            <SubscriptionManager
                fetchSubscriptionCatalog={() => fetchSubscriptionCatalog(billingProfileType)}
                confirmCheckout={confirmCheckout}
                startSubscriptionCheckout={(input) =>
                    startSubscriptionCheckout({
                        returnUrl: input.returnUrl,
                        planId: input.planId as Extract<SubscriptionPlanId, 'pro'>,
                        billingProfileType,
                    })
                }
                cancelSubscription={async () => {
                    const response = await serenatasApi.cancelProSubscription(billingProfileType);
                    return {
                        ok: response.ok,
                        error: response.error,
                        message: response.message,
                    };
                }}
                subscriptionsPath="/panel/mi-cuenta?account_tab=subscription"
                fetchCompanyBillingContext={fetchCompanyBillingContext}
                launchVertical="serenatas"
            />
        </div>
    );
}
