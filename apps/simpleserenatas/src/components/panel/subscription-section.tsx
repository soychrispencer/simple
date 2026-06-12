'use client';

import { SubscriptionManager } from '@simple/ui/panel';
import {
    confirmCheckout,
    fetchSubscriptionCatalog,
    startSubscriptionCheckout,
    type SubscriptionPlanId,
} from '@/lib/payments';

export function SubscriptionSection() {
    return (
        <SubscriptionManager
            fetchSubscriptionCatalog={fetchSubscriptionCatalog}
            confirmCheckout={confirmCheckout}
            startSubscriptionCheckout={(input) =>
                startSubscriptionCheckout({
                    returnUrl: input.returnUrl,
                    planId: input.planId as Extract<SubscriptionPlanId, 'essential' | 'pro'>,
                })
            }
            subscriptionsPath="/panel/mi-cuenta?account_tab=subscription"
        />
    );
}
