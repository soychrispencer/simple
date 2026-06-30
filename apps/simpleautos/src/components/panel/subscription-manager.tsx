'use client';

import { SubscriptionManager } from '@simple/ui/panel';
import {
    confirmCheckout,
    fetchSubscriptionCatalog,
    startSubscriptionCheckout,
    type SubscriptionPlanId,
} from '@/lib/payments';

export default function AppSubscriptionManager() {
    return (
        <SubscriptionManager
            marketplaceMode
            marketplaceVertical="autos"
            fetchSubscriptionCatalog={fetchSubscriptionCatalog}
            confirmCheckout={confirmCheckout}
            startSubscriptionCheckout={(input) =>
                startSubscriptionCheckout({
                    returnUrl: input.returnUrl,
                    planId: input.planId as Extract<SubscriptionPlanId, 'pro' | 'enterprise'>,
                })
            }
        />
    );
}
