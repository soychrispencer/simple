'use client';

import { useEffect, useState } from 'react';
import type { BusinessSetupStep, PanelBillingAccess } from './business-setup.js';

export type PanelBusinessSetupStatus = {
    steps: BusinessSetupStep[];
    billing: PanelBillingAccess;
};

export function usePanelBusinessSetup(
    fetchStatus: () => Promise<PanelBusinessSetupStatus>,
    enabled = true,
) {
    const [steps, setSteps] = useState<BusinessSetupStep[]>([]);
    const [billing, setBilling] = useState<PanelBillingAccess | null>(null);
    const [loading, setLoading] = useState(enabled);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        void fetchStatus()
            .then((status) => {
                if (cancelled) return;
                setSteps(status.steps);
                setBilling(status.billing);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [enabled]);

    return { steps, billing, loading };
}
